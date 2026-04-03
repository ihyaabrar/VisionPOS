from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_items_price"),
        CheckConstraint("stock >= 0", name="ck_items_stock"),
    )

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    class_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    price_audit_logs: Mapped[list["PriceAuditLog"]] = relationship(
        "PriceAuditLog", back_populates="item"
    )
    transaction_items: Mapped[list["TransactionItem"]] = relationship(
        "TransactionItem", back_populates="item"
    )


class PriceAuditLog(Base):
    __tablename__ = "price_audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("items.id"), nullable=False
    )
    old_price: Mapped[float] = mapped_column(Float, nullable=False)
    new_price: Mapped[float] = mapped_column(Float, nullable=False)
    changed_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # Relationships
    item: Mapped["Item"] = relationship("Item", back_populates="price_audit_logs")
    changed_by_user: Mapped["User"] = relationship(
        "User", back_populates="price_audit_logs"
    )
