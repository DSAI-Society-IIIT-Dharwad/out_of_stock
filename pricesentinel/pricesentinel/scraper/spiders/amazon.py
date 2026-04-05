"""
AmazonBearingSpider — upgraded with:
  - FBA detection from merchant-info text (from amazon_bearing_monitor)
  - Block/CAPTCHA detection heuristics (from amazon_bearing_monitor)
  - ASIN deduplication per geo (from amazon_bearing_monitor)
  - AOD offer overlay parsing (from amazon_bearing_monitor)
  - Offer listing page pagination (from amazon_bearing_monitor)
  - Geo cookie headers (from amazon_bearing_monitor)
  - Playwright stealth + resource blocking (pricesentinel1 — kept)
  - 36-location coverage (pricesentinel1 — kept)
  - ASIN-direct mode + item limit (pricesentinel1 — kept)
"""
import re
import hashlib
import scrapy
from scrapy_playwright.page import PageMethod
from datetime import datetime
from pricesentinel.scraper.items import BearingPriceItem, OfferItem

BEARING_MODELS = [
    "6205", "6206", "6207", "6208", "6209", "6210",
    "6305", "6306", "6307", "6308", "6309", "6310",
    "22205", "22206", "22207", "22208", "22209",
    "NU205", "NU206", "NU207", "NU208", "NU209",
    "7205", "7206", "7207", "7208", "7209",
]

GEO_LOCATIONS = [
    {"location": "mumbai",             "state": "Maharashtra",           "pin_code": "400001", "region": "west"},
    {"location": "delhi",              "state": "Delhi (UT)",            "pin_code": "110001", "region": "north"},
    {"location": "bangalore",          "state": "Karnataka",             "pin_code": "560001", "region": "south"},
    {"location": "hyderabad",          "state": "Telangana",             "pin_code": "500001", "region": "south"},
    {"location": "chennai",            "state": "Tamil Nadu",            "pin_code": "600001", "region": "south"},
    {"location": "kolkata",            "state": "West Bengal",           "pin_code": "700001", "region": "east"},
    {"location": "ahmedabad",          "state": "Gujarat",               "pin_code": "380001", "region": "west"},
    {"location": "jaipur",             "state": "Rajasthan",             "pin_code": "302001", "region": "north"},
    {"location": "lucknow",            "state": "Uttar Pradesh",         "pin_code": "226001", "region": "north"},
    {"location": "bhopal",             "state": "Madhya Pradesh",        "pin_code": "462001", "region": "central"},
    {"location": "patna",              "state": "Bihar",                 "pin_code": "800001", "region": "east"},
    {"location": "chandigarh",         "state": "Punjab",                "pin_code": "160001", "region": "north"},
    {"location": "bhubaneswar",        "state": "Odisha",                "pin_code": "751001", "region": "east"},
    {"location": "guwahati",           "state": "Assam",                 "pin_code": "781001", "region": "northeast"},
    {"location": "ranchi",             "state": "Jharkhand",             "pin_code": "834001", "region": "east"},
    {"location": "raipur",             "state": "Chhattisgarh",          "pin_code": "492001", "region": "central"},
    {"location": "dehradun",           "state": "Uttarakhand",           "pin_code": "248001", "region": "north"},
    {"location": "shimla",             "state": "Himachal Pradesh",      "pin_code": "171001", "region": "north"},
    {"location": "srinagar",           "state": "Jammu & Kashmir (UT)",  "pin_code": "190001", "region": "north"},
    {"location": "jammu",              "state": "Jammu (J&K UT)",        "pin_code": "180001", "region": "north"},
    {"location": "thiruvananthapuram", "state": "Kerala",                "pin_code": "695001", "region": "south"},
    {"location": "visakhapatnam",      "state": "Andhra Pradesh",        "pin_code": "530001", "region": "south"},
    {"location": "agartala",           "state": "Tripura",               "pin_code": "799001", "region": "northeast"},
    {"location": "aizawl",             "state": "Mizoram",               "pin_code": "796001", "region": "northeast"},
    {"location": "kohima",             "state": "Nagaland",              "pin_code": "797001", "region": "northeast"},
    {"location": "imphal",             "state": "Manipur",               "pin_code": "795001", "region": "northeast"},
    {"location": "shillong",           "state": "Meghalaya",             "pin_code": "793001", "region": "northeast"},
    {"location": "gangtok",            "state": "Sikkim",                "pin_code": "737101", "region": "northeast"},
    {"location": "itanagar",           "state": "Arunachal Pradesh",     "pin_code": "791111", "region": "northeast"},
    {"location": "panaji",             "state": "Goa",                   "pin_code": "403001", "region": "west"},
    {"location": "haryana_gurugram",   "state": "Haryana",               "pin_code": "122001", "region": "north"},
    {"location": "puducherry",         "state": "Puducherry (UT)",       "pin_code": "605001", "region": "south"},
    {"location": "port_blair",         "state": "Andaman & Nicobar (UT)","pin_code": "744101", "region": "island"},
    {"location": "daman",              "state": "Dadra & Daman (UT)",    "pin_code": "396210", "region": "west"},
    {"location": "kavaratti",          "state": "Lakshadweep (UT)",      "pin_code": "682555", "region": "island"},
    {"location": "leh",                "state": "Ladakh (UT)",           "pin_code": "194101", "region": "north"},
]

