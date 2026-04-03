"""Unit tests untuk transaction_service: keranjang, penyelesaian, struk."""
from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.database import Base
from app.models.item import Item
from app.models.transaction import Transaction, TransactionItem
from app.models.user import Session as UserSession, User
from app.services import transaction_service


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def db():
    """In-memory SQLite session untuk setiap test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture()
def kasir_user(db):
    user = User(
        username="kasir01",
        password_hash=hash_password("kasir123"),
        role="kasir",
        is_active=1,
        failed_attempts=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def user_session(db, kasir_user):
    from datetime import datetime
    sess = UserSession(
        id="sess-001",
        user_id=kasir_user.id,
        started_at=datetime.utcnow(),
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return sess


@pytest.fixture()
def active_tx(db, user_session):
    tx = transaction_service.create_transaction(db, user_session.id)
    return tx


@pytest.fixture()
def item_a(db):
    item = Item(id="SKU-A", name="Indomie Goreng", price=3500.0, stock=50, min_stock=5, is_active=1)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@pytest.fixture()
def item_b(db):
    item = Item(id="SKU-B", name="Aqua 600ml", price=4000.0, stock=20, min_stock=5, is_active=1)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# ---------------------------------------------------------------------------
# Test: Complete dengan keranjang kosong → HTTP 400 CART_EMPTY
# ---------------------------------------------------------------------------

class TestCompleteEmptyCart:
    def test_complete_empty_cart_raises_400(self, db, active_tx):
        with pytest.raises(HTTPException) as exc_info:
            transaction_service.complete_transaction(db, active_tx.id, "cash", 10000.0)
        assert exc_info.value.status_code == 400

    def test_complete_empty_cart_error_code(self, db, active_tx):
        with pytest.raises(HTTPException) as exc_info:
            transaction_service.complete_transaction(db, active_tx.id, "cash", 10000.0)
        assert "CART_EMPTY" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Test: Complete dengan pembayaran kurang → HTTP 400 INSUFFICIENT_PAYMENT
# ---------------------------------------------------------------------------

class TestCompleteInsufficientPayment:
    def test_insufficient_payment_raises_400(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 2)
        # total = 7000, bayar hanya 5000
        with pytest.raises(HTTPException) as exc_info:
            transaction_service.complete_transaction(db, active_tx.id, "cash", 5000.0)
        assert exc_info.value.status_code == 400

    def test_insufficient_payment_error_code(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 1)
        with pytest.raises(HTTPException) as exc_info:
            transaction_service.complete_transaction(db, active_tx.id, "cash", 1000.0)
        assert "INSUFFICIENT_PAYMENT" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Test: add_item yang sama dua kali → qty bertambah, bukan duplikat
# ---------------------------------------------------------------------------

class TestAddItemDeduplication:
    def test_add_same_item_twice_no_duplicate(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 1)
        transaction_service.add_item(db, active_tx.id, item_a.id, 1)

        items = db.query(TransactionItem).filter(
            TransactionItem.transaction_id == active_tx.id
        ).all()
        assert len(items) == 1

    def test_add_same_item_twice_qty_accumulated(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 2)
        transaction_service.add_item(db, active_tx.id, item_a.id, 3)

        item = db.query(TransactionItem).filter(
            TransactionItem.transaction_id == active_tx.id,
            TransactionItem.item_id == item_a.id,
        ).first()
        assert item.quantity == 5

    def test_add_same_item_twice_subtotal_correct(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 2)
        transaction_service.add_item(db, active_tx.id, item_a.id, 1)

        item = db.query(TransactionItem).filter(
            TransactionItem.transaction_id == active_tx.id,
            TransactionItem.item_id == item_a.id,
        ).first()
        assert item.subtotal == item_a.price * 3


# ---------------------------------------------------------------------------
# Test: Complete berhasil → stok terpotong atomik
# ---------------------------------------------------------------------------

class TestCompleteSuccess:
    def test_complete_success_status_changed(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 2)
        transaction_service.complete_transaction(db, active_tx.id, "cash", 10000.0)

        tx = db.query(Transaction).filter(Transaction.id == active_tx.id).first()
        assert tx.status == "completed"

    def test_complete_success_stock_deducted(self, db, active_tx, item_a):
        initial_stock = item_a.stock
        transaction_service.add_item(db, active_tx.id, item_a.id, 3)
        transaction_service.complete_transaction(db, active_tx.id, "cash", 20000.0)

        db.refresh(item_a)
        assert item_a.stock == initial_stock - 3

    def test_complete_success_change_correct(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 2)  # total 7000
        result = transaction_service.complete_transaction(db, active_tx.id, "cash", 10000.0)
        assert result["change_amount"] == 3000.0

    def test_complete_success_total_saved(self, db, active_tx, item_a, item_b):
        transaction_service.add_item(db, active_tx.id, item_a.id, 1)  # 3500
        transaction_service.add_item(db, active_tx.id, item_b.id, 2)  # 8000
        result = transaction_service.complete_transaction(db, active_tx.id, "transfer", 15000.0)
        assert result["total"] == 11500.0

    def test_complete_insufficient_stock_rollback(self, db, active_tx, item_a):
        """Stok tidak cukup → rollback, status tetap active."""
        transaction_service.add_item(db, active_tx.id, item_a.id, 999)  # stok hanya 50
        with pytest.raises(HTTPException) as exc_info:
            transaction_service.complete_transaction(db, active_tx.id, "cash", 9999999.0)
        assert exc_info.value.status_code == 409
        assert "INSUFFICIENT_STOCK" in exc_info.value.detail

        # Status transaksi harus tetap active (tidak berubah)
        tx = db.query(Transaction).filter(Transaction.id == active_tx.id).first()
        assert tx.status == "active"

    def test_complete_already_completed_raises_409(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 1)
        transaction_service.complete_transaction(db, active_tx.id, "cash", 5000.0)

        with pytest.raises(HTTPException) as exc_info:
            transaction_service.complete_transaction(db, active_tx.id, "cash", 5000.0)
        assert exc_info.value.status_code == 409


# ---------------------------------------------------------------------------
# Test: Cancel transaksi → status berubah ke 'cancelled'
# ---------------------------------------------------------------------------

class TestCancelTransaction:
    def test_cancel_changes_status(self, db, active_tx):
        transaction_service.cancel_transaction(db, active_tx.id, "Pelanggan batal")

        tx = db.query(Transaction).filter(Transaction.id == active_tx.id).first()
        assert tx.status == "cancelled"

    def test_cancel_saves_reason(self, db, active_tx):
        transaction_service.cancel_transaction(db, active_tx.id, "Barang habis")

        tx = db.query(Transaction).filter(Transaction.id == active_tx.id).first()
        assert tx.cancel_reason == "Barang habis"

    def test_cancel_already_cancelled_raises_409(self, db, active_tx):
        transaction_service.cancel_transaction(db, active_tx.id, "Pertama")
        with pytest.raises(HTTPException) as exc_info:
            transaction_service.cancel_transaction(db, active_tx.id, "Kedua")
        assert exc_info.value.status_code == 409


# ---------------------------------------------------------------------------
# Test: get_receipt → semua field wajib ada
# ---------------------------------------------------------------------------

class TestGetReceipt:
    def test_receipt_has_all_required_fields(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 2)
        transaction_service.complete_transaction(db, active_tx.id, "cash", 10000.0)

        receipt = transaction_service.get_receipt(db, active_tx.id)

        assert "transaction_id" in receipt
        assert "started_at" in receipt
        assert "completed_at" in receipt
        assert "items" in receipt
        assert "total" in receipt
        assert "payment_method" in receipt
        assert "payment_received" in receipt
        assert "change_amount" in receipt

    def test_receipt_items_correct(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 2)
        transaction_service.complete_transaction(db, active_tx.id, "cash", 10000.0)

        receipt = transaction_service.get_receipt(db, active_tx.id)
        assert len(receipt["items"]) == 1
        assert receipt["items"][0]["item_id"] == item_a.id
        assert receipt["items"][0]["quantity"] == 2

    def test_receipt_total_correct(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 2)  # 7000
        transaction_service.complete_transaction(db, active_tx.id, "cash", 10000.0)

        receipt = transaction_service.get_receipt(db, active_tx.id)
        assert receipt["total"] == 7000.0
        assert receipt["change_amount"] == 3000.0

    def test_receipt_not_available_for_active_tx(self, db, active_tx, item_a):
        transaction_service.add_item(db, active_tx.id, item_a.id, 1)
        with pytest.raises(HTTPException) as exc_info:
            transaction_service.get_receipt(db, active_tx.id)
        assert exc_info.value.status_code == 409

    def test_receipt_not_found_raises_404(self, db):
        with pytest.raises(HTTPException) as exc_info:
            transaction_service.get_receipt(db, "tx-tidak-ada")
        assert exc_info.value.status_code == 404
