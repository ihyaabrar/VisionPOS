from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, field_validator


class ItemBase(BaseModel):
    name: str
    price: float
    stock: int
    min_stock: int = 5
    class_id: Optional[int] = None

    @field_validator("price")
    @classmethod
    def price_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Harga tidak boleh negatif")
        return v

    @field_validator("stock")
    @classmethod
    def stock_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Stok tidak boleh negatif")
        return v


class ItemCreate(ItemBase):
    id: str


class ItemUpdate(ItemBase):
    pass


class ItemOut(ItemBase):
    id: str
    is_active: bool
    low_stock: bool = False

    model_config = {"from_attributes": True}


class ItemListOut(BaseModel):
    items: list[ItemOut]
    total: int
