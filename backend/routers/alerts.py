"""
Alerts router — user-scoped alert rules + alert feed.
Rules are tied to the authenticated user; their saved phone is used automatically.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from db.session import get_turso
from db.turso_client import TursoHTTPClient
from routers.auth import get_current_user, get_optional_user

router = APIRouter()

VALID_TYPES = {"PRICE_DROP", "BUYBOX_CHANGE", "PRICE_WAR", "STOCKOUT_SIGNAL", "ANY"}


# ── Alert feed ────────────────────────────────────────────────────────────────

@router.get("/alerts")
def get_alerts(
    limit: int = Query(100),
    user: Optional[dict] = Depends(get_optional_user),
    t: TursoHTTPClient = Depends(get_turso),
):
    """
    Returns alert feed. If authenticated, filters to ASINs covered by the
    user's rules. Otherwise returns all alerts (for unauthenticated dashboard).
    """
    try:
        if user:
            # Only show alerts for ASINs the user is watching
            rules = t.query_rows(
                "SELECT DISTINCT asin FROM alert_rules WHERE user_id = ? AND active = 1",
                [user["id"]],
            )
            asins = [r["asin"] for r in rules]
            if asins:
                placeholders = ",".join("?" * len(asins))
                rows = t.query_rows(
                    f"SELECT * FROM alerts WHERE asin IN ({placeholders}) ORDER BY fired_at DESC LIMIT ?",
                    asins + [limit],
                )
            else:
                rows = t.query_rows("SELECT * FROM alerts ORDER BY fired_at DESC LIMIT ?", [limit])
        else:
            rows = t.query_rows("SELECT * FROM alerts ORDER BY fired_at DESC LIMIT ?", [limit])
    except Exception:
        rows = []

    return {"alerts": [_shape(a) for a in rows], "total": len(rows)}


def _shape(a: dict) -> dict:
    base = {
        "id": a.get("id"), "type": a.get("type"), "asin": a.get("asin"),
        "model": a.get("model"), "location": a.get("location"),
        "message": a.get("message"), "whatsapp_sent": bool(a.get("whatsapp_sent")),
        "fired_at": a.get("fired_at"),
    }
    tp = a.get("type", "")
    if tp == "PRICE_DROP":
        base.update({"old_price": a.get("old_price"), "new_price": a.get("new_price"), "delta_percent": a.get("delta_percent")})
    elif tp == "BUYBOX_CHANGE":
        base.update({"old_seller": a.get("old_seller"), "new_seller": a.get("new_seller")})
    elif tp == "PRICE_WAR":
        base.update({"drop_count": a.get("drop_count")})
    elif tp == "STOCKOUT_SIGNAL":
        base.update({"spike_percent": a.get("spike_percent")})
    return base


# ── Alert rules ───────────────────────────────────────────────────────────────

class AlertRuleCreate(BaseModel):
    asin: str
    location: Optional[str] = None
    alert_type: str = "ANY"
    threshold: Optional[float] = None   # min % drop to trigger PRICE_DROP rule


@router.post("/alerts/rules", status_code=201)
def create_alert_rule(
    body: AlertRuleCreate,
    user: dict = Depends(get_current_user),
    t: TursoHTTPClient = Depends(get_turso),
):
    if body.alert_type not in VALID_TYPES:
        raise HTTPException(400, f"Invalid alert_type. Valid: {list(VALID_TYPES)}")

    mobile = user["phone_number"]   # always use the user's registered phone
    now = datetime.utcnow().isoformat()

    t.execute(
        """INSERT INTO alert_rules (user_id, asin, location, alert_type, threshold, mobile, active, created_at)
           VALUES (?,?,?,?,?,?,1,?)""",
        [user["id"], body.asin, body.location, body.alert_type, body.threshold, mobile, now],
    )
    rows = t.query_rows("SELECT last_insert_rowid() as id")
    rule_id = rows[0]["id"] if rows else None

    # Confirmation WhatsApp
    _send_rule_confirmation(mobile, body, user["full_name"])

    return {"status": "created", "rule_id": rule_id, "mobile": mobile}


@router.get("/alerts/rules")
def list_alert_rules(
    user: dict = Depends(get_current_user),
    t: TursoHTTPClient = Depends(get_turso),
):
    try:
        rows = t.query_rows(
            "SELECT * FROM alert_rules WHERE user_id = ? AND active = 1 ORDER BY created_at DESC",
            [user["id"]],
        )
    except Exception:
        rows = []
    return {"rules": rows, "total": len(rows)}


@router.delete("/alerts/rules/{rule_id}", status_code=200)
def delete_alert_rule(
    rule_id: int,
    user: dict = Depends(get_current_user),
    t: TursoHTTPClient = Depends(get_turso),
):
    # Ensure the rule belongs to this user
    rows = t.query_rows("SELECT id FROM alert_rules WHERE id = ? AND user_id = ?", [rule_id, user["id"]])
    if not rows:
        raise HTTPException(404, "Rule not found or not yours")
    t.execute("UPDATE alert_rules SET active = 0 WHERE id = ?", [rule_id])
    return {"status": "deactivated", "rule_id": rule_id}


# ── Simulate ──────────────────────────────────────────────────────────────────
import random

_DEMO_SELLERS = ["Rolex Bearings", "SKF India", "NSK Direct", "FAG Distributor", "NTN Bearings"]


class SimulateRequest(BaseModel):
    alert_type: str = "PRICE_DROP"
    asin: str = "DEMO_ASIN"
    location: str = "chennai"
    notify: bool = False


@router.post("/alerts/simulate", status_code=201)
def simulate_alert(
    body: SimulateRequest,
    user: dict = Depends(get_current_user),
    t: TursoHTTPClient = Depends(get_turso),
):
    _TEMPLATES = {
        "PRICE_DROP": lambda: {
            "type": "PRICE_DROP", "model": "6205",
            "old_price": round(random.uniform(1100, 1500), 2),
            "new_price": round(random.uniform(800, 1050), 2),
            "delta_percent": round(random.uniform(-25, -5), 2),
            "old_seller": None, "new_seller": None, "drop_count": None, "spike_percent": None,
        },
        "BUYBOX_CHANGE": lambda: {
            "type": "BUYBOX_CHANGE", "model": "6206",
            "old_seller": random.choice(_DEMO_SELLERS), "new_seller": random.choice(_DEMO_SELLERS),
            "old_price": None, "new_price": None, "delta_percent": None, "drop_count": None, "spike_percent": None,
        },
        "PRICE_WAR": lambda: {
            "type": "PRICE_WAR", "model": "6207",
            "drop_count": random.randint(3, 6),
            "old_price": None, "new_price": None, "delta_percent": None, "old_seller": None, "new_seller": None, "spike_percent": None,
        },
        "STOCKOUT_SIGNAL": lambda: {
            "type": "STOCKOUT_SIGNAL", "model": "6305",
            "spike_percent": round(random.uniform(20, 45), 1),
            "old_price": None, "new_price": None, "delta_percent": None, "old_seller": None, "new_seller": None, "drop_count": None,
        },
    }

    if body.alert_type not in _TEMPLATES:
        raise HTTPException(400, f"Invalid type. Valid: {list(_TEMPLATES.keys())}")

    data = _TEMPLATES[body.alert_type]()
    message = _build_message(body.alert_type, body.asin, body.location, data, demo=True)
    data["message"] = message

    now = datetime.utcnow().isoformat()
    t.execute(
        """INSERT INTO alerts
           (type, asin, model, location, message,
            old_price, new_price, delta_percent,
            old_seller, new_seller, drop_count, spike_percent,
            whatsapp_sent, fired_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?)""",
        [data["type"], body.asin, data.get("model"), body.location, message,
         data.get("old_price"), data.get("new_price"), data.get("delta_percent"),
         data.get("old_seller"), data.get("new_seller"),
         data.get("drop_count"), data.get("spike_percent"), now],
    )

    notified_to = []
    if body.notify:
        mobile = user["phone_number"]
        from alerts import sendWhatsAppText
        sendWhatsAppText(mobile, _whatsapp_message(body.alert_type, body.asin, body.location, data, user["full_name"]))
        notified_to.append(mobile)

    return {
        "status": "simulated",
        "alert_type": body.alert_type,
        "message": message,
        "whatsapp_notified": len(notified_to) > 0,
        "notified_to": notified_to,
    }


# ── Rule evaluation (called by intelligence engine) ───────────────────────────

def evaluate_rules(
    t: TursoHTTPClient,
    asin: str,
    location: str,
    alert_type: str,
    message: str,
    alert_data: dict = None,
):
    """Find active rules matching this ASIN/location/type and send WhatsApp to each user."""
    try:
        rules = t.query_rows(
            """SELECT ar.*, u.full_name as user_name
               FROM alert_rules ar
               JOIN users u ON u.id = ar.user_id
               WHERE ar.active = 1
                 AND ar.asin = ?
                 AND (ar.alert_type = ? OR ar.alert_type = 'ANY')
                 AND (ar.location IS NULL OR ar.location = '' OR ar.location = ?)
            """,
            [asin, alert_type, location],
        )
    except Exception as e:
        print(f"[Rules] query failed: {e}")
        return

    from alerts import sendWhatsAppText
    for rule in rules:
        mobile = rule.get("mobile", "")
        if not mobile:
            continue
        user_name = rule.get("user_name", "Distributor")
        wa_msg = _whatsapp_message(alert_type, asin, location, alert_data or {}, user_name)
        sendWhatsAppText(mobile, wa_msg)


# ── Message builders ──────────────────────────────────────────────────────────

def _build_message(alert_type: str, asin: str, location: str, data: dict, demo: bool = False) -> str:
    """Build a clear, descriptive message for the alert feed (plain text)."""
    prefix = "[DEMO] " if demo else ""
    loc = location.upper()

    if alert_type == "PRICE_DROP":
        old, new, delta = data.get("old_price", 0), data.get("new_price", 0), data.get("delta_percent", 0)
        return (
            f"{prefix}Price dropped from ₹{old:.0f} to ₹{new:.0f} ({abs(delta):.1f}% decrease) "
            f"in {loc}. A competitor has significantly lowered their Buy Box price — "
            f"review your pricing to stay competitive."
        )
    elif alert_type == "BUYBOX_CHANGE":
        old_s, new_s = data.get("old_seller", "Unknown"), data.get("new_seller", "Unknown")
        return (
            f"{prefix}Buy Box ownership changed in {loc}. "
            f"'{old_s}' lost the Buy Box to '{new_s}'. "
            f"This means a different seller is now the primary listing — check their price and fulfillment type."
        )
    elif alert_type == "PRICE_WAR":
        count = data.get("drop_count", 3)
        return (
            f"{prefix}{count} price drops detected in the last 6 hours in {loc}. "
            f"A price war is underway — multiple sellers are undercutting each other. "
            f"Monitor closely before adjusting your price."
        )
    elif alert_type == "STOCKOUT_SIGNAL":
        spike = data.get("spike_percent", 0)
        return (
            f"{prefix}Price spiked +{spike:.0f}% in {loc} — this usually signals a competitor stockout. "
            f"This is an opportunity to push your inventory at a premium while supply is tight."
        )
    return f"{prefix}Alert triggered for {asin} in {loc}."


def _whatsapp_message(alert_type: str, asin: str, location: str, data: dict, user_name: str) -> str:
    """Build a rich, formatted WhatsApp message for push notification."""
    loc = location.upper()
    emoji_map = {
        "PRICE_DROP": "🔴",
        "BUYBOX_CHANGE": "🟠",
        "PRICE_WAR": "⚑",
        "STOCKOUT_SIGNAL": "📦",
    }
    emoji = emoji_map.get(alert_type, "🔔")

    if alert_type == "PRICE_DROP":
        old, new, delta = data.get("old_price", 0), data.get("new_price", 0), data.get("delta_percent", 0)
        body = (
            f"A competitor just dropped their price in *{loc}*.\n\n"
            f"*Previous price:* ₹{old:.0f}\n"
            f"*New price:* ₹{new:.0f}\n"
            f"*Drop:* {abs(delta):.1f}% lower\n\n"
            f"*What this means:* Their listing is now cheaper than before. "
            f"If they hold the Buy Box, your sales may slow down.\n\n"
            f"*Suggested action:* Review your current price and consider matching or undercutting by ₹1–2 "
            f"if your margin allows."
        )
    elif alert_type == "BUYBOX_CHANGE":
        old_s, new_s = data.get("old_seller", "Unknown"), data.get("new_seller", "Unknown")
        body = (
            f"The Buy Box has changed hands in *{loc}*.\n\n"
            f"*Previous winner:* {old_s}\n"
            f"*New winner:* {new_s}\n\n"
            f"*What this means:* Amazon is now showing {new_s} as the primary seller. "
            f"Customers clicking 'Add to Cart' will buy from them, not you.\n\n"
            f"*Suggested action:* Check {new_s}'s price and fulfillment type. "
            f"If they are FBA, you may need to lower your price to recapture the Buy Box."
        )
    elif alert_type == "PRICE_WAR":
        count = data.get("drop_count", 3)
        body = (
            f"*{count} price drops* detected in the last 6 hours in *{loc}*.\n\n"
            f"*What this means:* Multiple sellers are aggressively undercutting each other. "
            f"This is a price war — margins are being squeezed across the board.\n\n"
            f"*Suggested action:* Do NOT react immediately. Wait 2–4 hours to see if prices stabilise. "
            f"Only lower your price if you are losing the Buy Box consistently."
        )
    elif alert_type == "STOCKOUT_SIGNAL":
        spike = data.get("spike_percent", 0)
        body = (
            f"Competitor prices spiked *+{spike:.0f}%* in *{loc}*.\n\n"
            f"*What this means:* A sharp price increase usually means a competitor has run out of stock. "
            f"Buyers are now looking for alternatives.\n\n"
            f"*Suggested action:* This is your window. Push your inventory now at your current price "
            f"or slightly above — demand is high and competition is weak."
        )
    else:
        body = f"An alert was triggered for ASIN *{asin}* in *{loc}*. Log in to PriceSentinel for details."

    return (
        f"{emoji} *PriceSentinel Alert*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"Hi {user_name},\n\n"
        f"{body}\n\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"_ASIN: {asin} · {loc}_\n"
        f"_Reply *LANG* to change notification language_"
    )


def _send_rule_confirmation(mobile: str, rule: AlertRuleCreate, user_name: str):
    try:
        from alerts import sendWhatsAppText
        loc_text = rule.location.upper() if rule.location else "all locations"
        threshold_text = f" (triggers when price drops ≥{rule.threshold}%)" if rule.threshold else ""
        msg = (
            f"✅ *Alert Rule Created*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"Hi {user_name}, your new alert rule is active.\n\n"
            f"*ASIN:* {rule.asin}\n"
            f"*Location:* {loc_text}\n"
            f"*Alert type:* {rule.alert_type.replace('_', ' ')}{threshold_text}\n\n"
            f"You will receive a WhatsApp message on this number whenever this condition is met.\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"_PriceSentinel · Amazon Bearing Intelligence_"
        )
        sendWhatsAppText(mobile, msg)
    except Exception as e:
        print(f"[Alerts] Confirmation message failed: {e}")
