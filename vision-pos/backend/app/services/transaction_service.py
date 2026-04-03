from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.item import Item
from app.models.transaction import Transaction, TransactionItem


def create_transaction(db: Session, session_id: str) -> Transaction:
    """Buat transaksi baru dengan UUID, status='active'."""
    tx = Transaction(
        id=str(uuid.uuid4()),
        session_id=session_id,
        status="active",
        started_at=datetime.utcnow(),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def get_transaction(db: Session, tx_id: str) -> Transaction | None:
    """Ambil transaksi berdasarkan ID."""
    return db.query(Transaction).filter(Transaction.id == tx_id).first()


def _get_active_transaction(db: Session, tx_id: str) -> Transaction:
    """Helper: ambil transaksi aktif atau raise 404/409."""
    tx = get_transaction(db, tx_id)
    if tx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaksi '{tx_id}' tidak ditemukan",
        )
    if tx.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Transaksi sudah berstatus '{tx.status}'",
        )
    return tx


def add_item(db: Session, tx_id: str, item_id: str, qty: int) -> TransactionItem:
    """Tambah item ke keranjang. Jika sudah ada, tambah qty (deduplikasi)."""
    tx = _get_active_transaction(db, tx_id)

    item = db.query(Item).filter(Item.id == item_id, Item.is_active == 1).first()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Barang '{item_id}' tidak ditemukan",
        )

    # Cek apakah item sudah ada di keranjang (deduplikasi)
    existing = (
        db.query(TransactionItem)
        .filter(
            TransactionItem.transaction_id == tx_id,
            TransactionItem.item_id == item_id,
        )
        .first()
    )

    if existing:
        existing.quantity += qty
        existing.subtotal = existing.unit_price * existing.quantity
        db.commit()
        db.refresh(existing)
        return existing

    tx_item = TransactionItem(
        transaction_id=tx_id,
        item_id=item_id,
        item_name=item.name,
        unit_price=item.price,
        quantity=qty,
        subtotal=item.price * qty,
    )
    db.add(tx_item)
    db.commit()
    db.refresh(tx_item)
    return tx_item


def remove_item(db: Session, tx_id: str, item_id: str) -> None:
    """Hapus item dari keranjang."""
    _get_active_transaction(db, tx_id)

    tx_item = (
        db.query(TransactionItem)
        .filter(
            TransactionItem.transaction_id == tx_id,
            TransactionItem.item_id == item_id,
        )
        .first()
    )
    if tx_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_id}' tidak ada di keranjang",
        )
    db.delete(tx_item)
    db.commit()


def complete_transaction(
    db: Session,
    tx_id: str,
    payment_method: str,
    payment_received: float,
) -> dict:
    """Selesaikan transaksi secara atomik: potong stok, simpan total & kembalian."""
    tx = _get_active_transaction(db, tx_id)

    if not tx.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CART_EMPTY",
        )

    total = sum(i.subtotal for i in tx.items)

    if payment_received < total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INSUFFICIENT_PAYMENT",
        )

    # Potong stok secara atomik — validasi dulu semua item
    for tx_item in tx.items:
        item = db.query(Item).filter(Item.id == tx_item.item_id).first()
        if item is None or item.stock < tx_item.quantity:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="INSUFFICIENT_STOCK",
            )

    # Semua stok cukup, lakukan pemotongan
    for tx_item in tx.items:
        item = db.query(Item).filter(Item.id == tx_item.item_id).first()
        item.stock -= tx_item.quantity

    change = payment_received - total
    tx.status = "completed"
    tx.completed_at = datetime.utcnow()
    tx.total_amount = total
    tx.payment_method = payment_method
    tx.payment_received = payment_received
    tx.change_amount = change

    db.commit()
    db.refresh(tx)

    return {
        "transaction_id": tx.id,
        "total": total,
        "payment_method": payment_method,
        "payment_received": payment_received,
        "change_amount": change,
    }


def cancel_transaction(db: Session, tx_id: str, reason: str) -> None:
    """Batalkan transaksi."""
    tx = _get_active_transaction(db, tx_id)
    tx.status = "cancelled"
    tx.cancel_reason = reason
    db.commit()


def get_receipt(db: Session, tx_id: str) -> dict:
    """Kembalikan semua field struk wajib."""
    tx = get_transaction(db, tx_id)
    if tx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaksi '{tx_id}' tidak ditemukan",
        )
    if tx.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Struk hanya tersedia untuk transaksi yang sudah selesai",
        )

    items = [
        {
            "item_id": i.item_id,
            "item_name": i.item_name,
            "unit_price": i.unit_price,
            "quantity": i.quantity,
            "subtotal": i.subtotal,
        }
        for i in tx.items
    ]

    return {
        "transaction_id": tx.id,
        "started_at": tx.started_at,
        "completed_at": tx.completed_at,
        "items": items,
        "total": tx.total_amount,
        "payment_method": tx.payment_method,
        "payment_received": tx.payment_received,
        "change_amount": tx.change_amount,
    }
