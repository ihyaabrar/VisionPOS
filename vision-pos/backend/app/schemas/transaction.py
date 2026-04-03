from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AddItemRequest(BaseModel):
    item_id: str
    quantity: int = 1


class CompleteTransactionRequest(BaseModel):
    payment_method: str  # 'cash' atau 'transfer'
    payment_received: float


class CancelTransactionRequest(BaseModel):
    reason: str = ""


class CartItemOut(BaseModel):
    item_id: str
    item_name: str
    unit_price: float
    quantity: int
    subtotal: float

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    id: str
    session_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_amount: Optional[float] = None
    items: list[CartItemOut]

    class Config:
        from_attributes = True


class ReceiptOut(BaseModel):
    transaction_id: str
    started_at: datetime
    completed_at: datetime
    items: list[CartItemOut]
    total: float
    payment_method: str
    payment_received: float
    change_amount: float
