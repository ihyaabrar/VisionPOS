from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.item import ItemCreate, ItemListOut, ItemOut, ItemUpdate
from app.services import inventory_service

router = APIRouter()


def _to_item_out(item) -> ItemOut:
    """Convert ORM Item to ItemOut, computing low_stock flag."""
    return ItemOut(
        id=item.id,
        name=item.name,
        price=item.price,
        stock=item.stock,
        min_stock=item.min_stock,
        class_id=item.class_id,
        is_active=bool(item.is_active),
        low_stock=item.stock <= item.min_stock,
    )


@router.get("/items", response_model=ItemListOut)
def list_items(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all active items with low_stock flag."""
    items = inventory_service.get_all_items(db)
    return ItemListOut(
        items=[_to_item_out(i) for i in items],
        total=len(items),
    )


@router.get("/items/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Export active inventory as CSV file."""
    csv_content = inventory_service.export_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventaris.csv"},
    )


@router.get("/items/search", response_model=ItemListOut)
def search_items(
    q: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Search items by name or ID (LIKE search)."""
    items = inventory_service.search_items(db, q)
    return ItemListOut(
        items=[_to_item_out(i) for i in items],
        total=len(items),
    )


@router.get("/items/{item_id}", response_model=ItemOut)
def get_item(
    item_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Get detail of a single item."""
    from fastapi import HTTPException, status

    item = inventory_service.get_item(db, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Barang dengan ID '{item_id}' tidak ditemukan",
        )
    return _to_item_out(item)


@router.post("/items", response_model=ItemOut, status_code=201)
def create_item(
    data: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new item (Admin only)."""
    item = inventory_service.create_item(db, data, current_user.id)
    return _to_item_out(item)


@router.put("/items/{item_id}", response_model=ItemOut)
def update_item(
    item_id: str,
    data: ItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update an item. Records audit log if price changes (Admin only)."""
    item = inventory_service.update_item(db, item_id, data, current_user.id)
    return _to_item_out(item)


@router.delete("/items/{item_id}", status_code=204)
def delete_item(
    item_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Soft delete (has history) or hard delete (no history) (Admin only)."""
    inventory_service.delete_item(db, item_id)