# Block detection signals (from amazon_bearing_monitor)
_BLOCK_SIGNALS = [
    "api-services-support@amazon.com",
    "Enter the characters you see below",
    "Sorry, we just need to make sure you're not a robot",
    "To discuss automated access to Amazon data",
    "Type the characters you see in this image",
    "Robot Check",
]


def _parse_price(raw: str):
    if not raw:
        return None
    cleaned = re.sub(r"[^\d.]", "", str(raw).replace(",", ""))
    try:
        return float(cleaned)
    except ValueError:
        return None


def _set_pincode_js(pincode: str) -> str:
    return f"""
    () => {{
        document.cookie = 'pincode={pincode}; domain=.amazon.in; path=/';
        document.cookie = 'GLUXLastSelectedDeliveryAddress=%7B%22postalCode%22%3A%22{pincode}%22%7D; domain=.amazon.in; path=/';
    }}
    """


def _geo_headers(geo: dict) -> dict:
    """Attach pin-code context via cookie header (from amazon_bearing_monitor)."""
    return {
        "Cookie": (
            f"i18n-prefs=INR; "
            f"lc-acbin=en_IN; "
            f"GLUXCountryCookie={{\"country\":\"IN\",\"stateOrRegion\":\"\","
            f"\"zipCode\":\"{geo['pin_code']}\"}}"
        )
    }


def _is_blocked(response) -> bool:
    """Heuristic CAPTCHA/block check (from amazon_bearing_monitor)."""
    body = response.text
    return any(signal in body for signal in _BLOCK_SIGNALS)


