"""
Turso HTTP client for reliable database operations
"""
import os
import json
import requests
from typing import List, Dict, Any, Optional

class TursoHTTPClient:
    def __init__(self, database_url: str, auth_token: str):
        if database_url.startswith("libsql://"):
            self.http_url = database_url.replace("libsql://", "https://") + "/v2/pipeline"
        else:
            raise ValueError("Invalid Turso database URL format")
        
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def execute(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Execute a single SQL statement"""
        # Turso /v2/pipeline rejects {"type":"integer"} — send ints/bools as text
        formatted_params = []
        if params:
            for param in params:
                if param is None:
                    formatted_params.append({"type": "null"})
                elif isinstance(param, bool):
                    formatted_params.append({"type": "text", "value": str(int(param))})
                elif isinstance(param, int):
                    formatted_params.append({"type": "text", "value": str(param)})
                elif isinstance(param, float):
                    formatted_params.append({"type": "float", "value": param})
                else:
                    formatted_params.append({"type": "text", "value": str(param)})
        
        payload = {
            "requests": [
                {
                    "type": "execute",
                    "stmt": {
                        "sql": sql,
                        "args": formatted_params
                    }
                }
            ]
        }
        
        try:
            response = requests.post(self.http_url, json=payload, headers=self.headers, timeout=30)
            
            # Debug: print response details on error
            if response.status_code != 200:
                print(f"❌ HTTP {response.status_code}: {response.text}")
                print(f"📊 Request payload: {json.dumps(payload, indent=2)}")
            
            response.raise_for_status()
            
            result = response.json()
            if result.get("results") and result["results"][0].get("type") == "ok":
                return result["results"][0]["response"]["result"]
            else:
                error_msg = result.get("results", [{}])[0].get("error", "Unknown error")
                raise Exception(f"Turso execution error: {error_msg}")
                
        except requests.exceptions.RequestException as e:
            raise Exception(f"Turso HTTP request failed: {e}")
    
    def create_table_if_not_exists(self):
        """Create the price_records and offers tables if they don't exist."""
        self.execute("""
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
            scraped_at TEXT,
            UNIQUE(asin, location, pin_code, scraped_at)
        )
        """)
        # Add new columns to existing tables gracefully
        for col, col_type in [
            ("ships_from", "TEXT"), ("seller_location", "TEXT"), ("state", "TEXT"),
            ("brand", "TEXT"), ("category", "TEXT"), ("rating", "REAL"),
            ("review_count", "INTEGER"), ("region", "TEXT"), ("buybox_is_fba", "INTEGER"),
        ]:
            try:
                self.execute(f"ALTER TABLE price_records ADD COLUMN {col} {col_type}")
            except Exception:
                pass

        # Offers table (from amazon_bearing_monitor)
        self.execute("""
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
    
    def insert_price_record(self, record_data: Dict[str, Any]) -> Dict[str, Any]:
        sql = """
        INSERT OR REPLACE INTO price_records
        (asin, model, title, brand, category, rating, review_count,
         location, state, pin_code, region, buybox_seller, buybox_price,
         buybox_is_fba, ships_from, seller_location, all_sellers, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = [
            record_data['asin'],
            record_data.get('model'),
            record_data.get('title', ''),
            record_data.get('brand', ''),
            record_data.get('category', ''),
            record_data.get('rating'),
            record_data.get('review_count'),
            record_data.get('location'),
            record_data.get('state', ''),
            record_data.get('pin_code'),
            record_data.get('region', ''),
            record_data.get('buybox_seller'),
            record_data.get('buybox_price'),
            1 if record_data.get('buybox_is_fba') else 0,
            record_data.get('ships_from', ''),
            record_data.get('seller_location', ''),
            json.dumps(record_data.get('all_sellers', [])),
            record_data['scraped_at'].isoformat() if hasattr(record_data['scraped_at'], 'isoformat') else str(record_data['scraped_at'])
        ]
        return self.execute(sql, params)

    def insert_offer(self, offer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a single seller offer row (from amazon_bearing_monitor)."""
        sql = """
        INSERT INTO offers
        (asin, seller_name, seller_price, shipping_price, is_fba,
         seller_rating, location, pin_code, region, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = [
            offer_data.get('asin'),
            offer_data.get('seller_name', ''),
            offer_data.get('seller_price'),
            offer_data.get('shipping_price'),
            1 if offer_data.get('is_fba') else 0,
            offer_data.get('seller_rating'),
            offer_data.get('location', ''),
            offer_data.get('pin_code', ''),
            offer_data.get('region', ''),
            offer_data.get('scraped_at', ''),
        ]
        return self.execute(sql, params)
    
    def get_record_count(self) -> int:
        """Get total number of records"""
        result = self.execute("SELECT COUNT(*) as count FROM price_records")
        return int(result['rows'][0][0]['value'])
    
    def get_all_records(self) -> List[Dict[str, Any]]:
        """Get all records from the database"""
        result = self.execute("SELECT * FROM price_records ORDER BY scraped_at DESC")
        records = []
        for row in result['rows']:
            record = {}
            for i, col in enumerate(result['cols']):
                cell = row[i]
                record[col['name']] = cell['value'] if isinstance(cell, dict) and 'value' in cell else None
            records.append(record)
        return records

def get_turso_client() -> Optional[TursoHTTPClient]:
    """Get a Turso HTTP client instance"""
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")
    
    if not DATABASE_URL.startswith("libsql://"):
        return None
    
    if not TURSO_AUTH_TOKEN:
        print("⚠️  TURSO_AUTH_TOKEN missing - Turso sync disabled")
        return None
    
    try:
        return TursoHTTPClient(DATABASE_URL, TURSO_AUTH_TOKEN)
    except Exception as e:
        print(f"⚠️  Failed to create Turso client: {e}")
        return None