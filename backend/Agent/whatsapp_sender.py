import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend directory (parent of Agent)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# WasenderAPI configuration
WASENDER_API_KEY = os.getenv("WASENDER_API_KEY")
WASENDER_BASE_URL = os.getenv("WASENDER_BASE_URL")


def sendWhatsAppText(number: str, message: str) -> dict:
    """Send WhatsApp text message via WasenderAPI."""
    if not WASENDER_API_KEY or not WASENDER_BASE_URL:
        return {"success": False, "error": "WasenderAPI not configured"}
    
    # Remove whatsapp: prefix if present
    recipient = number.replace("whatsapp:", "") if number.startswith("whatsapp:") else number
    
    try:
        response = requests.post(
            f"{WASENDER_BASE_URL}/api/send-message",
            headers={
                "Authorization": f"Bearer {WASENDER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "to": recipient,
                "text": message
            }
        )
        
        if response.status_code == 200:
            return {"success": True, "response": response.json()}
        else:
            return {"success": False, "error": f"{response.status_code} - {response.text}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


def sendWhatsAppAudio(number: str, audioUrl: str) -> dict:
    """Send WhatsApp audio message via WasenderAPI."""
    if not WASENDER_API_KEY or not WASENDER_BASE_URL:
        return {"success": False, "error": "WasenderAPI not configured"}
    
    # Remove whatsapp: and + prefixes if present, as API expects just the number
    recipient = number.replace("whatsapp:", "").replace("+", "")
    
    try:
        response = requests.post(
            "https://api.wasenderapi.com/send-audio",
            headers={
                "Authorization": f"Bearer {WASENDER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "to": recipient,
                "audioUrl": audioUrl
            }
        )
        
        if response.status_code == 200:
            return {"success": True, "response": response.json()}
        else:
            return {"success": False, "error": f"{response.status_code} - {response.text}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


# Legacy function aliases for backward compatibility
def send_whatsapp(to_number: str, message: str) -> dict:
    """Legacy function - use sendWhatsAppText instead."""
    return sendWhatsAppText(to_number, message)


def send_whatsapp_audio(to_number: str, audio_url: str) -> dict:
    """Legacy function - use sendWhatsAppAudio instead."""
    return sendWhatsAppAudio(to_number, audio_url)
