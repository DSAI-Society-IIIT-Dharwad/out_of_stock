"""
/api/v1/ml — ML prediction and training status endpoints.
"""
import json
import threading
import time
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()

# Shared training state
_train_state = {
    "status": "idle",
    "last_trained": None,
    "last_metrics": None,
    "error": None,
}


def get_train_state() -> dict:
    return dict(_train_state)


def run_training_async(delay_seconds: int = 0):
    def _worker():
        if delay_seconds:
            time.sleep(delay_seconds)
        _train_state["status"] = "training"
        _train_state["error"] = None
        try:
            from ml.train_pipeline import train
            metrics = train(epochs=20)
            _train_state["status"] = metrics.get("status", "ok")
            _train_state["last_metrics"] = metrics
            _train_state["last_trained"] = datetime.utcnow().isoformat()
        except Exception as e:
            _train_state["status"] = "error"
            _train_state["error"] = str(e)

    threading.Thread(target=_worker, daemon=True).start()


# ── Context loader ────────────────────────────────────────────────────────────

@router.get("/ml/context")
def get_predict_context(
    asin: str = Query(...),
    location: str = Query("chennai"),
    t: TursoHTTPClient = Depends(get_turso),
):
    """
    Return the latest scraped record for an ASIN+location so the frontend
    can pre-fill all derived features. Also returns the seller list.
    """
    rows = t.query_rows(
        """
        SELECT buybox_seller, buybox_price, ships_from, all_sellers, scraped_at
        FROM price_records
        WHERE asin = ? AND location = ?
        ORDER BY scraped_at DESC LIMIT 1
        """,
        [asin, location],
    )
    if not rows:
        # fallback: any location
        rows = t.query_rows(
            """
            SELECT buybox_seller, buybox_price, ships_from, all_sellers, scraped_at, location
            FROM price_records WHERE asin = ?
            ORDER BY scraped_at DESC LIMIT 1
            """,
            [asin],
        )
    if not rows:
        return {"error": "not_found"}

    r = rows[0]
    raw = r["all_sellers"] or "[]"
    try:
        sellers = json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        sellers = []

    # Derive group-level stats from all_sellers
    prices = [float(s.get("price", 0)) for s in sellers if s.get("price")]
    if not prices and r["buybox_price"]:
        prices = [float(r["buybox_price"])]

    seller_count  = max(len(sellers), 1)
    fba_count     = sum(1 for s in sellers if s.get("is_fba") or s.get("fba"))
    fba_ratio     = round(fba_count / seller_count, 3)
    min_price     = min(prices) if prices else 0
    avg_price     = round(sum(prices) / len(prices), 2) if prices else 0
    buybox_price  = float(r["buybox_price"] or avg_price or 0)

    delivery_texts = " ".join(str(s.get("delivery", "")) for s in sellers).lower()
    is_free = int("free" in delivery_texts)
    is_fast = int(any(k in delivery_texts for k in ["1 day", "2 day", "tomorrow", "today"]))

    # Seller names for the dropdown
    seller_names = list({s.get("seller") or s.get("name") or "" for s in sellers if s.get("seller") or s.get("name")})
    if r["buybox_seller"] and r["buybox_seller"] not in seller_names:
        seller_names.insert(0, r["buybox_seller"])

    # Win history for seller_win_rate
    win_rows = t.query_rows(
        "SELECT buybox_seller, COUNT(*) as cnt FROM price_records WHERE asin = ? GROUP BY buybox_seller",
        [asin],
    )
    total_wins = sum(int(w["cnt"]) for w in win_rows)
    win_map = {w["buybox_seller"]: int(w["cnt"]) for w in win_rows}

    import numpy as np
    def seller_stats(name):
        wins = win_map.get(name, 0)
        rate = round(wins / total_wins, 4) if total_wins else 0.0
        log_wins = round(float(np.log1p(wins)), 4)
        return rate, log_wins

    return {
        "buybox_seller": r["buybox_seller"],
        "buybox_price": buybox_price,
        "seller_names": seller_names,
        "seller_count": seller_count,
        "fba_ratio": fba_ratio,
        "min_price": min_price,
        "avg_price": avg_price,
        "is_free_delivery": is_free,
        "is_fast_delivery": is_fast,
        "ships_from": r["ships_from"],
        "scraped_at": r["scraped_at"],
        "win_map": win_map,
        "total_wins": total_wins,
    }


# ── Predict ───────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    simulated_price: float
    price_rank: float = 1.0
    price_diff_from_min: float = 0.0
    price_vs_group_avg: float = 1.0
    product_rating: float = 4.0
    review_count: float = 50.0
    seller_win_rate: float = 0.1
    seller_total_wins_log: float = 1.0
    buybox_is_fba: int = 1
    fba_ratio: float = 0.5
    seller_count: int = 3
    is_free_delivery: int = 1
    is_fast_delivery: int = 0
    hour: int = 12
    day_of_week: int = 1
    # Profit margin calculation (from amazon_bearing_monitor)
    cost_price: float = 0.0


@router.post("/ml/predict")
def predict(body: PredictRequest):
    from ml.train_pipeline import load_model, predict_win_prob
    import numpy as np

    model, scaler = load_model()
    if model is None:
        return {"error": "model_not_ready", "message": "Model not trained yet. Trigger a scrape first."}

    base = body.simulated_price
    row = body.model_dump()
    row.pop("cost_price", None)  # not a model feature

    sweep = []
    for factor in np.linspace(0.80, 1.20, 9):
        candidate = round(base * factor, 2)
        r = {**row, "simulated_price": candidate}
        prob = predict_win_prob(model, scaler, r)
        # Profit margin per unit (from amazon_bearing_monitor)
        margin = round(candidate - body.cost_price, 2) if body.cost_price else None
        margin_pct = round((margin / candidate) * 100, 1) if margin and candidate else None
        sweep.append({
            "price": candidate,
            "win_probability": round(prob, 4),
            "margin": margin,
            "margin_pct": margin_pct,
        })

    best = max(sweep, key=lambda x: x["win_probability"])
    current_prob = predict_win_prob(model, scaler, row)

    # Strategy signal (from amazon_bearing_monitor)
    optimal_margin_pct = best.get("margin_pct")
    if optimal_margin_pct is None:
        strategy = "unknown"
    elif optimal_margin_pct >= 15:
        strategy = "compete"
    elif optimal_margin_pct >= 5:
        strategy = "caution"
    else:
        strategy = "avoid"

    return {
        "input_price": base,
        "current_win_probability": round(current_prob, 4),
        "optimal_price": best["price"],
        "optimal_win_probability": best["win_probability"],
        "optimal_margin": best.get("margin"),
        "optimal_margin_pct": best.get("margin_pct"),
        "strategy": strategy,          # "compete" | "caution" | "avoid" | "unknown"
        "price_sweep": sweep,
        "last_trained": _train_state["last_trained"],
    }


@router.get("/ml/status")
def ml_status():
    return {
        **_train_state,
        "model_ready": _train_state["status"] in ("ok", "skipped") or _train_state["last_trained"] is not None,
    }


@router.post("/ml/train", status_code=202)
def trigger_train():
    if _train_state["status"] == "training":
        return {"status": "already_training"}
    run_training_async(delay_seconds=0)
    return {"status": "accepted", "message": "Training started in background"}
