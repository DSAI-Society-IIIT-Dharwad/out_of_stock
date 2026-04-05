from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import scheduler as sched

router = APIRouter()


class ScrapeRequest(BaseModel):
    models: List[str] = ["6205", "6206"]
    locations: List[str] = ["chennai", "bangalore", "mumbai"]


class AsinScrapeRequest(BaseModel):
    asin: str
    model: str = ""
    locations: Optional[List[str]] = None


@router.post("/scrape/trigger", status_code=202)
def trigger_scrape(body: ScrapeRequest):
    models_str = ",".join(body.models)
    locations_str = ",".join(body.locations)
    job_id = sched.trigger_now(models_str, locations_str)
    return {
        "status": "accepted",
        "job_id": job_id,
        "message": f"Scrape job triggered for {len(body.models)} models × {len(body.locations)} locations",
    }


@router.post("/scrape/asin", status_code=202)
def scrape_asin(body: AsinScrapeRequest):
    locations_str = ",".join(body.locations) if body.locations else ""
    job_id = sched.trigger_asin(body.asin, locations_str, body.model)
    loc_count = len(body.locations) if body.locations else 36
    return {
        "status": "accepted",
        "job_id": job_id,
        "asin": body.asin,
        "message": f"ASIN scrape triggered for {body.asin} across {loc_count} locations",
    }
