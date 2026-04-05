"""
PriceSentinel - SKF Bearing Price Monitor
Main entry point for the application
"""
from pricesentinel.db.session import init_db
import sys

def main():
    """Initialize the application"""
    print("🔍 PriceSentinel - SKF Bearing Price Monitor")
    print("=" * 50)
    
    try:
        # Initialize database
        print("📊 Initializing database...")
        init_db()
        print("✅ Database initialized successfully!")
        
        print("\n🚀 Ready to monitor prices!")
        print("\nUsage:")
        print("  python cli.py scrape    # Run the scraper")
        print("  python cli.py data      # View scraped data")
        print("  python cli.py setup     # Set up environment")
        
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
