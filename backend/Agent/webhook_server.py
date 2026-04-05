"""
WasenderAPI WhatsApp webhook server with built-in ngrok tunnel.
Run: python webhook_server.py
It will print the public URL — use for serving audio files to WasenderAPI.
"""

from flask import Flask, request, send_from_directory
import threading
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = Flask(__name__)

_PENDING_FILE = Path(__file__).parent / "pending_replies.json"
_lock = threading.Lock()
_BASE_DIR = Path(__file__).parent


def _load() -> dict:
    if _PENDING_FILE.exists():
        with open(_PENDING_FILE, "r") as f:
            return json.load(f)
    return {}


def _save(data: dict):
    with open(_PENDING_FILE, "w") as f:
        json.dump(data, f)


@app.route("/webhook", methods=["POST"])
def webhook():
    from_number = request.form.get("From", "").replace("whatsapp:", "")
    body = request.form.get("Body", "").strip()

    # Handle LANG change command directly in webhook
    if body.upper() == "LANG":
        _handle_lang_command(from_number)
        return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {"Content-Type": "text/xml"}

    with _lock:
        data = _load()
        data[from_number] = body
        _save(data)
    print(f"[Webhook] Reply from {from_number}: '{body}'")
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {"Content-Type": "text/xml"}


def _handle_lang_command(phone_number: str):
    """Send language menu and wait for selection in a background thread."""
    from whatsapp_sender import send_whatsapp as _send

    LANGUAGE_PROMPT = (
        "🌐 *PriceSentinel* — Choose your preferred language:\n\n"
        "1️⃣ Hindi\n2️⃣ Tamil\n3️⃣ Telugu\n4️⃣ Kannada\n"
        "5️⃣ Marathi\n6️⃣ Bengali\n7️⃣ Gujarati\n8️⃣ English\n\n"
        "_Reply with the number of your choice_"
    )
    SUPPORTED = {
        "1": ("hi", "Hindi"), "2": ("ta", "Tamil"), "3": ("te", "Telugu"),
        "4": ("kn", "Kannada"), "5": ("mr", "Marathi"), "6": ("bn", "Bengali"),
        "7": ("gu", "Gujarati"), "8": ("en", "English"),
    }

    def _process():
        import json, time
        from pathlib import Path
        _send(phone_number, LANGUAGE_PROMPT)
        clear_reply(phone_number)
        deadline = time.time() + 120
        while time.time() < deadline:
            reply = get_reply(phone_number)
            if reply and reply.strip() in SUPPORTED:
                lang_code, lang_name = SUPPORTED[reply.strip()]
                # Save preference
                prefs_file = Path(__file__).parent / "language_preferences.json"
                prefs = {}
                if prefs_file.exists():
                    with open(prefs_file) as f:
                        prefs = json.load(f)
                prefs[phone_number] = lang_code
                with open(prefs_file, "w") as f:
                    json.dump(prefs, f, ensure_ascii=False, indent=2)
                _send(phone_number, f"✅ Language updated to *{lang_name}*. Your next alert will be in {lang_name}.")
                print(f"[Webhook] Language changed for {phone_number} → {lang_name}")
                return
            elif reply:
                _send(phone_number, f"❌ Invalid choice. Please reply with a number 1–8.")
                clear_reply(phone_number)
            time.sleep(3)
        _send(phone_number, "⏱ No response received. Language unchanged.")

    threading.Thread(target=_process, daemon=True).start()


@app.route("/audio/<filename>")
def serve_audio(filename):
    """Serve generated mp3 files so WasenderAPI can fetch them."""
    response = send_from_directory(_BASE_DIR, filename, mimetype="audio/mpeg")
    response.headers["ngrok-skip-browser-warning"] = "true"
    return response


def get_reply(phone_number: str) -> str | None:
    """Return and clear the latest reply for a phone number."""
    with _lock:
        data = _load()
        reply = data.pop(phone_number, None)
        _save(data)
    return reply


def clear_reply(phone_number: str):
    with _lock:
        data = _load()
        data.pop(phone_number, None)
        _save(data)


def start_server():
    """Start Flask + ngrok tunnel. Returns the public base URL."""
    from pyngrok import ngrok, conf

    ngrok_token = os.getenv("NGROK_AUTH_TOKEN")
    if ngrok_token:
        conf.get_default().auth_token = ngrok_token

    tunnel = ngrok.connect(5000, "http")
    public_url = tunnel.public_url

    print(f"\n{'='*55}")
    print(f"  Webhook server running!")
    print(f"  Webhook URL : {public_url}/webhook")
    print(f"  Audio URL   : {public_url}/audio/<filename>")
    print(f"  → Use audio URL for WasenderAPI media messages")
    print(f"{'='*55}\n")

    # Persist public URL so agent.py can read it at runtime
    url_file = Path(__file__).parent / ".webhook_url"
    url_file.write_text(public_url)

    t = threading.Thread(target=lambda: app.run(port=5000, use_reloader=False), daemon=True)
    t.start()

    return public_url


if __name__ == "__main__":
    start_server()
    print("Press Ctrl+C to stop.\n")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        print("\nShutting down.")
