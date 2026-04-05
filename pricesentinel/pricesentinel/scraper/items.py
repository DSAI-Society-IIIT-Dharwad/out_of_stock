"""
Scrapy Item definitions.
BearingPriceItem — enriched with brand, category, region, buybox_is_fba, seller_offers (from amazon_bearing_monitor).
OfferItem — new, for individual seller offer rows (from amazon_bearing_monitor).
"""
import scrapy


class BearingPriceItem(scrapy.Item):
    # Product identity
    asin            = scrapy.Field()
    model           = scrapy.Field()
    title           = scrapy.Field()
    brand           = scrapy.Field()       # from amazon_bearing_monitor
    category        = scrapy.Field()       # from amazon_bearing_monitor
    rating          = scrapy.Field()       # from amazon_bearing_monitor
    review_count    = scrapy.Field()       # from amazon_bearing_monitor

    # Geo context
    location        = scrapy.Field()
    state           = scrapy.Field()
    pin_code        = scrapy.Field()
    region          = scrapy.Field()       # from amazon_bearing_monitor

    # Buy Box
    buybox_seller   = scrapy.Field()
    buybox_price    = scrapy.Field()
    buybox_is_fba   = scrapy.Field()       # from amazon_bearing_monitor
    ships_from      = scrapy.Field()
    seller_location = scrapy.Field()

    # Offer data
    all_sellers     = scrapy.Field()       # legacy JSON list (kept for compatibility)
    seller_offers   = scrapy.Field()       # list of OfferItem objects (from amazon_bearing_monitor)

    scraped_at      = scrapy.Field()


class OfferItem(scrapy.Item):
    """Individual seller offer row — from amazon_bearing_monitor."""
    asin          = scrapy.Field()
    seller_name   = scrapy.Field()
    seller_price  = scrapy.Field()
    shipping_price = scrapy.Field()
    is_fba        = scrapy.Field()
    seller_rating = scrapy.Field()
    location      = scrapy.Field()
    pin_code      = scrapy.Field()
    region        = scrapy.Field()
    scraped_at    = scrapy.Field()
