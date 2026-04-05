from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

from agent import run_agent

alert_data = {
    "model":                   "SKF 6205",
    "asin":                    "B07SKF6205",
    "city":                    "Chennai",
    "competitor_name":         "MechParts Express",
    "competitor_fulfillment":  "FBA",
    "competitor_rating":       4.6,
    "competitor_old_price":    845,
    "competitor_new_price":    833,
    "price_drop":              12,
    "is_new_seller":           True,
    "our_price":               845,
    "our_fulfillment":         "FBA",
    "floor_price":             790,
    "buybox_win_prob":         41,
    "we_own_buybox":           False,
    "price_forecast":          828,
}

phone = os.getenv("MY_WHATSAPP_NUMBER")

print("Starting PriceSentinel agent...")
print("=" * 50)

result = run_agent(alert_data, phone)

print("=" * 50)
print("Agent result:", result)