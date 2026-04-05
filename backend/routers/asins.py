from fastapi import APIRouter, Depends
from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()


@router.get("/asins")
def list_asins(t: TursoHTTPClient = Depends(get_turso)):
    rows = t.query_rows("""
        SELECT asin, model, title,
               GROUP_CONCAT(DISTINCT location) AS locations,
               MAX(scraped_at) AS last_scraped
        FROM price_records
        GROUP BY asin
        ORDER BY last_scraped DESC
    """)
    return {
        "asins": [
            {
                "asin": r["asin"],
                "model": r["model"],
                "title": r["title"],
                "locations_tracked": list(set(r["locations"].split(","))) if r["locations"] else [],
                "last_scraped": r["last_scraped"],
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/asins/search")
def search_asins(q: str = "", t: TursoHTTPClient = Depends(get_turso)):
    """Search by ASIN, model number, or title."""
    like = f"%{q.upper()}%"
    rows = t.query_rows(
        """
        SELECT asin, model, title,
               GROUP_CONCAT(DISTINCT location) AS locations,
               MAX(scraped_at) AS last_scraped
        FROM price_records
        WHERE UPPER(asin) LIKE ? OR UPPER(model) LIKE ? OR UPPER(title) LIKE ?
        GROUP BY asin
        ORDER BY last_scraped DESC
        LIMIT 20
        """,
        [like, like, like],
    )
    return {
        "query": q,
        "results": [
            {
                "asin": r["asin"],
                "model": r["model"],
                "title": r["title"],
                "locations_tracked": list(set(r["locations"].split(","))) if r["locations"] else [],
                "last_scraped": r["last_scraped"],
            }
            for r in rows
        ],
        "total": len(rows),
    }
