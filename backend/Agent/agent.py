from langchain_groq import ChatGroq
from dotenv import load_dotenv
from pathlib import Path
import os
import time
import json
import shutil
import threading

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

from tools import tool_assess_threat, tool_recommend_price
from whatsapp_sender import send_whatsapp, send_whatsapp_audio
from tts_engine import generate_audio
from webhook_server import get_reply, clear_reply

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.2,
    api_key=os.getenv("GROQ_API_KEY")
)

AUDIO_HOST_URL = os.getenv("AUDIO_HOST_URL", "").rstrip("/")
REPLY_TIMEOUT  = int(os.getenv("LANG_REPLY_TIMEOUT", "120"))

_PREFS_FILE = Path(__file__).parent / "language_preferences.json"

SUPPORTED_LANGUAGES = {
    "1": ("hi", "Hindi"),
    "2": ("ta", "Tamil"),
    "3": ("te", "Telugu"),
    "4": ("kn", "Kannada"),
    "5": ("mr", "Marathi"),
    "6": ("bn", "Bengali"),
    "7": ("gu", "Gujarati"),
    "8": ("en", "English"),
}

LANGUAGE_PROMPT = (
    "🌐 *PriceSentinel* — Choose your preferred language:\n\n"
    "1️⃣ Hindi\n"
    "2️⃣ Tamil\n"
    "3️⃣ Telugu\n"
    "4️⃣ Kannada\n"
    "5️⃣ Marathi\n"
    "6️⃣ Bengali\n"
    "7️⃣ Gujarati\n"
    "8️⃣ English\n\n"
    "_Reply with the number of your choice_"
)

CHANGE_LANG_FOOTER = "\n\n_Reply *LANG* anytime to change your language preference._"


# ── Language preference store ─────────────────────────────────────────────────

