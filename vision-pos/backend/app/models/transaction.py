from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active','completed','cancelled')",
            name="ck_transactions_status",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_received: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    change_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="transactions")
    items: Mapped[list["TransactionItem"]] = relationship(
        "TransactionItem", back_populates="transaction", cascade="all, delete-orphan"
    )


class TransactionItem(Base):
    __tablename__ = "transaction_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_transaction_items_quantity"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transaction_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("transactions.id"), nullable=False
    )
    item_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("items.id"), nullable=False
    )
    item_name: Mapped[str] = mapped_column(Text, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    transaction: Mapped["Transaction"] = relationship(
        "Transaction", back_populates="items"
    )
    item: Mapped["Item"] = relationship("Item", back_populates="transaction_items")
