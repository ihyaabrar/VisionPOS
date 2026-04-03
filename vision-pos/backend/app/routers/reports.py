from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.user import User
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/transactions")
def list_transactions(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    cashier_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Riwayat transaksi dengan filter tanggal, kasir, dan status."""
    transactions = report_service.get_transactions(
        db,
        from_date=from_date,
        to_date=to_date,
        cashier_id=cashier_id,
        status=status,
    )
    return [
        {
            "id": tx.id,
            "session_id": tx.session_id,
            "status": tx.status,
            "started_at": tx.started_at,
            "completed_at": tx.completed_at,
            "total_amount": tx.total_amount,
            "payment_method": tx.payment_method,
        }
        for tx in transactions
    ]


@router.get("/daily")
def daily_summary(
    target_date: Optional[date] = Query(None, alias="date"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Laporan ringkasan harian: total pendapatan, jumlah transaksi, item terlaris."""
    return report_service.get_daily_summary(db, target_date=target_date)


@router.get("/export/csv")
def export_csv(
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Ekspor riwayat transaksi sebagai file CSV."""
    csv_content = report_service.export_transactions_csv(
        db, from_date=from_date, to_date=to_date
    )
    filename = "transactions"
    if from_date:
        filename += f"_{from_date}"
    if to_date:
        filename += f"_to_{to_date}"
    filename += ".csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
