from fastapi import APIRouter, Depends, Query
from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()


@router.get("/suggest/{asin}")
def suggest_price(
    asin: str,
    location: str = Query(None),
    margin_floor: float = Query(0.0),
    t: TursoHTTPClient = Depends(get_turso),
):
    sql = "SELECT buybox_seller, buybox_price, model, location FROM price_records WHERE asin = ?"
    params = [asin]
    if location:
        sql += " AND location = ?"
        params.append(location)
    sql += " ORDER BY scraped_at DESC LIMIT 1"

    rows = t.query_rows(sql, params)
    if not rows:
        return {"error": "ASIN_NOT_FOUND", "message": f"ASIN {asin} not tracked", "status": 404}

    r = rows[0]
    buybox = float(r["buybox_price"] or 0)
    suggested = round(buybox - 10, 2)
    if margin_floor and suggested < margin_floor:
        suggested = margin_floor

    margin_at = round(suggested - margin_floor, 2) if margin_floor else None
    reasoning = f"Undercut current Buy Box by ₹{buybox - suggested:.0f}."
    if margin_floor:
        reasoning += f" Above your margin floor of ₹{margin_floor:.0f}."

    return {
        "asin": asin,
        "model": r["model"],
        "location": r["location"],
        "current_buybox_price": buybox,
        "current_buybox_seller": r["buybox_seller"],
        "suggested_price": suggested,
        "margin_floor": margin_floor,
        "margin_at_suggested": margin_at,
        "reasoning": reasoning,
    }
