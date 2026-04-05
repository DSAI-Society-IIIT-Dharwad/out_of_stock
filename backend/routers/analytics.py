"""
/api/v1/analytics — Rich analytics endpoints ported from amazon_bearing_monitor's dashboard.
Provides region/location price breakdowns, seller leaderboard, FBA stats, price trends, and offers.
"""
from fastapi import APIRouter, Depends, Query
from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()


@router.get("/analytics/price_by_region")
def price_by_region(
    model: str = Query(None),
    t: TursoHTTPClient = Depends(get_turso),
):
    """Average/min/max Buy Box price grouped by region and model."""
    filters = ["buybox_price IS NOT NULL"]
    params = []
    if model:
        filters.append("model = ?")
        params.append(model)
    where = "WHERE " + " AND ".join(filters)
    return t.query_rows(f"""
        SELECT region, model,
               ROUND(AVG(buybox_price), 2) AS avg_price,
               ROUND(MIN(buybox_price), 2) AS min_price,
               ROUND(MAX(buybox_price), 2) AS max_price,
               COUNT(*) AS data_points
        FROM price_records {where}
        GROUP BY region, model
        ORDER BY model, avg_price
    """, params)


@router.get("/analytics/price_by_location")
def price_by_location(
    model: str = Query(None),
    t: TursoHTTPClient = Depends(get_turso),
):
    """Average Buy Box price grouped by location and model."""
    filters = ["buybox_price IS NOT NULL"]
    params = []
    if model:
        filters.append("model = ?")
        params.append(model)
    where = "WHERE " + " AND ".join(filters)
    return t.query_rows(f"""
        SELECT location, region, model,
               ROUND(AVG(buybox_price), 2) AS avg_price,
               ROUND(MIN(buybox_price), 2) AS min_price,
               COUNT(*) AS data_points
        FROM price_records {where}
        GROUP BY location, model
        ORDER BY avg_price
    """, params)


@router.get("/analytics/top_sellers")
def top_sellers(
    model: str = Query(None),
    limit: int = Query(20),
    t: TursoHTTPClient = Depends(get_turso),
):
    """Seller leaderboard: Buy Box wins, FBA wins, avg/min/max price, location coverage."""
    filters = ["buybox_seller IS NOT NULL", "buybox_seller != ''"]
    params = []
    if model:
        filters.append("model = ?")
        params.append(model)
    where = "WHERE " + " AND ".join(filters)
    params.append(limit)
    return t.query_rows(f"""
        SELECT buybox_seller,
               COUNT(*) AS wins,
               SUM(CASE WHEN buybox_is_fba = 1 THEN 1 ELSE 0 END) AS fba_wins,
               ROUND(AVG(buybox_price), 2) AS avg_price,
               ROUND(MIN(buybox_price), 2) AS min_price,
               ROUND(MAX(buybox_price), 2) AS max_price,
               COUNT(DISTINCT location) AS locations,
               COUNT(DISTINCT model) AS models
        FROM price_records {where}
        GROUP BY buybox_seller
        ORDER BY wins DESC
        LIMIT ?
    """, params)


@router.get("/analytics/fba_stats")
def fba_stats(
    model: str = Query(None),
    t: TursoHTTPClient = Depends(get_turso),
):
    """FBA vs non-FBA Buy Box win counts and average prices."""
    filters = ["buybox_price IS NOT NULL"]
    params = []
    if model:
        filters.append("model = ?")
        params.append(model)
    where = "WHERE " + " AND ".join(filters)
    return t.query_rows(f"""
        SELECT buybox_is_fba,
               COUNT(*) AS wins,
               ROUND(AVG(buybox_price), 2) AS avg_price
        FROM price_records {where}
        GROUP BY buybox_is_fba
    """, params)


@router.get("/analytics/price_trend")
def price_trend(
    asin: str = Query(None),
    model: str = Query(None),
    location: str = Query(None),
    days: int = Query(30),
    t: TursoHTTPClient = Depends(get_turso),
):
    """Buy Box price over time — for trend charts."""
    filters = ["buybox_price IS NOT NULL"]
    params = []
    if asin:
        filters.append("asin = ?")
        params.append(asin)
    if model:
        filters.append("model = ?")
        params.append(model)
    if location:
        filters.append("location = ?")
        params.append(location)
    filters.append(f"scraped_at >= datetime('now', '-{days} days')")
    where = "WHERE " + " AND ".join(filters)
    return t.query_rows(f"""
        SELECT asin, model, location, buybox_seller, buybox_price, scraped_at
        FROM price_records {where}
        ORDER BY scraped_at ASC
        LIMIT 500
    """, params)


@router.get("/analytics/offers/{asin}")
def get_offers(
    asin: str,
    location: str = Query(None),
    t: TursoHTTPClient = Depends(get_turso),
):
    """All individual seller offers for an ASIN (from offers table)."""
    sql = """
        SELECT seller_name, seller_price, shipping_price, is_fba,
               seller_rating, location, pin_code, region, scraped_at
        FROM offers WHERE asin = ?
    """
    params = [asin]
    if location:
        sql += " AND location = ?"
        params.append(location)
    sql += " ORDER BY scraped_at DESC LIMIT 200"
    rows = t.query_rows(sql, params)
    return {"asin": asin, "location": location, "offers": rows, "total": len(rows)}


@router.get("/analytics/models")
def list_models(t: TursoHTTPClient = Depends(get_turso)):
    """Distinct bearing models in the database."""
    rows = t.query_rows("SELECT DISTINCT model FROM price_records WHERE model IS NOT NULL ORDER BY model")
    return [r["model"] for r in rows]


@router.get("/analytics/regions")
def list_regions(t: TursoHTTPClient = Depends(get_turso)):
    """Distinct regions in the database."""
    rows = t.query_rows("SELECT DISTINCT region FROM price_records WHERE region IS NOT NULL ORDER BY region")
    return [r["region"] for r in rows]
