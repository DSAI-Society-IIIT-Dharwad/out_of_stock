"""WhatsApp alert delivery via WasenderAPI."""
import os
import requests
from dotenv import load_dotenv, find_dotenv


def _cfg():
    """Reload .env on every call so changes take effect without restart."""
    load_dotenv(find_dotenv(), override=True)
    return {
        "api_key": os.getenv("WASENDER_API_KEY", ""),
        "base_url": os.getenv("WASENDER_BASE_URL", ""),
        "to": os.getenv("DEFAULT_WHATSAPP_TO", ""),
    }


def _format_to(mobile: str) -> str:
    """Format phone number - remove whatsapp: prefix if present."""
    mobile = mobile.strip()
    return mobile.replace("whatsapp:", "") if mobile.startswith("whatsapp:") else mobile


def sendWhatsAppText(number: str, message: str) -> bool:
    """Send WhatsApp text message via WasenderAPI."""
    cfg = _cfg()
    
    if not cfg["api_key"] or not cfg["base_url"]:
        print(f"[ALERT] WasenderAPI not configured — message: {message}")
        return False

    recipient = _format_to(number)
    print(f"[ALERT] Sending WhatsApp text to {recipient}")
    
    try:
        response = requests.post(
            f"{cfg['base_url']}/api/send-message",
            headers={
                "Authorization": f"Bearer {cfg['api_key']}",
                "Content-Type": "application/json"
            },
            json={
                "to": recipient,
                "text": message
            }
        )
        
        if response.status_code == 200:
            print(f"[ALERT] ✅ WhatsApp text sent to {recipient}")
            return True
        else:
            print(f"[ALERT] WhatsApp text failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"[ALERT] WhatsApp text failed: {e}")
        return False


def sendWhatsAppAudio(number: str, audioUrl: str) -> bool:
    """Send WhatsApp audio message via WasenderAPI."""
    cfg = _cfg()
    
    if not cfg["api_key"] or not cfg["base_url"]:
        print(f"[ALERT] WasenderAPI not configured — audio: {audioUrl}")
        return False

    recipient = _format_to(number)
    print(f"[ALERT] Sending WhatsApp audio to {recipient}")
    
    try:
        response = requests.post(
            f"{cfg['base_url']}/api/send-message",
            headers={
                "Authorization": f"Bearer {cfg['api_key']}",
                "Content-Type": "application/json"
            },
            json={
                "to": recipient,
                "audio_url": audioUrl
            }
        )
        
        if response.status_code == 200:
            print(f"[ALERT] ✅ WhatsApp audio sent to {recipient}")
            return True
        else:
            print(f"[ALERT] WhatsApp audio failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"[ALERT] WhatsApp audio failed: {e}")
        return False


def send_whatsapp_alert(message: str, to: str = "") -> bool:
    """Legacy function - maintains existing interface."""
    if not to:
        print(f"[ALERT] No recipient specified — message: {message}")
        return False
    
    return sendWhatsAppText(to, f"🔔 PriceSentinel\n{message}")