class AmazonBearingSpider(scrapy.Spider):
    name = "amazon_bearing"
    allowed_domains = ["amazon.in"]

    custom_settings = {
        'CONCURRENT_REQUESTS': 8,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 8,
        'DOWNLOAD_DELAY': 0.5,
        'RANDOMIZE_DOWNLOAD_DELAY': 0.3,
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 0.5,
        'AUTOTHROTTLE_MAX_DELAY': 10,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 6.0,
        'AUTOTHROTTLE_DEBUG': False,
        'RETRY_HTTP_CODES': [500, 502, 504],
        'RETRY_TIMES': 1,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.models = kwargs.get('models', '').split(',') if kwargs.get('models') else BEARING_MODELS
        self.product = kwargs.get('product', '').strip()
        self.item_limit = int(kwargs.get('limit', 100))
        self.top_n = int(kwargs.get('top_n', 5))
        self.asin_direct = kwargs.get('asin', '').strip().upper()
        self.model_hint = kwargs.get('model', '').strip()
        self.items_scraped = 0
        self._requests_in_flight = 0
        # ASIN deduplication per geo (from amazon_bearing_monitor)
        self._seen: set[str] = set()

        if kwargs.get('locations'):
            self.geo_locations = [g for g in GEO_LOCATIONS if g['location'] in kwargs['locations'].split(',')]
        else:
            self.geo_locations = GEO_LOCATIONS

        if self.asin_direct:
            self.logger.info(f"ASIN-direct mode: {self.asin_direct} across {len(self.geo_locations)} cities")
        else:
            self.logger.info(f"Search mode: {len(self.models)} models × {len(self.geo_locations)} cities")

    def _limit_reached(self):
        return (self.items_scraped + self._requests_in_flight) >= self.item_limit

    def start_requests(self):
        if self.asin_direct:
            for geo in self.geo_locations:
                if self._limit_reached():
                    return
                self._requests_in_flight += 1
                yield scrapy.Request(
                    url=f"https://www.amazon.in/dp/{self.asin_direct}",
                    callback=self.parse_product,
                    meta={
                        "model": self.model_hint or "",
                        "location": geo["location"],
                        "state": geo.get("state", ""),
                        "pin_code": geo["pin_code"],
                        "region": geo.get("region", ""),
                        "asin": self.asin_direct,
                        "search_price": "",
                        "search_seller": "",
                        "playwright": True,
                        "playwright_context": geo["pin_code"],
                        "playwright_context_kwargs": {"storage_state": None},
                        "playwright_page_methods": [
                            PageMethod("evaluate", _set_pincode_js(geo["pin_code"])),
                            PageMethod("wait_for_selector", "#productTitle", timeout=15000),
                            PageMethod("wait_for_timeout", 1500),
                        ],
                    },
                    headers=_geo_headers(geo),
                    dont_filter=True,
                )
            return

        for model in self.models:
            for geo in self.geo_locations:
                if self.items_scraped >= self.item_limit:
                    return
                query = self.product if self.product else f"SKF bearing {model}"
                url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}"
                yield scrapy.Request(
                    url=url,
                    callback=self.parse_search,
                    meta={
                        "model": model,
                        "location": geo["location"],
                        "state": geo.get("state", ""),
                        "pin_code": geo["pin_code"],
                        "region": geo.get("region", ""),
                        "playwright": True,
                        "playwright_page_methods": [
                            PageMethod("set_extra_http_headers", {"Accept-Language": "en-IN,en;q=0.9"}),
                            PageMethod("wait_for_selector", "[data-component-type='s-search-result']", timeout=15000),
                        ],
                    },
                    headers=_geo_headers(geo),
                    dont_filter=True,
                )
            if self.product:
                break

    def parse_search(self, response):
        if _is_blocked(response):
            self.logger.warning(f"Possible block on search page: {response.url}")
            return

        model    = response.meta["model"]
        location = response.meta["location"]
        pin_code = response.meta["pin_code"]
        region   = response.meta.get("region", "")

        products = response.css("[data-component-type='s-search-result']")
        self.logger.info(f"Found {len(products)} products for model {model} @ {location}")

        count_this_page = 0
        for product in products:
            if self.items_scraped >= self.item_limit:
                self.logger.info(f"Limit reached ({self.item_limit}), stopping")
                self.crawler.engine.close_spider(self, 'item_limit_reached')
                return
            if count_this_page >= self.top_n:
                break

            asin = product.attrib.get("data-asin", "").strip()
            if not asin or not re.match(r"^B[A-Z0-9]{9}$", asin):
                continue

            # Deduplication per (asin, pin_code) — from amazon_bearing_monitor
            dedup_key = hashlib.md5(f"{asin}:{pin_code}".encode()).hexdigest()
            if dedup_key in self._seen:
                continue
            self._seen.add(dedup_key)

            search_price = (
                product.css(".a-price .a-offscreen::text").get("")
                or product.css(".a-price-whole::text").get("")
            ).strip()
            search_seller = product.css(
                ".a-size-small .a-color-secondary + span::text, "
                "[data-cy='secondary-offer-recipe'] .a-color-base::text"
            ).get("").strip()

            count_this_page += 1
            self._requests_in_flight += 1
            yield scrapy.Request(
                url=f"https://www.amazon.in/dp/{asin}",
                callback=self.parse_product,
                meta={
                    "model": model,
                    "location": location,
                    "state": response.meta.get("state", ""),
                    "pin_code": pin_code,
                    "region": region,
                    "asin": asin,
                    "search_price": search_price,
                    "search_seller": search_seller,
                    "playwright": True,
                    "playwright_page_methods": [
                        PageMethod("wait_for_selector", "#productTitle", timeout=15000),
                        PageMethod("wait_for_timeout", 2000),
                    ],
                },
                headers=_geo_headers({"pin_code": pin_code}),
            )

        # Pagination — up to page 3 (from amazon_bearing_monitor)
        current_page = int(response.meta.get("page", 1))
        if current_page < 3:
            next_page = response.css("a.s-pagination-next::attr(href)").get()
            if next_page:
                yield response.follow(
                    next_page,
                    callback=self.parse_search,
                    meta={**response.meta, "page": current_page + 1},
                    headers=_geo_headers({"pin_code": pin_code}),
                )

    def parse_product(self, response):
        if _is_blocked(response):
            self.logger.warning(f"Possible block on product page: {response.url}")
            return

        asin  = response.meta["asin"]
        title = response.css("#productTitle::text").get("").strip()

        # Model extraction
        model = response.meta.get("model", "").strip()
        if not model:
            m = re.search(r'\b((?:NU|NJ|NF|N|22|23|32|33)?[0-9]{3,4}(?:[A-Z]{1,4})?)\b', title.upper())
            model = m.group(1) if m else asin

        # Brand + category (from amazon_bearing_monitor)
        brand = (
            response.css("#bylineInfo::text").get("").strip()
            or response.css("a#bylineInfo::text").get("").strip()
        )
        category = " > ".join(
            response.css("#wayfinding-breadcrumbs_feature_div li span.a-list-item a::text").getall()
        ).strip()

        # Rating + reviews (from amazon_bearing_monitor)
        rating_raw = response.css(
            "span[data-hook='rating-out-of-text']::text, span.a-icon-alt::text"
        ).get("")
        rating = _parse_price(rating_raw.split()[0]) if rating_raw else None

        review_raw = response.css(
            "#acrCustomerReviewText::text, span[data-hook='total-review-count']::text"
        ).get("")
        review_count = int(_parse_price(review_raw)) if review_raw else None

        # Buy Box seller
        buybox_seller = (
            response.css("[offer-display-feature-name='desktop-merchant-info'] .offer-display-feature-text-message a::text").get("")
            or response.css("[offer-display-feature-name='desktop-merchant-info'] .offer-display-feature-text-message::text").get("")
            or response.css("#sellerProfileTriggerId::text").get("")
            or response.css("#merchant-info a::text").get("")
        ).strip()
        if not buybox_seller or buybox_seller.startswith("₹") or re.match(r'^[\d,\.]+$', buybox_seller):
            buybox_seller = response.meta.get("search_seller", "")

        # Buy Box price
        price_whole = (
            response.css(".priceToPay .a-price-whole::text").get("")
            or response.css("#corePriceDisplay_desktop_feature_div .a-price-whole::text").get("")
            or response.css("#apex_desktop .a-price-whole::text").get("")
            or response.css("span.a-price.aok-align-center span.a-offscreen::text").get("")
            or response.css("#priceblock_ourprice::text").get("")
        ).strip().replace(",", "")
        price_fraction = (
            response.css(".priceToPay .a-price-fraction::text").get("")
            or response.css("#corePriceDisplay_desktop_feature_div .a-price-fraction::text").get("")
        ).strip()

        if price_whole and re.match(r'^\d+$', price_whole):
            buybox_price = f"{price_whole}.{price_fraction}" if price_fraction else price_whole
        else:
            raw = response.meta.get("search_price", "0")
            buybox_price = re.sub(r"[^\d.]", "", raw) or "0"

        # Ships from
        ships_from = (
            response.css("[offer-display-feature-name='desktop-fulfiller-info'] .offer-display-feature-text-message::text").get("")
            or response.css("[offer-display-feature-name='desktop-fulfiller-info'] a::text").get("")
        ).strip()

        # FBA detection from merchant-info text (from amazon_bearing_monitor)
        merchant_info = response.css("#merchant-info").get("") or ""
        buybox_is_fba = (
            "fulfilled by amazon" in merchant_info.lower()
            or "Amazon" in ships_from
        )

        # Collect inline offers (from amazon_bearing_monitor)
        seller_offers = list(self._parse_inline_offers(response, asin, response.meta))

        item = BearingPriceItem(
            asin=asin,
            model=model,
            title=title,
            brand=brand,
            category=category,
            rating=rating,
            review_count=review_count,
            location=response.meta["location"],
            state=response.meta.get("state", ""),
            pin_code=response.meta["pin_code"],
            region=response.meta.get("region", ""),
            buybox_seller=buybox_seller,
            buybox_price=buybox_price,
            buybox_is_fba=buybox_is_fba,
            ships_from=ships_from,
            seller_location="",
            all_sellers=[],
            seller_offers=seller_offers,
            scraped_at=datetime.utcnow().isoformat(),
        )
        self._requests_in_flight -= 1
        self.items_scraped += 1
        self.logger.info(
            f"[{self.items_scraped}/{self.item_limit}] {model} @ {response.meta['location']} | "
            f"{asin} | {buybox_seller} | {buybox_price} | FBA={buybox_is_fba}"
        )
        yield item

        # Yield individual OfferItems for the offers table
        for offer in seller_offers:
            yield offer

        # Try offers listing page (from amazon_bearing_monitor)
        offers_url = response.css(
            "a[href*='/gp/offer-listing/']::attr(href),"
            "a[href*='/dp/olp/']::attr(href)"
        ).get()
        if offers_url:
            yield response.follow(
                offers_url,
                callback=self.parse_offers,
                meta={
                    "asin": asin,
                    "location": response.meta["location"],
                    "state": response.meta.get("state", ""),
                    "pin_code": response.meta["pin_code"],
                    "region": response.meta.get("region", ""),
                },
                headers=_geo_headers({"pin_code": response.meta["pin_code"]}),
            )

    def parse_offers(self, response):
        """Parse /gp/offer-listing/ page (from amazon_bearing_monitor)."""
        if _is_blocked(response):
            self.logger.warning(f"Possible block on offers page: {response.url}")
            return

        yield from self._parse_inline_offers(response, response.meta["asin"], response.meta)

        # Pagination on offers page
        next_page = response.css("ul.a-pagination li.a-last a::attr(href)").get()
        if next_page:
            yield response.follow(
                next_page,
                callback=self.parse_offers,
                meta=response.meta,
                headers=_geo_headers({"pin_code": response.meta["pin_code"]}),
            )

    def _parse_inline_offers(self, response, asin, meta):
        """
        Parse offer rows from product page or offer-listing page.
        Works on both classic olpOffer rows and newer AOD overlay divs.
        From amazon_bearing_monitor.
        """
        offer_rows = response.css(
            "div.olpOffer,"
            "div[id^='aod-offer'],"
            "div.a-section.a-spacing-none.aok-relative"
        )

        for row in offer_rows:
            seller_name = (
                row.css("span.a-size-small.mbcMerchantName::text").get("").strip()
                or row.css("a.a-size-small.a-link-normal::text").get("").strip()
                or row.css("[id*='soldBy'] a::text").get("").strip()
            )
            if not seller_name:
                continue

            price_raw    = (
                row.css("span.a-price .a-offscreen::text").get()
                or row.css("span.olpOfferPrice::text").get()
            )
            shipping_raw = (
                row.css("span.olpShippingPrice::text").get()
                or row.css("span.a-color-secondary::text").get()
            )
            fba_text = (
                row.css("span.olpFbaPopoverTrigger::text").get("")
                + row.css("span.a-color-secondary::text").get("")
            )
            is_fba = "amazon" in fba_text.lower() and "fulfil" in fba_text.lower()

            rating_raw = row.css("span.a-icon-alt::text, b.a-color-base::text").get("")
            seller_rating = _parse_price(rating_raw.split()[0]) if rating_raw else None

            yield OfferItem(
                asin=asin,
                seller_name=seller_name,
                seller_price=_parse_price(price_raw),
                shipping_price=_parse_price(shipping_raw),
                is_fba=is_fba,
                seller_rating=seller_rating,
                location=meta.get("location", ""),
                pin_code=meta.get("pin_code", ""),
                region=meta.get("region", ""),
                scraped_at=datetime.utcnow().isoformat(),
            )
