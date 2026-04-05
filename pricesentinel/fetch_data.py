import os
import sqlite3
from dotenv import load_dotenv
from pricesentinel.db.turso_client import get_turso_client

# Load environment variables
load_dotenv()

# Check if using Turso
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///pricesentinel.db")

if DATABASE_URL.startswith("libsql://"):
    # Use Turso HTTP client
    turso_client = get_turso_client()
    
    if not turso_client:
        print("❌ Failed to connect to Turso")
        exit(1)
    
    try:
        # Get record count
        total = turso_client.get_record_count()
        print(f"Total records in Turso database: {total}")
        
        if total > 0:
            # Get all records
            records = turso_client.get_all_records()
            
            print("\n" + "="*80)
            print("SCRAPED DATA FROM TURSO:")
            print("="*80)
            
            for i, record in enumerate(records, 1):
                print(f"\n--- Record #{i} ---")
                for key, value in record.items():
                    print(f"  {key}: {value}")
        else:
            print("No records found in Turso database.")
            
    except Exception as e:
        print(f"❌ Failed to fetch data from Turso: {e}")
        
else:
    # For regular SQLite
    conn = sqlite3.connect('pricesentinel.db')
    cursor = conn.cursor()
    
    # Get total count
    cursor.execute('SELECT COUNT(*) FROM price_records')
    total = cursor.fetchone()[0]
    print(f"Total records in database: {total}")
    
    # Get all records
    cursor.execute('SELECT * FROM price_records')
    rows = cursor.fetchall()
    
    # Get column names
    cursor.execute('PRAGMA table_info(price_records)')
    columns = [col[1] for col in cursor.fetchall()]
    
    print("\n" + "="*80)
    print("SCRAPED DATA:")
    print("="*80)
    
    for i, row in enumerate(rows, 1):
        print(f"\n--- Record #{i} ---")
        for col_name, value in zip(columns, row):
            print(f"  {col_name}: {value}")
    
    conn.close()
