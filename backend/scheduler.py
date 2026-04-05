"""APScheduler — triggers Scrapy spider every 15 minutes via uv run.
After each scrape completes, triggers ML retraining with a 30-second idle delay.
"""
import subprocess
import os
import sys
import threading
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

# Absolute path to the pricesentinel project (contains scrapy.cfg + .venv)
_SCRAPER_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "pricesentinel")
)

# uv is on PATH; it will use the .venv inside _SCRAPER_DIR automatically
_UV = "uv"

_DEFAULT_MODELS    = "6205,6206,6207,6208,6209,6210"
_DEFAULT_LOCATIONS = "chennai,bangalore,mumbai"

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
_active_jobs: dict = {}


def _run_scrape(models: str = _DEFAULT_MODELS, locations: str = _DEFAULT_LOCATIONS, limit: int = 50) -> int | None:
    print(f"[Scheduler] 🕷  Scrape: models={models} locations={locations} limit={limit}")
    print(f"[Scheduler]    CWD: {_SCRAPER_DIR}")
    try:
        proc = subprocess.Popen(
            [
                _UV, "run", "scrapy", "crawl", "amazon_bearing",
                "-a", f"models={models}",
                "-a", f"locations={locations}",
                "-a", f"limit={limit}",
            ],
            cwd=_SCRAPER_DIR,
        )
        print(f"[Scheduler] ✅ Spider PID {proc.pid}")
        # Wait for scrape to finish then retrain (30s idle to let DB writes settle)
        threading.Thread(target=_wait_and_train, args=(proc,), daemon=True).start()
        return proc.pid
    except FileNotFoundError:
        print(f"[Scheduler] ❌ 'uv' not found on PATH — trying direct scrapy")
        _run_scrape_direct(models, locations, limit)
    except Exception as e:
        print(f"[Scheduler] ❌ Failed: {e}")
    return None


def _wait_and_train(proc: subprocess.Popen):
    """Wait for scrape process to finish, idle 30s, then retrain the ML model."""
    try:
        proc.wait()
        print("[Scheduler] 🧠 Scrape done — scheduling ML retrain in 30s")
        from routers.ml import run_training_async
        run_training_async(delay_seconds=30)
    except Exception as e:
        print(f"[Scheduler] ❌ Post-scrape train failed: {e}")


def _run_scrape_direct(models: str, locations: str, limit: int):
    """Fallback: use the venv python directly."""
    venv_py = os.path.join(_SCRAPER_DIR, ".venv", "Scripts", "python.exe")
    if not os.path.exists(venv_py):
        venv_py = os.path.join(_SCRAPER_DIR, ".venv", "bin", "python")
    if not os.path.exists(venv_py):
        venv_py = sys.executable
    subprocess.Popen(
        [venv_py, "-m", "scrapy", "crawl", "amazon_bearing",
         "-a", f"models={models}", "-a", f"locations={locations}", "-a", f"limit={limit}"],
        cwd=_SCRAPER_DIR,
    )


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            _run_scrape, "interval", minutes=15,
            id="scrape_job", replace_existing=True,
            kwargs={"models": _DEFAULT_MODELS, "locations": _DEFAULT_LOCATIONS},
        )
        scheduler.start()
        print(f"✅ Scheduler started — every 15 min · scraper dir: {_SCRAPER_DIR}")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)


def trigger_now(models: str = _DEFAULT_MODELS, locations: str = _DEFAULT_LOCATIONS) -> str:
    job_id = f"scrape_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    pid = _run_scrape(models, locations)
    _active_jobs[job_id] = pid
    return job_id


def trigger_asin(asin: str, locations: str = "", model: str = "") -> str:
    """Scrape a specific ASIN across all (or given) locations using ASIN-direct mode."""
    job_id = f"asin_{asin}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    print(f"[Scheduler] 🎯 ASIN-direct scrape: {asin} model={model or '?'} locations={locations or 'all'}")
    try:
        cmd = [
            _UV, "run", "scrapy", "crawl", "amazon_bearing",
            "-a", f"asin={asin}",
            "-a", f"limit=36",
        ]
        if model:
            cmd += ["-a", f"model={model}"]
        if locations:
            cmd += ["-a", f"locations={locations}"]
        proc = subprocess.Popen(cmd, cwd=_SCRAPER_DIR)
        print(f"[Scheduler] ✅ ASIN spider PID {proc.pid}")
        _active_jobs[job_id] = proc.pid
    except Exception as e:
        print(f"[Scheduler] ❌ ASIN scrape failed: {e}")
    return job_id


def get_scheduler_status() -> dict:
    jobs = [
        {"id": j.id, "next_run": j.next_run_time.isoformat() if j.next_run_time else None}
        for j in scheduler.get_jobs()
    ]
    return {
        "running": scheduler.running,
        "scraper_dir": _SCRAPER_DIR,
        "scraper_dir_exists": os.path.exists(_SCRAPER_DIR),
        "jobs": jobs,
    }