def _load_prefs() -> dict:
    if _PREFS_FILE.exists():
        with open(_PREFS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_prefs(data: dict):
    with open(_PREFS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_stored_language(phone_number: str) -> tuple[str, str] | None:
    """Return (lang_code, lang_name) if stored, else None."""
    prefs = _load_prefs()
    code = prefs.get(phone_number)
    if code:
        # Find name from SUPPORTED_LANGUAGES values
        for _, (lc, ln) in SUPPORTED_LANGUAGES.items():
            if lc == code:
                return lc, ln
    return None


def store_language(phone_number: str, lang_code: str, lang_name: str):
    prefs = _load_prefs()
    prefs[phone_number] = lang_code
    _save_prefs(prefs)
    print(f"[Agent] Saved language preference for {phone_number}: {lang_name}")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_public_url() -> str:
    url_file = Path(__file__).parent / ".webhook_url"
    if url_file.exists():
        url = url_file.read_text().strip().rstrip("/")
        if url.endswith("/webhook"):
            url = url[:-8]
        return url
    return AUDIO_HOST_URL


def _ask_language(phone_number: str) -> tuple[str, str]:
    """Send language menu, wait for reply. Returns (lang_code, lang_name)."""
    clear_reply(phone_number)
    send_whatsapp(phone_number, LANGUAGE_PROMPT)
    print(f"[Agent] Language prompt sent. Waiting up to {REPLY_TIMEOUT}s...")

    deadline = time.time() + REPLY_TIMEOUT
    while time.time() < deadline:
        reply = get_reply(phone_number)
        if reply:
            choice = reply.strip()
            if choice in SUPPORTED_LANGUAGES:
                lang_code, lang_name = SUPPORTED_LANGUAGES[choice]
                store_language(phone_number, lang_code, lang_name)
                print(f"[Agent] Receiver chose: {lang_name}")
                return lang_code, lang_name
            else:
                send_whatsapp(phone_number, f"❌ Invalid choice '{choice}'. Please reply with a number 1–8.")
                clear_reply(phone_number)
        time.sleep(3)

    print("[Agent] No reply — defaulting to English.")
    store_language(phone_number, "en", "English")
    return "en", "English"


def _translate(message: str, lang_code: str, lang_name: str) -> str:
    if lang_code == "en":
        return message
    try:
        prompt = f"""Translate the following WhatsApp alert message to {lang_name}.

Rules:
- Preserve all WhatsApp formatting: *bold*, _italic_, ━━━ separator lines
- Preserve all numbers, prices (₹), percentages, and emojis exactly as-is
- Only translate the words, nothing else
- Return only the translated message, no explanation

Message:
{message}"""
        return llm.invoke(prompt).content.strip()
    except Exception as e:
        print(f"[Translator] Failed: {e}. Falling back to English.")
        return message


def _send_voice(phone_number: str, text: str, lang_code: str) -> str:
    audio_path = generate_audio(text, lang_code)
    if not audio_path:
        return "Voice skipped — TTS generation failed."

    public_url = _get_public_url()
    filename = os.path.basename(audio_path)

    if public_url:
        dest = Path(__file__).parent / filename
        shutil.move(audio_path, dest)
        audio_path = None

        audio_url = f"{public_url}/audio/{filename}"
        print(f"[Agent] Sending voice: {audio_url}")
        v = send_whatsapp_audio(phone_number, audio_url)

        # Cleanup after 5 min — gives WasenderAPI time to fetch
        def _cleanup():
            time.sleep(300)
            try:
                os.remove(dest)
            except Exception:
                pass
        threading.Thread(target=_cleanup, daemon=True).start()

        return f"Voice delivered. SID: {v['sid']}" if v["success"] else f"Voice failed: {v['error']}"
    else:
        local = Path(__file__).parent / f"alert_voice_{phone_number.replace('+','')}.mp3"
        shutil.move(audio_path, local)
        return f"Voice saved locally: {local.name} (start webhook_server.py to send via WhatsApp)"


# ── Main agent ────────────────────────────────────────────────────────────────

def run_agent(alert_data: dict, phone_number: str) -> str:

    # STEP 1 — Threat assessment
    threat = tool_assess_threat.invoke({
        "fulfillment_type": alert_data["competitor_fulfillment"],
        "price_drop":        alert_data["price_drop"],
        "seller_rating":     alert_data["competitor_rating"],
        "is_new_seller":     alert_data["is_new_seller"]
    })

    if "LOW" in str(threat).upper():
        return "No alert sent — threat level too low."

    # STEP 2 — Language: use stored preference or ask first time
    stored = get_stored_language(phone_number)
    if stored:
        lang_code, lang_name = stored
        print(f"[Agent] Using stored language: {lang_name}")
    else:
        lang_code, lang_name = _ask_language(phone_number)

    # STEP 3 — Price recommendation
    recommendation = tool_recommend_price.invoke({
        "our_current_price":      alert_data["our_price"],
        "competitor_new_price":   alert_data["competitor_new_price"],
        "our_fulfillment":        alert_data["our_fulfillment"],
        "competitor_fulfillment": alert_data["competitor_fulfillment"],
        "floor_price":            alert_data["floor_price"],
        "buybox_win_prob":        alert_data["buybox_win_prob"]
    })

    # STEP 4 — Generate English alert
    eng_prompt = f"""You are PriceSentinel.

Write WhatsApp alert exactly in this format:

[EMOJI] *PriceSentinel Alert*
━━━━━━━━━━━━━━━━━━
*{alert_data['model']}* · {alert_data['city']}

{alert_data['competitor_name']} ({alert_data['competitor_fulfillment']}, ⭐{alert_data['competitor_rating']}) dropped to *₹{alert_data['competitor_new_price']}*

One sentence explaining impact.

✅ *Action:* {recommendation}

━━━━━━━━━━━━━━━━━━
_PriceSentinel · {alert_data['city']} Monitor_

Threat level = {threat}

Emoji rules: CRITICAL=🔴 HIGH=🟠 MEDIUM=🟡
Keep under 160 words.
"""
    english_message = llm.invoke(eng_prompt).content.strip()

    # STEP 5 — Translate + append change-language footer
    final_message = _translate(english_message, lang_code, lang_name)
    final_message += CHANGE_LANG_FOOTER

    # STEP 6 — Send text
    text_result = send_whatsapp(phone_number, final_message)
    if not text_result["success"]:
        return f"Text delivery failed: {text_result['error']}"

    # STEP 7 — Send voice (TTS of message without the footer)
    voice_text = _translate(english_message, lang_code, lang_name)  # clean, no footer
    voice_result = _send_voice(phone_number, voice_text, lang_code)

    return (
        f"Language: {lang_name}\n\n"
        f"{final_message}\n\n"
        f"[Text] SID: {text_result['sid']}\n"
        f"[Voice] {voice_result}"
    )
