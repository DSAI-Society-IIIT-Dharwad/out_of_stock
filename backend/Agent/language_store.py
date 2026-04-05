import json
import os
from pathlib import Path

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
}

_STORE_PATH = Path(__file__).parent / "language_preferences.json"


def _load() -> dict:
    if _STORE_PATH.exists():
        with open(_STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save(data: dict) -> None:
    with open(_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_language(phone_number: str) -> str:
    """Return the stored language code for a phone number, defaulting to 'en'."""
    return _load().get(phone_number, "en")


def set_language(phone_number: str, language_code: str) -> None:
    """Persist a language preference for a phone number."""
    if language_code not in SUPPORTED_LANGUAGES:
        accepted = ", ".join(SUPPORTED_LANGUAGES.keys())
        raise ValueError(f"Unsupported language '{language_code}'. Accepted: {accepted}")
    data = _load()
    data[phone_number] = language_code
    _save(data)
