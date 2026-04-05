#!/usr/bin/env python3
"""
PriceSentinel CLI - Command line interface for price monitoring operations
"""
import argparse
import subprocess
import sys
from pathlib import Path

def run_scraper(spider_name="amazon_bearing", log_level="INFO", models=None, locations=None, limit=None, product=None, top_n=None, asin=None):
    """Run the Scrapy spider"""
    print(f"🕷️  Starting {spider_name} spider...")
    
    cmd = ["uv", "run", "scrapy", "crawl", spider_name, "-s", f"LOG_LEVEL={log_level}"]
    
    if models:
        cmd.extend(["-a", f"models={models}"])
        print(f"🎯 Filtering models: {models}")
    
    if locations:
        cmd.extend(["-a", f"locations={locations}"])
        print(f"🌍 Filtering locations: {locations}")

    if limit:
        cmd.extend(["-a", f"limit={limit}"])
        print(f"🛑 Item limit: {limit}")

    if top_n:
        cmd.extend(["-a", f"top_n={top_n}"])
        print(f"🔢 Top-N per search: {top_n}")

    if product:
        cmd.extend(["-a", f"product={product}"])
        print(f"🔍 Custom product: {product}")

    if asin:
        cmd.extend(["-a", f"asin={asin}"])
        print(f"📦 ASIN-direct mode: {asin}")
    
    try:
        result = subprocess.run(cmd, check=True)
        print("✅ Scraping completed successfully!")
        return result.returncode
    except subprocess.CalledProcessError as e:
        print(f"❌ Scraping failed with error: {e}")
        return e.returncode

def view_data():
    """View scraped data from database"""
    print("📊 Fetching scraped data...")
    cmd = ["uv", "run", "python", "fetch_data.py"]
    
    try:
        result = subprocess.run(cmd, check=True)
        return result.returncode
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to fetch data: {e}")
        return e.returncode

def test_database():
    """Test database connection"""
    print("🔍 Testing database connection...")
    cmd = ["uv", "run", "python", "test_db.py"]
    
    try:
        result = subprocess.run(cmd, check=True)
        return result.returncode
    except subprocess.CalledProcessError as e:
        print(f"❌ Database test failed: {e}")
        return e.returncode
    """View scraped data from database"""
    print("📊 Fetching scraped data...")
    cmd = ["uv", "run", "python", "fetch_data.py"]
    
    try:
        result = subprocess.run(cmd, check=True)
        return result.returncode
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to fetch data: {e}")
        return e.returncode

def setup_project():
    """Set up the project environment"""
    print("🔧 Setting up PriceSentinel...")
    
    # Install dependencies
    print("📦 Installing dependencies...")
    subprocess.run(["uv", "sync"], check=True)
    
    # Install Playwright browsers
    print("🎭 Installing Playwright browsers...")
    subprocess.run(["uv", "run", "playwright", "install", "chromium"], check=True)
    
    # Check if .env exists
    if not Path(".env").exists():
        print("⚠️  .env file not found. Please create one with your credentials:")
        print("   SCRAPEOPS_API_KEY=your_api_key")
        print("   DATABASE_URL=your_database_url")
    
    print("✅ Setup completed!")

def main():
    parser = argparse.ArgumentParser(
        description="PriceSentinel - SKF Bearing Price Monitor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py scrape                                      # Run scraper (default 100 items)
  python cli.py scrape --limit 50                           # Stop after 50 items
  python cli.py scrape --locations mumbai,delhi             # Scrape specific cities
  python cli.py scrape --product "NSK bearing 6205"         # Custom product search
  python cli.py scrape --locations mumbai --product "FAG bearing 6206" --limit 20
  python cli.py scrape --debug                              # Run with debug logging
  python cli.py data                                        # View scraped data
  python cli.py setup                                       # Set up the project
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Scrape command
    scrape_parser = subparsers.add_parser("scrape", help="Run the price scraper")
    scrape_parser.add_argument(
        "--spider", 
        default="amazon_bearing", 
        help="Spider name to run (default: amazon_bearing)"
    )
    scrape_parser.add_argument(
        "--debug", 
        action="store_true", 
        help="Enable debug logging"
    )
    scrape_parser.add_argument(
        "--models",
        help="Comma-separated list of bearing models to scrape (e.g., 6205,6206)"
    )
    scrape_parser.add_argument(
        "--locations",
        help="Comma-separated list of cities to scrape (e.g., mumbai,delhi,bangalore)"
    )
    scrape_parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Max total items to scrape (default: 100)"
    )
    scrape_parser.add_argument(
        "--top-n",
        type=int,
        default=5,
        dest="top_n",
        help="Max results to process per (query, city) combination (default: 5)"
    )
    scrape_parser.add_argument(
        "--product",
        help="Custom product search query (e.g., 'NSK bearing 6205'). Overrides default SKF bearing search."
    )
    scrape_parser.add_argument(
        "--asin",
        help="Scrape a specific ASIN directly across all cities (e.g. B07H1GJZMP)"
    )
    
    # Data command
    subparsers.add_parser("data", help="View scraped data")
    
    # Test command
    subparsers.add_parser("test", help="Test database connection")
    
    # Setup command
    subparsers.add_parser("setup", help="Set up the project environment")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    if args.command == "scrape":
        log_level = "DEBUG" if args.debug else "INFO"
        return run_scraper(args.spider, log_level, args.models, args.locations, args.limit, args.product, args.top_n, args.asin)
    elif args.command == "data":
        return view_data()
    elif args.command == "test":
        return test_database()
    elif args.command == "setup":
        return setup_project()
    else:
        parser.print_help()
        return 1

if __name__ == "__main__":
    sys.exit(main())