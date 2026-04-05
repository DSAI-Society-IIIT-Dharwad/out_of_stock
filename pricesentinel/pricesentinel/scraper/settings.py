import os
from dotenv import load_dotenv

load_dotenv()

BOT_NAME = "pricesentinel"
SPIDER_MODULES = ["pricesentinel.scraper.spiders"]
NEWSPIDER_MODULE = "pricesentinel.scraper.spiders"

# Scrapeops
SCRAPEOPS_API_KEY = os.getenv("SCRAPEOPS_API_KEY", "")
SCRAPEOPS_PROXY_ENABLED = True

# Playwright
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}
PLAYWRIGHT_BROWSER_TYPE = "chromium"
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": True,
    "args": [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--disable-extensions",
        "--disable-default-apps",
    ],
    "timeout": 60000,
}
PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT = 90000
PLAYWRIGHT_NAVIGATION_WAIT_UNTIL = "domcontentloaded"
PLAYWRIGHT_CONTEXTS = {
    "default": {
        "java_script_enabled": True,
        "ignore_https_errors": True,
    }
}

# Block only truly non-essential resources — scripts MUST load for price widgets
PLAYWRIGHT_ABORT_REQUEST = lambda req: req.resource_type in {"image", "media", "font", "ping"}

TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
ASYNCIO_EVENT_LOOP = "asyncio.SelectorEventLoop"

# Middlewares
DOWNLOADER_MIDDLEWARES = {
    "pricesentinel.scraper.middlewares.proxy.ScrapeOpsProxyMiddleware": 725,
    # ProxyRotationMiddleware: optional pool rotation with failure tracking (from amazon_bearing_monitor)
    # Activates only when PROXY_POOL env var is set; falls back to direct otherwise.
    "pricesentinel.scraper.middlewares.proxy_rotation.ProxyRotationMiddleware": 100,
    "pricesentinel.scraper.middlewares.useragent.RotateUserAgentMiddleware": 400,
    "scrapy.downloadermiddlewares.retry.RetryMiddleware": 550,
}

# Pipelines
ITEM_PIPELINES = {
    "pricesentinel.scraper.pipelines.PostgresPipeline": 300,
}

# Retry
RETRY_TIMES = 2
RETRY_HTTP_CODES = [500, 502, 504]

# Throttle — spider custom_settings will override these per-run
# These are conservative defaults only
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 15
AUTOTHROTTLE_TARGET_CONCURRENCY = 3.0
CONCURRENT_REQUESTS = 4
CONCURRENT_REQUESTS_PER_DOMAIN = 4
DOWNLOAD_DELAY = 1

# Misc
ROBOTSTXT_OBEY = False
COOKIES_ENABLED = True
DEFAULT_REQUEST_HEADERS = {
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

LOG_LEVEL = "INFO"
FEED_EXPORT_ENCODING = "utf-8"