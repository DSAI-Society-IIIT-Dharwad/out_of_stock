#!/usr/bin/env python3
"""
Test database connection and basic operations
"""
import os
from datetime import datetime
from pricesentinel.db.session import init_db, get_session
from pricesentinel.db.models import PriceRecord

def test_database():
    """Test database connection and operations"""
    print("🔍 Testing database connection...")
    
    try:
        # Initialize database
        print("📊 Initializing database...")
        init_db()
        print("✅ Database initialized successfully!")
        
        # Test session
        print("🔗 Testing database session...")
        session = get_session()
        
        # Test insert
        print("💾 Testing data insertion...")
        test_record = PriceRecord(
            asin="TEST123",
            model="TEST",
            title="Test Bearing",
            location="test",
            pin_code="000000",
            buybox_seller="Test Seller",
            buybox_price=100.0,
            all_sellers=[{"name": "Test", "price": "₹100"}],
            scraped_at=datetime.utcnow()
        )
        
        session.add(test_record)
        session.commit()
        print("✅ Test record inserted successfully!")
        
        # Test query
        print("🔍 Testing data retrieval...")
        records = session.query(PriceRecord).all()
        print(f"📊 Found {len(records)} records in database")
        
        for record in records:
            print(f"  - {record.model} | {record.asin} | {record.buybox_price}")
        
        session.close()
        print("✅ Database test completed successfully!")
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database()