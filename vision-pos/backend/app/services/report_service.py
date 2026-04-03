from __future__ import annotations

import csv
import io
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.transaction import Transaction, TransactionItem
from app.models.user import Session as UserSession


def get_transactions(
    db: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    cashier_id: Optional[int] = None,
    status: Optional[str] = None,
) -> list[Transaction]:
    """Filter riwayat transaksi berdasarkan rentang tanggal, kasir, dan status."""
    query = db.query(Transaction)

    if from_date is not None:
        from_dt = datetime.combine(from_date, datetime.min.time())
        query = query.filter(Transaction.started_at >= from_dt)

    if to_date is not None:
        to_dt = datetime.combine(to_date + timedelta(days=1), datetime.min.time())
        query = query.filter(Transaction.started_at < to_dt)

    if cashier_id is not None:
        query = query.join(UserSession, Transaction.session_id == UserSession.id)
        query = query.filter(UserSession.user_id == cashier_id)

    if status is not None:
        query = query.filter(Transaction.status == status)

    return query.order_by(Transaction.started_at.desc()).all()


def get_daily_summary(db: Session, target_date: Optional[date] = None) -> dict:
    """Laporan ringkasan harian: total pendapatan, jumlah transaksi, item terlaris."""
    if target_date is None:
        target_date = date.today()

    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = datetime.combine(target_date + timedelta(days=1), datetime.min.time())

    completed_txs = (
        db.query(Transaction)
        .filter(
            Transaction.status == "completed",
            Transaction.started_at >= day_start,
            Transaction.started_at < day_end,
        )
        .all()
    )

    total_revenue = sum(tx.total_amount or 0.0 for tx in completed_txs)
    transaction_count = len(completed_txs)

    # Hitung item terlaris dari transaction_items
    tx_ids = [tx.id for tx in completed_txs]
    top_items: list[dict] = []
    if tx_ids:
        rows = (
            db.query(
                TransactionItem.item_id,
                TransactionItem.item_name,
                func.sum(TransactionItem.quantity).label("total_qty"),
                func.sum(TransactionItem.subtotal).label("total_revenue"),
            )
            .filter(TransactionItem.transaction_id.in_(tx_ids))
            .group_by(TransactionItem.item_id, TransactionItem.item_name)
            .order_by(func.sum(TransactionItem.quantity).desc())
            .limit(10)
            .all()
        )
        top_items = [
            {
                "item_id": r.item_id,
                "item_name": r.item_name,
                "total_qty": r.total_qty,
                "total_revenue": r.total_revenue,
            }
            for r in rows
        ]

    return {
        "date": target_date.isoformat(),
        "total_revenue": total_revenue,
        "transaction_count": transaction_count,
        "top_items": top_items,
    }


def export_transactions_csv(
    db: Session,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
) -> str:
    """Ekspor riwayat transaksi sebagai CSV string."""
    transactions = get_transactions(db, from_date=from_date, to_date=to_date)

    # Ambil username kasir via join sessions → users
    from app.models.user import User

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["id", "started_at", "completed_at", "status", "total_amount", "payment_method", "cashier"]
    )

    for tx in transactions:
        session = db.query(UserSession).filter(UserSession.id == tx.session_id).first()
        cashier_name = ""
        if session:
            user = db.query(User).filter(User.id == session.user_id).first()
            cashier_name = user.username if user else ""

        writer.writerow(
            [
                tx.id,
                tx.started_at.isoformat() if tx.started_at else "",
                tx.completed_at.isoformat() if tx.completed_at else "",
                tx.status,
                tx.total_amount if tx.total_amount is not None else "",
                tx.payment_method or "",
                cashier_name,
            ]
        )

    return output.getvalue()
