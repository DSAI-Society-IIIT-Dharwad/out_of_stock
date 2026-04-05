from sqlalchemy import Column, String, Float, JSON, DateTime, Integer, Boolean, Text
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()


class PriceRecord(Base):
    __tablename__ = "price_records"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    asin            = Column(String, nullable=False, index=True)
    model           = Column(String)
    title           = Column(String)
    # Product metadata (from amazon_bearing_monitor)
    brand           = Column(String)
    category        = Column(String)
    rating          = Column(Float)
    review_count    = Column(Integer)
    location        = Column(String)
    state           = Column(String)
    pin_code        = Column(String)
    region          = Column(String, index=True)   # from amazon_bearing_monitor
    buybox_seller   = Column(String)
    buybox_price    = Column(Float)
    buybox_is_fba   = Column(Boolean, default=False)  # from amazon_bearing_monitor
    ships_from      = Column(String)
    seller_location = Column(String)
    all_sellers     = Column(JSON)
    scraped_at      = Column(DateTime, default=datetime.utcnow, index=True)


class OfferRecord(Base):
    """Individual seller offer row — from amazon_bearing_monitor."""
    __tablename__ = "offers"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    asin          = Column(String, nullable=False, index=True)
    seller_name   = Column(String)
    seller_price  = Column(Float)
    shipping_price = Column(Float)
    is_fba        = Column(Boolean, default=False)
    seller_rating = Column(Float)
    location      = Column(String)
    pin_code      = Column(String)
    region        = Column(String)
    scraped_at    = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    type          = Column(String, nullable=False)
    asin          = Column(String, nullable=False, index=True)
    model         = Column(String)
    location      = Column(String)
    message       = Column(Text)
    old_price     = Column(Float, nullable=True)
    new_price     = Column(Float, nullable=True)
    delta_percent = Column(Float, nullable=True)
    old_seller    = Column(String, nullable=True)
    new_seller    = Column(String, nullable=True)
    drop_count    = Column(Integer, nullable=True)
    spike_percent = Column(Float, nullable=True)
    whatsapp_sent = Column(Boolean, default=False)
    fired_at      = Column(DateTime, default=datetime.utcnow)
