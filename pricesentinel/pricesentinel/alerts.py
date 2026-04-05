"""WhatsApp alert delivery via WasenderAPI — used by the intelligence engine."""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

_API_KEY = os.getenv("WASENDER_API_KEY", "")
_BASE_URL = os.getenv("WASENDER_BASE_URL", "")


def send_whatsapp_alert(message: str, to: str = "") -> bool:
    if not _API_KEY or not _BASE_URL:
        print(f"[ALERT] WasenderAPI not configured — {message}")
        return False
    
    if not to:
        print(f"[ALERT] No recipient specified — {message}")
        return False
    
    # Remove whatsapp: prefix if present
    recipient = to.replace("whatsapp:", "") if to.startswith("whatsapp:") else to
    
    try:
        response = requests.post(
            f"{_BASE_URL}/send-message",
            headers={
                "Authorization": f"Bearer {_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "number": recipient,
                "message": f"🔔 PriceSentinel\n{message}"
            }
        )
        
        if response.status_code == 200:
            print(f"[ALERT] ✅ WhatsApp sent: {message}")
            return True
        else:
            print(f"[ALERT] ❌ WhatsApp failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"[ALERT] ❌ WhatsApp failed: {e}")
        return False
