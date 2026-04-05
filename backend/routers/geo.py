from fastapi import APIRouter, Depends
from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()

GEO_META = {
    "mumbai":             {"state": "Maharashtra",        "pin": "400001", "region": "west"},
    "delhi":              {"state": "Delhi",              "pin": "110001", "region": "north"},
    "bangalore":          {"state": "Karnataka",          "pin": "560001", "region": "south"},
    "hyderabad":          {"state": "Telangana",          "pin": "500001", "region": "south"},
    "chennai":            {"state": "Tamil Nadu",         "pin": "600001", "region": "south"},
    "kolkata":            {"state": "West Bengal",        "pin": "700001", "region": "east"},
    "ahmedabad":          {"state": "Gujarat",            "pin": "380001", "region": "west"},
    "jaipur":             {"state": "Rajasthan",          "pin": "302001", "region": "north"},
    "lucknow":            {"state": "Uttar Pradesh",      "pin": "226001", "region": "north"},
    "bhopal":             {"state": "Madhya Pradesh",     "pin": "462001", "region": "central"},
    "patna":              {"state": "Bihar",              "pin": "800001", "region": "east"},
    "chandigarh":         {"state": "Punjab",             "pin": "160001", "region": "north"},
    "bhubaneswar":        {"state": "Odisha",             "pin": "751001", "region": "east"},
    "guwahati":           {"state": "Assam",              "pin": "781001", "region": "northeast"},
    "ranchi":             {"state": "Jharkhand",          "pin": "834001", "region": "east"},
    "raipur":             {"state": "Chhattisgarh",       "pin": "492001", "region": "central"},
    "dehradun":           {"state": "Uttarakhand",        "pin": "248001", "region": "north"},
    "shimla":             {"state": "Himachal Pradesh",   "pin": "171001", "region": "north"},
    "srinagar":           {"state": "J&K",                "pin": "190001", "region": "north"},
    "jammu":              {"state": "Jammu",              "pin": "180001", "region": "north"},
    "thiruvananthapuram": {"state": "Kerala",             "pin": "695001", "region": "south"},
    "visakhapatnam":      {"state": "Andhra Pradesh",     "pin": "530001", "region": "south"},
    "agartala":           {"state": "Tripura",            "pin": "799001", "region": "northeast"},
    "aizawl":             {"state": "Mizoram",            "pin": "796001", "region": "northeast"},
    "kohima":             {"state": "Nagaland",           "pin": "797001", "region": "northeast"},
    "imphal":             {"state": "Manipur",            "pin": "795001", "region": "northeast"},
    "shillong":           {"state": "Meghalaya",          "pin": "793001", "region": "northeast"},
    "gangtok":            {"state": "Sikkim",             "pin": "737101", "region": "northeast"},
    "itanagar":           {"state": "Arunachal Pradesh",  "pin": "791111", "region": "northeast"},
    "panaji":             {"state": "Goa",                "pin": "403001", "region": "west"},
    "haryana_gurugram":   {"state": "Haryana",            "pin": "122001", "region": "north"},
    "puducherry":         {"state": "Puducherry",         "pin": "605001", "region": "south"},
    "port_blair":         {"state": "Andaman & Nicobar",  "pin": "744101", "region": "island"},
    "daman":              {"state": "Dadra & Daman",      "pin": "396210", "region": "west"},
    "kavaratti":          {"state": "Lakshadweep",        "pin": "682555", "region": "island"},
    "leh":                {"state": "Ladakh",             "pin": "194101", "region": "north"},
}


@router.get("/geo/{asin}")
def get_geo_snapshot(asin: str, t: TursoHTTPClient = Depends(get_turso)):
    rows = t.query_rows(
        """
        SELECT p.location, p.buybox_seller, p.buybox_price, p.scraped_at
        FROM price_records p
        INNER JOIN (
            SELECT location, MAX(scraped_at) AS max_ts
            FROM price_records WHERE asin = ?
            GROUP BY location
        ) latest ON p.location = latest.location AND p.scraped_at = latest.max_ts
        WHERE p.asin = ?
        """,
        [asin, asin],
    )

    if not rows:
        return {"error": "ASIN_NOT_FOUND", "message": f"ASIN {asin} not tracked", "status": 404}

    locations = {}
    for r in rows:
        loc = r["location"]
        meta = GEO_META.get(loc, {"state": loc, "pin": "—", "region": "other"})
        locations[loc] = {
            "location": loc,
            "state": meta["state"],
            "pin_code": meta["pin"],
            "region": meta["region"],
            "buybox_seller": r["buybox_seller"],
            "buybox_price": r["buybox_price"],
            "scraped_at": r["scraped_at"],
        }

    prices = [v["buybox_price"] for v in locations.values() if v["buybox_price"]]
    return {
        "asin": asin,
        "locations": locations,
        "covered": len(locations),
        "total_locations": len(GEO_META),
        "min_price": min(prices) if prices else None,
        "max_price": max(prices) if prices else None,
        "avg_price": round(sum(prices) / len(prices), 2) if prices else None,
    }
