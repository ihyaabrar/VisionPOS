from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.item import Item, PriceAuditLog
from app.models.transaction import TransactionItem
from app.schemas.item import ItemCreate, ItemUpdate


def get_all_items(db: Session) -> list[Item]:
    """Return all active items (is_active=1)."""
    return db.query(Item).filter(Item.is_active == 1).all()


def search_items(db: Session, query: str) -> list[Item]:
    """LIKE search on name and id, only active items."""
    pattern = f"%{query}%"
    return (
        db.query(Item)
        .filter(
            Item.is_active == 1,
            (Item.name.ilike(pattern)) | (Item.id.ilike(pattern)),
        )
        .all()
    )


def get_item(db: Session, item_id: str) -> Item | None:
    """Return a single item by ID (active or not)."""
    return db.query(Item).filter(Item.id == item_id).first()


def create_item(db: Session, data: ItemCreate, user_id: int) -> Item:
    """Create a new item. Raises 409 if ID already exists."""
    existing = db.query(Item).filter(Item.id == data.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Barang dengan ID '{data.id}' sudah ada",
        )

    item = Item(
        id=data.id,
        name=data.name,
        price=data.price,
        stock=data.stock,
        min_stock=data.min_stock,
        class_id=data.class_id,
        is_active=1,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item_id: str, data: ItemUpdate, user_id: int) -> Item:
    """Update item. Records price_audit_log if price changed."""
    item = db.query(Item).filter(Item.id == item_id, Item.is_active == 1).first()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Barang dengan ID '{item_id}' tidak ditemukan",
        )

    # Record audit log if price changed
    if item.price != data.price:
        audit = PriceAuditLog(
            item_id=item_id,
            old_price=item.price,
            new_price=data.price,
            changed_by=user_id,
            changed_at=datetime.utcnow(),
        )
        db.add(audit)

    item.name = data.name
    item.price = data.price
    item.stock = data.stock
    item.min_stock = data.min_stock
    item.class_id = data.class_id
    item.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: str) -> None:
    """Soft delete if item has transaction history, hard delete otherwise."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Barang dengan ID '{item_id}' tidak ditemukan",
        )

    has_history = (
        db.query(TransactionItem).filter(TransactionItem.item_id == item_id).first()
        is not None
    )

    if has_history:
        # Soft delete
        item.is_active = 0
        item.updated_at = datetime.utcnow()
        db.commit()
    else:
        # Hard delete
        db.delete(item)
        db.commit()


def export_csv(db: Session) -> str:
    """Return CSV string of all active items."""
    items = get_all_items(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "price", "stock", "min_stock", "class_id", "is_active"])
    for item in items:
        writer.writerow([
            item.id,
            item.name,
            item.price,
            item.stock,
            item.min_stock,
            item.class_id if item.class_id is not None else "",
            item.is_active,
        ])
    return output.getvalue()
