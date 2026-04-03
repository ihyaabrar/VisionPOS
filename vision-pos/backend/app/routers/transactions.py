from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.transaction import (
    AddItemRequest,
    CancelTransactionRequest,
    CartItemOut,
    CompleteTransactionRequest,
    ReceiptOut,
    TransactionOut,
)
from app.services import transaction_service

router = APIRouter()


def _tx_to_out(tx) -> TransactionOut:
    items = [
        CartItemOut(
            item_id=i.item_id,
            item_name=i.item_name,
            unit_price=i.unit_price,
            quantity=i.quantity,
            subtotal=i.subtotal,
        )
        for i in tx.items
    ]
    return TransactionOut(
        id=tx.id,
        session_id=tx.session_id,
        status=tx.status,
        started_at=tx.started_at,
        completed_at=tx.completed_at,
        total_amount=tx.total_amount,
        items=items,
    )


@router.post("/transactions", response_model=TransactionOut, status_code=201)
def create_transaction(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Buat transaksi baru untuk sesi kasir yang sedang aktif."""
    from app.models.user import Session as UserSession

    # Ambil sesi aktif user (sesi terakhir yang belum ditutup)
    session = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == current_user.id,
            UserSession.ended_at.is_(None),
        )
        .order_by(UserSession.started_at.desc())
        .first()
    )
    if session is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak ada sesi aktif untuk user ini",
        )

    tx = transaction_service.create_transaction(db, session.id)
    return _tx_to_out(tx)


@router.get("/transactions/{tx_id}", response_model=TransactionOut)
def get_transaction(
    tx_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Ambil detail transaksi berdasarkan ID."""
    from fastapi import HTTPException

    tx = transaction_service.get_transaction(db, tx_id)
    if tx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaksi '{tx_id}' tidak ditemukan",
        )
    return _tx_to_out(tx)


@router.post("/transactions/{tx_id}/items", response_model=CartItemOut, status_code=201)
def add_item(
    tx_id: str,
    data: AddItemRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Tambah item ke keranjang transaksi."""
    tx_item = transaction_service.add_item(db, tx_id, data.item_id, data.quantity)
    return CartItemOut(
        item_id=tx_item.item_id,
        item_name=tx_item.item_name,
        unit_price=tx_item.unit_price,
        quantity=tx_item.quantity,
        subtotal=tx_item.subtotal,
    )


@router.delete("/transactions/{tx_id}/items/{item_id}", status_code=204)
def remove_item(
    tx_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Hapus item dari keranjang transaksi."""
    transaction_service.remove_item(db, tx_id, item_id)


@router.post("/transactions/{tx_id}/complete")
def complete_transaction(
    tx_id: str,
    data: CompleteTransactionRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Selesaikan transaksi: potong stok, hitung kembalian."""
    return transaction_service.complete_transaction(
        db, tx_id, data.payment_method, data.payment_received
    )


@router.post("/transactions/{tx_id}/cancel", status_code=204)
def cancel_transaction(
    tx_id: str,
    data: CancelTransactionRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Batalkan transaksi."""
    transaction_service.cancel_transaction(db, tx_id, data.reason)


@router.get("/transactions/{tx_id}/receipt", response_model=ReceiptOut)
def get_receipt(
    tx_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Ambil struk transaksi yang sudah selesai."""
    return transaction_service.get_receipt(db, tx_id)
