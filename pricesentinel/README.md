# PriceSentinel 🔍

A comprehensive price monitoring system for SKF bearings on Amazon India. Built with Scrapy, FastAPI, and Turso database for real-time price tracking across multiple locations.

## 🚀 Features

- **Multi-location Price Tracking**: Monitors prices across Chennai, Bangalore, and Mumbai
- **SKF Bearing Models**: Tracks popular models (6205, 6206, 6207, 6305)
- **Seller Analysis**: Captures buybox seller, all available sellers, and pricing data
- **Geo-targeted Scraping**: Uses location-specific headers and pin codes
- **Database Storage**: Stores data in Turso (libSQL) for scalability
- **Anti-detection**: Playwright integration with proxy rotation and user-agent rotation

## 🏗️ Architecture

```
pricesentinel/
├── api/                    # FastAPI endpoints (planned)
├── db/                     # Database models and session management
│   ├── models.py          # SQLAlchemy models
│   └── session.py         # Database connection and session
├── scheduler/             # Task scheduling (planned)
├── scraper/               # Scrapy-based web scraping
│   ├── middlewares/       # Custom middlewares
│   ├── spiders/           # Spider implementations
│   │   └── amazon.py      # Amazon India spider
│   ├── items.py           # Data structures
│   ├── pipelines.py       # Data processing pipelines
│   └── settings.py        # Scrapy configuration
└── __init__.py
```

## 📊 Data Model

The system tracks the following data points for each bearing:

- **Product Info**: ASIN, model, title
- **Location**: City and pin code
- **Pricing**: Buybox price and seller
- **Sellers**: Complete list of all sellers with prices, FBA status, and ratings
- **Timestamp**: When the data was scraped

## 🛠️ Technology Stack

- **Web Scraping**: Scrapy + Playwright for JavaScript-heavy pages
- **Database**: Turso (libSQL) for distributed SQLite
- **Proxy Management**: ScrapeOps for IP rotation
- **Anti-detection**: Custom user-agent rotation and browser fingerprinting
- **Data Processing**: Pandas for analysis
- **API**: FastAPI (planned)
- **Scheduling**: APScheduler (planned)

## 🚦 Getting Started

### Prerequisites

- Python 3.10+
- uv package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pricesentinel
```

2. Install dependencies:
```bash
uv sync
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Install Playwright browsers:
```bash
uv run playwright install chromium
```

### Configuration

Update `.env` with your credentials:
```env
SCRAPEOPS_API_KEY=your_scrapeops_api_key
DATABASE_URL=libsql://your-turso-database-url
```

## 🎯 Usage

### Running the Scraper

```bash
# Run the Amazon bearing spider
uv run scrapy crawl amazon_bearing

# Run with custom settings
uv run scrapy crawl amazon_bearing -s LOG_LEVEL=DEBUG
```

### Viewing Scraped Data

```bash
# View all scraped data
uv run python fetch_data.py
```

### Current Monitoring Scope

- **Bearing Models**: 6205, 6206, 6207, 6305
- **Locations**: 
  - Chennai (600001)
  - Bangalore (560001) 
  - Mumbai (400001)
- **Data Points**: ~50+ products per model per location

## 📈 Current Status

### ✅ Completed Features

- [x] Scrapy spider for Amazon India
- [x] Multi-location price tracking
- [x] Database schema and models
- [x] Data pipeline with price parsing
- [x] Playwright integration for JavaScript rendering
- [x] Proxy rotation and anti-detection measures
- [x] Comprehensive seller data collection
- [x] Real-time data display during scraping

### 🚧 In Progress

- [ ] FastAPI REST endpoints
- [ ] Automated scheduling system
- [ ] Price change alerts
- [ ] Data visualization dashboard
- [ ] Historical price analysis

### 📋 Planned Features

- [ ] Email/SMS notifications for price drops
- [ ] Price prediction using ML
- [ ] Multi-marketplace support (Flipkart, etc.)
- [ ] Advanced filtering and search
- [ ] Export functionality (CSV, Excel)
- [ ] Price comparison charts

## 🔧 Development

### Project Structure

The codebase follows a modular architecture:

- **Database Layer**: SQLAlchemy models with Turso backend
- **Scraping Layer**: Scrapy spiders with custom middlewares
- **API Layer**: FastAPI endpoints (planned)
- **Scheduling Layer**: APScheduler for automated runs (planned)

### Key Components

1. **Amazon Spider**: Handles search results, product pages, and seller listings
2. **Database Pipeline**: Processes and stores scraped data
3. **Anti-detection**: Proxy rotation, user-agent rotation, and browser fingerprinting
4. **Data Models**: Structured data storage for price records

## 📊 Sample Data Output

```
================================================================================
SCRAPED DATA:
================================================================================
Model: 6205
Location: chennai (600001)
ASIN: B07XYZ123
Title: SKF 6205-2RS1 Deep Groove Ball Bearing
BuyBox Seller: SKF India Limited
BuyBox Price: ₹245.00
Number of Sellers: 8

All Sellers:
  1. SKF India Limited - ₹245.00 (FBA: True) - Rating: 4.5 out of 5 stars
  2. Industrial Bearings Co - ₹238.50 (FBA: False) - Rating: 4.2 out of 5 stars
  3. Bearing World - ₹252.00 (FBA: True) - Rating: 4.7 out of 5 stars
================================================================================
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is for educational and research purposes. Please respect Amazon's robots.txt and terms of service.

## 🔗 Links

- [Scrapy Documentation](https://docs.scrapy.org/)
- [Playwright Documentation](https://playwright.dev/python/)
- [Turso Documentation](https://docs.turso.tech/)
- [ScrapeOps](https://scrapeops.io/)