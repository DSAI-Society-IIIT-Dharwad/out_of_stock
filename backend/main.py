import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from db.session import init_db
import scheduler as sched
from routers import asins, prices, buybox, sellers, alerts, suggest, scrape, geo, ml, analytics
from routers import auth as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    sched.start_scheduler()
    yield
    sched.stop_scheduler()


app = FastAPI(
    title="PriceSentinel API",
    version="1.0.0",
    description="Real-time price intelligence for industrial bearing distributors on Amazon India",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(asins.router,      prefix=PREFIX)
app.include_router(prices.router,     prefix=PREFIX)
app.include_router(buybox.router,     prefix=PREFIX)
app.include_router(sellers.router,    prefix=PREFIX)
app.include_router(alerts.router,     prefix=PREFIX)
app.include_router(suggest.router,    prefix=PREFIX)
app.include_router(scrape.router,     prefix=PREFIX)
app.include_router(geo.router,        prefix=PREFIX)
app.include_router(ml.router,         prefix=PREFIX)
app.include_router(analytics.router,  prefix=PREFIX)  # from amazon_bearing_monitor
app.include_router(auth_router.router, prefix=PREFIX)


@app.get("/")
def root():
    return {"service": "PriceSentinel API", "docs": "/docs", "version": "1.0.0"}


@app.get("/api/v1/status")
def status():
    from db.turso_client import get_turso_client
    t = get_turso_client()
    db_ok = False
    row_count = 0
    if t:
        try:
            row_count = int(t.query_rows("SELECT COUNT(*) as cnt FROM price_records")[0]["cnt"])
            db_ok = True
        except Exception:
            pass
    return {
        "api": "ok",
        "db": "turso" if db_ok else "error",
        "price_records": row_count,
        "scheduler": sched.get_scheduler_status(),
    }
