"""
Primary DB layer — Turso (libsql) via HTTP API.
All routers use get_turso() as their FastAPI dependency.
Local SQLite is kept as fallback for init_db (alerts table creation).
"""
import os
from dotenv import load_dotenv
from db.turso_client import TursoHTTPClient, get_turso_client

load_dotenv()

_CREATE_ALERTS = """
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    asin TEXT NOT NULL,
    model TEXT,
    location TEXT,
    message TEXT,
    old_price REAL,
    new_price REAL,
    delta_percent REAL,
    old_seller TEXT,
    new_seller TEXT,
    drop_count INTEGER,
    spike_percent REAL,
    whatsapp_sent INTEGER DEFAULT 0,
    fired_at TEXT
)
"""

_CREATE_PRICE_RECORDS = """
CREATE TABLE IF NOT EXISTS price_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asin TEXT NOT NULL,
    model TEXT,
    title TEXT,
    location TEXT,
    state TEXT,
    pin_code TEXT,
    buybox_seller TEXT,
    buybox_price REAL,
    ships_from TEXT,
    seller_location TEXT,
    all_sellers TEXT,
    scraped_at TEXT
)
"""

_CREATE_ALERT_RULES = """
CREATE TABLE IF NOT EXISTS alert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    asin TEXT NOT NULL,
    location TEXT,
    alert_type TEXT NOT NULL,
    threshold REAL,
    mobile TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT
)
"""

_CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    city TEXT,
    state TEXT,
    company_name TEXT,
    business_type TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT
)
"""


def init_db():
    t = get_turso_client()
    if not t:
        print("⚠️  Turso not configured — DB init skipped")
        return
    try:
        # price_records with all new columns (from amazon_bearing_monitor merge)
        t.execute("""
        CREATE TABLE IF NOT EXISTS price_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asin TEXT NOT NULL,
            model TEXT,
            title TEXT,
            brand TEXT,
            category TEXT,
            rating REAL,
            review_count INTEGER,
            location TEXT,
            state TEXT,
            pin_code TEXT,
            region TEXT,
            buybox_seller TEXT,
            buybox_price REAL,
            buybox_is_fba INTEGER DEFAULT 0,
            ships_from TEXT,
            seller_location TEXT,
            all_sellers TEXT,
            scraped_at TEXT
        )
        """)
        # Migrate existing tables gracefully
        for col, col_type in [
            ("brand", "TEXT"), ("category", "TEXT"), ("rating", "REAL"),
            ("review_count", "INTEGER"), ("region", "TEXT"), ("buybox_is_fba", "INTEGER"),
        ]:
            try:
                t.execute(f"ALTER TABLE price_records ADD COLUMN {col} {col_type}")
            except Exception:
                pass

        t.execute(_CREATE_ALERTS)
        t.execute(_CREATE_ALERT_RULES)
        t.execute(_CREATE_USERS)

        # Migrate users: add any missing columns gracefully
        for col, col_type in [
            ("full_name", "TEXT"),
            ("phone_number", "TEXT"),
            ("city", "TEXT"),
            ("state", "TEXT"),
            ("company_name", "TEXT"),
            ("business_type", "TEXT"),
            ("is_active", "INTEGER"),
            ("updated_at", "TEXT"),
        ]:
            try:
                t.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
            except Exception:
                pass  # column already exists

        # Migrate alert_rules: add user_id column if missing
        try:
            t.execute("ALTER TABLE alert_rules ADD COLUMN user_id INTEGER")
        except Exception:
            pass

        # Offers table (from amazon_bearing_monitor)
        t.execute("""
        CREATE TABLE IF NOT EXISTS offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asin TEXT NOT NULL,
            seller_name TEXT,
            seller_price REAL,
            shipping_price REAL,
            is_fba INTEGER DEFAULT 0,
            seller_rating REAL,
            location TEXT,
            pin_code TEXT,
            region TEXT,
            scraped_at TEXT
        )
        """)

        count = t.query_rows("SELECT COUNT(*) as cnt FROM price_records")[0]["cnt"]
        print(f"✅ Turso ready — {count} price records")
    except Exception as e:
        print(f"❌ Turso init error: {e}")


def get_turso() -> TursoHTTPClient:
    """FastAPI dependency — yields a live Turso client."""
    t = get_turso_client()
    if not t:
        raise RuntimeError("Turso not configured")
    return t
