from fastapi import APIRouter, Depends, Query
from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()


@router.get("/prices/{asin}")
def get_price_history(
    asin: str,
    location: str = Query(None),
    limit: int = Query(100),
    t: TursoHTTPClient = Depends(get_turso),
):
    sql = "SELECT id, buybox_seller, buybox_price, scraped_at FROM price_records WHERE asin = ?"
    params = [asin]
    if location:
        sql += " AND location = ?"
        params.append(location)
    sql += " ORDER BY scraped_at DESC LIMIT ?"
    params.append(limit)

    rows = t.query_rows(sql, params)
    if not rows:
        return {"error": "ASIN_NOT_FOUND", "message": f"ASIN {asin} not tracked", "status": 404}

    meta = t.query_rows(
        "SELECT model, title FROM price_records WHERE asin = ? LIMIT 1", [asin]
    )
    return {
        "asin": asin,
        "model": meta[0]["model"] if meta else None,
        "location": location,
        "records": [
            {
                "id": r["id"],
                "buybox_seller": r["buybox_seller"],
                "buybox_price": r["buybox_price"],
                "scraped_at": r["scraped_at"],
            }
            for r in rows
        ],
        "total": len(rows),
    }
