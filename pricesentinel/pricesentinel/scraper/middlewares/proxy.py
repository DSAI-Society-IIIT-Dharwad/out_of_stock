import os

class ScrapeOpsProxyMiddleware:
    def __init__(self):
        self.api_key = os.getenv("SCRAPEOPS_API_KEY", "")

    @classmethod
    def from_crawler(cls, crawler):
        return cls()

    def process_request(self, request, spider):
        if not self.api_key:
            return

        # Skip if already proxied
        if request.meta.get("proxied"):
            return

        # Build ScrapeOps proxy URL
        target = request.url
        proxy_url = (
            f"https://proxy.scrapeops.io/v1/"
            f"?api_key={self.api_key}"
            f"&url={target}"
            f"&country=in"
            f"&residential=true"
            f"&render_js=false"  # Playwright handles JS, not proxy
        )

        request.meta["proxied"] = True
        spider.logger.debug(f"Proxying: {target}")