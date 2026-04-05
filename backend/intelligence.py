"""
Intelligence Engine — detects price signals and fires alerts.
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from db.models import PriceRecord, Alert
from alerts import send_whatsapp_alert


def _pct(old: float, new: float) -> float:
    if not old:
        return 0.0
    return round((new - old) / old * 100, 2)


def run_intelligence(db: Session, record: PriceRecord):
    """Compare new record against last record and fire signals."""
    prev = (
        db.query(PriceRecord)
        .filter(
            PriceRecord.asin == record.asin,
            PriceRecord.location == record.location,
            PriceRecord.id != record.id,
        )
        .order_by(PriceRecord.scraped_at.desc())
        .first()
    )

    if not prev:
        return  # no history yet

    alerts = []

    # 1. Price drop > 5%
    if record.buybox_price and prev.buybox_price:
        delta = _pct(prev.buybox_price, record.buybox_price)
        if delta <= -5.0:
            msg = (
                f"{record.buybox_seller} dropped price from "
                f"₹{prev.buybox_price:.0f} to ₹{record.buybox_price:.0f} "
                f"({delta:.1f}% drop)"
            )
            alerts.append(Alert(
                type="PRICE_DROP",
                asin=record.asin,
                model=record.model,
                location=record.location,
                message=msg,
                old_price=prev.buybox_price,
                new_price=record.buybox_price,
                delta_percent=delta,
            ))

        # 4. Stock-out signal: price spike > 20%
        if delta >= 20.0:
            msg = (
                f"Competitor price spiked {delta:.0f}% — "
                f"possible stock shortage. Opportunity to push inventory."
            )
            alerts.append(Alert(
                type="STOCKOUT_SIGNAL",
                asin=record.asin,
                model=record.model,
                location=record.location,
                message=msg,
                spike_percent=delta,
            ))

    # 2. Buy Box change
    if prev.buybox_seller and record.buybox_seller and prev.buybox_seller != record.buybox_seller:
        msg = f"Buy Box shifted from {prev.buybox_seller} to {record.buybox_seller}"
        alerts.append(Alert(
            type="BUYBOX_CHANGE",
            asin=record.asin,
            model=record.model,
            location=record.location,
            message=msg,
            old_seller=prev.buybox_seller,
            new_seller=record.buybox_seller,
        ))

    # 3. Price war: 3+ drops in last 6 hours for same ASIN
    six_hours_ago = datetime.utcnow() - timedelta(hours=6)
    recent_drops = (
        db.query(Alert)
        .filter(
            Alert.asin == record.asin,
            Alert.location == record.location,
            Alert.type == "PRICE_DROP",
            Alert.fired_at >= six_hours_ago,
        )
        .count()
    )
    if recent_drops >= 2:  # this new one would make 3
        msg = f"Price war detected — {recent_drops + 1} drops in last 6 hours"
        alerts.append(Alert(
            type="PRICE_WAR",
            asin=record.asin,
            model=record.model,
            location=record.location,
            message=msg,
            drop_count=recent_drops + 1,
        ))

    for alert in alerts:
        db.add(alert)
        db.flush()
        sent = send_whatsapp_alert(alert.message)
        alert.whatsapp_sent = sent
        # Check user-defined alert rules and notify their mobile numbers
        try:
            from db.turso_client import get_turso_client
            from routers.alerts import evaluate_rules
            t = get_turso_client()
            if t:
                evaluate_rules(t, alert.asin, alert.location or "", alert.type, alert.message)
        except Exception as e:
            print(f"[Intelligence] rule evaluation failed: {e}")

    if alerts:
        db.commit()
