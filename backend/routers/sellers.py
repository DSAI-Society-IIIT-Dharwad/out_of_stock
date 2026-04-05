import json
from fastapi import APIRouter, Depends, Query
from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()


@router.get("/sellers/{asin}")
def get_sellers(
    asin: str,
    location: str = Query(None),
    t: TursoHTTPClient = Depends(get_turso),
):
    sql = """
        SELECT buybox_seller, buybox_price, pin_code, all_sellers, scraped_at, location
        FROM price_records WHERE asin = ?
    """
    params = [asin]
    if location:
        sql += " AND location = ?"
        params.append(location)
    sql += " ORDER BY scraped_at DESC LIMIT 1"

    rows = t.query_rows(sql, params)
    if not rows:
        return {"error": "ASIN_NOT_FOUND", "message": f"ASIN {asin} not tracked", "status": 404}

    r = rows[0]
    raw = r["all_sellers"] or "[]"
    try:
        sellers = json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        sellers = []

    return {
        "asin": asin,
        "location": r["location"],
        "pin_code": r["pin_code"],
        "buybox_seller": r["buybox_seller"],
        "buybox_price": r["buybox_price"],
        "sellers": sellers,
        "scraped_at": r["scraped_at"],
    }
