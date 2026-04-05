"""
ProxyRotationMiddleware — optional proxy pool rotation with failure tracking.
Ported from amazon_bearing_monitor. Falls back to direct connection when pool
is empty or all proxies have exceeded max_failures.

Configure PROXY_POOL in .env as a comma-separated list:
  PROXY_POOL=http://user:pass@proxy1:port,http://user:pass@proxy2:port
"""
import os
import random
import logging

logger = logging.getLogger(__name__)


def _load_pool() -> list[str]:
    raw = os.getenv("PROXY_POOL", "")
    return [p.strip() for p in raw.split(",") if p.strip()]


class ProxyRotationMiddleware:
    """
    Rotate through a proxy pool loaded from PROXY_POOL env var.
    Removes proxies that exceed max_failures threshold.
    Falls back to direct connection when pool is exhausted.
    """

    def __init__(self):
        self.proxies: list[str] = _load_pool()
        self.failure_counts: dict[str, int] = {}
        self.max_failures = 3
        if self.proxies:
            logger.info(f"ProxyRotationMiddleware: {len(self.proxies)} proxies loaded")
        else:
            logger.info("ProxyRotationMiddleware: no proxies configured — direct connection")

    @classmethod
    def from_crawler(cls, crawler):
        return cls()

    def process_request(self, request, spider):
        if not self.proxies:
            return  # direct connection
        proxy = random.choice(self.proxies)
        request.meta["proxy"] = proxy
        request.meta["_proxy_used"] = proxy
        logger.debug(f"Using proxy: {proxy}")

    def process_response(self, request, response):
        proxy = request.meta.get("_proxy_used")
        if proxy:
            self.failure_counts[proxy] = 0  # reset on success
        return response

    def process_exception(self, request, exception):
        proxy = request.meta.get("_proxy_used")
        if not proxy:
            return
        self.failure_counts[proxy] = self.failure_counts.get(proxy, 0) + 1
        logger.warning(
            f"Proxy {proxy} failed ({self.failure_counts[proxy]}x): {exception}"
        )
        if self.failure_counts[proxy] >= self.max_failures:
            if proxy in self.proxies:
                self.proxies.remove(proxy)
                logger.warning(
                    f"Removed failing proxy: {proxy}. Pool size: {len(self.proxies)}"
                )
