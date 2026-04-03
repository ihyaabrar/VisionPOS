"""Unit tests for inventory_service: CRUD, soft delete, CSV export."""
from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.database import Base
from app.models.item import Item, PriceAuditLog
from app.models.transaction import Transaction, TransactionItem
from app.models.user import User
from app.schemas.item import ItemCreate, ItemUpdate
from app.services import inventory_service


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def db():
    """In-memory SQLite session for each test."""
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
def admin_user(db):
    user = User(
        username="admin01",
        password_hash=hash_password("admin123"),
        role="admin",
        is_active=1,
        failed_attempts=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def sample_item(db):
    item = Item(
        id="SKU-001",
        name="Indomie Goreng",
        price=3500.0,
        stock=100,
        min_stock=10,
        is_active=1,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# ---------------------------------------------------------------------------
# Test: Create Item
# ---------------------------------------------------------------------------

class TestCreateItem:
    def test_create_item_success(self, db, admin_user):
        data = ItemCreate(id="SKU-NEW", name="Aqua 600ml", price=3000.0, stock=50, min_stock=5)
        item = inventory_service.create_item(db, data, admin_user.id)
        assert item.id == "SKU-NEW"
        assert item.name == "Aqua 600ml"
        assert item.price == 3000.0
        assert item.stock == 50
        assert item.is_active == 1

    def test_create_item_persisted_in_db(self, db, admin_user):
        data = ItemCreate(id="SKU-002", name="Teh Botol", price=4000.0, stock=30, min_stock=5)
        inventory_service.create_item(db, data, admin_user.id)
        found = db.query(Item).filter(Item.id == "SKU-002").first()
        assert found is not None
        assert found.name == "Teh Botol"

    def test_create_item_duplicate_id_raises_409(self, db, admin_user, sample_item):
        data = ItemCreate(id="SKU-001", name="Duplikat", price=1000.0, stock=10, min_stock=5)
        with pytest.raises(HTTPException) as exc_info:
            inventory_service.create_item(db, data, admin_user.id)
        assert exc_info.value.status_code == 409

    def test_create_item_duplicate_id_error_message(self, db, admin_user, sample_item):
        data = ItemCreate(id="SKU-001", name="Duplikat", price=1000.0, stock=10, min_stock=5)
        with pytest.raises(HTTPException) as exc_info:
            inventory_service.create_item(db, data, admin_user.id)
        assert "SKU-001" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Test: Soft Delete
# ---------------------------------------------------------------------------

class TestDeleteItem:
    def test_hard_delete_item_without_history(self, db, admin_user, sample_item):
        inventory_service.delete_item(db, "SKU-001")
        found = db.query(Item).filter(Item.id == "SKU-001").first()
        assert found is None

    def test_soft_delete_item_with_transaction_history(self, db, admin_user, sample_item):
        # Create a minimal transaction_item referencing SKU-001
        tx_item = TransactionItem(
            transaction_id="TX-FAKE-001",
            item_id="SKU-001",
            item_name="Indomie Goreng",
            unit_price=3500.0,
            quantity=2,
            subtotal=7000.0,
        )
        db.add(tx_item)
        db.commit()

        inventory_service.delete_item(db, "SKU-001")

        found = db.query(Item).filter(Item.id == "SKU-001").first()
        assert found is not None
        assert found.is_active == 0

    def test_soft_delete_item_not_returned_in_list(self, db, admin_user, sample_item):
        tx_item = TransactionItem(
            transaction_id="TX-FAKE-002",
            item_id="SKU-001",
            item_name="Indomie Goreng",
            unit_price=3500.0,
            quantity=1,
            subtotal=3500.0,
        )
        db.add(tx_item)
        db.commit()

        inventory_service.delete_item(db, "SKU-001")
        items = inventory_service.get_all_items(db)
        ids = [i.id for i in items]
        assert "SKU-001" not in ids

    def test_delete_nonexistent_item_raises_404(self, db):
        with pytest.raises(HTTPException) as exc_info:
            inventory_service.delete_item(db, "TIDAK-ADA")
        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Test: CSV Export
# ---------------------------------------------------------------------------

class TestExportCSV:
    def test_export_csv_contains_header(self, db, sample_item):
        csv_str = inventory_service.export_csv(db)
        assert "id,name,price,stock,min_stock,class_id,is_active" in csv_str

    def test_export_csv_contains_item_data(self, db, sample_item):
        csv_str = inventory_service.export_csv(db)
        assert "SKU-001" in csv_str
        assert "Indomie Goreng" in csv_str

    def test_export_csv_correct_row_count(self, db, admin_user):
        for i in range(3):
            db.add(Item(id=f"SKU-{i:03d}", name=f"Item {i}", price=1000.0, stock=10, min_stock=5, is_active=1))
        db.commit()
        csv_str = inventory_service.export_csv(db)
        lines = [l for l in csv_str.strip().splitlines() if l]
        # 1 header + 3 data rows
        assert len(lines) == 4

    def test_export_csv_excludes_inactive_items(self, db, admin_user):
        db.add(Item(id="SKU-ACTIVE", name="Aktif", price=1000.0, stock=10, min_stock=5, is_active=1))
        db.add(Item(id="SKU-INACTIVE", name="Nonaktif", price=1000.0, stock=10, min_stock=5, is_active=0))
        db.commit()
        csv_str = inventory_service.export_csv(db)
        assert "SKU-ACTIVE" in csv_str
        assert "SKU-INACTIVE" not in csv_str


# ---------------------------------------------------------------------------
# Test: Update Item & Audit Log
# ---------------------------------------------------------------------------

class TestUpdateItem:
    def test_update_item_success(self, db, admin_user, sample_item):
        data = ItemUpdate(name="Indomie Goreng Spesial", price=4000.0, stock=80, min_stock=10)
        item = inventory_service.update_item(db, "SKU-001", data, admin_user.id)
        assert item.name == "Indomie Goreng Spesial"
        assert item.price == 4000.0

    def test_update_price_creates_audit_log(self, db, admin_user, sample_item):
        data = ItemUpdate(name="Indomie Goreng", price=4000.0, stock=100, min_stock=10)
        inventory_service.update_item(db, "SKU-001", data, admin_user.id)
        log = db.query(PriceAuditLog).filter(PriceAuditLog.item_id == "SKU-001").first()
        assert log is not None
        assert log.old_price == 3500.0
        assert log.new_price == 4000.0
        assert log.changed_by == admin_user.id

    def test_update_same_price_no_audit_log(self, db, admin_user, sample_item):
        data = ItemUpdate(name="Indomie Goreng Baru", price=3500.0, stock=100, min_stock=10)
        inventory_service.update_item(db, "SKU-001", data, admin_user.id)
        log = db.query(PriceAuditLog).filter(PriceAuditLog.item_id == "SKU-001").first()
        assert log is None

    def test_update_nonexistent_item_raises_404(self, db, admin_user):
        data = ItemUpdate(name="X", price=1000.0, stock=10, min_stock=5)
        with pytest.raises(HTTPException) as exc_info:
            inventory_service.update_item(db, "TIDAK-ADA", data, admin_user.id)
        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Test: Get / Search Items
# ---------------------------------------------------------------------------

class TestGetItems:
    def test_get_all_items_returns_active_only(self, db, sample_item):
        db.add(Item(id="SKU-INACTIVE", name="Nonaktif", price=1000.0, stock=5, min_stock=5, is_active=0))
        db.commit()
        items = inventory_service.get_all_items(db)
        ids = [i.id for i in items]
        assert "SKU-001" in ids
        assert "SKU-INACTIVE" not in ids

    def test_search_by_name(self, db, sample_item):
        results = inventory_service.search_items(db, "Indomie")
        assert any(i.id == "SKU-001" for i in results)

    def test_search_by_id(self, db, sample_item):
        results = inventory_service.search_items(db, "SKU-001")
        assert any(i.id == "SKU-001" for i in results)

    def test_search_no_match_returns_empty(self, db, sample_item):
        results = inventory_service.search_items(db, "TIDAKADA999")
        assert results == []

    def test_get_item_returns_none_for_missing(self, db):
        result = inventory_service.get_item(db, "TIDAK-ADA")
        assert result is None
