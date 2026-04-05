from fastapi import APIRouter, Depends, Query
from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()


@router.get("/buybox/{asin}")
def get_buybox_history(
    asin: str,
    location: str = Query(None),
    t: TursoHTTPClient = Depends(get_turso),
):
    sql = "SELECT buybox_seller, buybox_price, scraped_at FROM price_records WHERE asin = ?"
    params = [asin]
    if location:
        sql += " AND location = ?"
        params.append(location)
    sql += " ORDER BY scraped_at ASC"

    rows = t.query_rows(sql, params)
    if not rows:
        return {"error": "ASIN_NOT_FOUND", "message": f"ASIN {asin} not tracked", "status": 404}

    history = []
    prev_seller = None
    for r in rows:
        if r["buybox_seller"] != prev_seller:
            if history:
                history[-1]["held_until"] = r["scraped_at"]
            history.append({
                "seller": r["buybox_seller"],
                "price": r["buybox_price"],
                "held_from": r["scraped_at"],
                "held_until": None,
            })
            prev_seller = r["buybox_seller"]

    return {"asin": asin, "location": location, "history": history}
