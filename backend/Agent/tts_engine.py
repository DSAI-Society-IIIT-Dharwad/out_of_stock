import re
import os
import tempfile
from gtts import gTTS


def _strip_formatting(text: str) -> str:
    """Remove WhatsApp markdown so TTS sounds natural."""
    text = re.sub(r"[*_]", "", text)           # bold / italic markers
    text = re.sub(r"━+", "", text)             # separator lines
    text = re.sub(r"\n{3,}", "\n\n", text)     # collapse excess blank lines
    return text.strip()


def generate_audio(text: str, lang_code: str) -> str | None:
    """
    Convert text to an mp3 file. Returns the file path, or None on failure.
    Caller is responsible for deleting the file after use.
    """
    try:
        clean_text = _strip_formatting(text)
        tts = gTTS(text=clean_text, lang=lang_code, slow=False)
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tts.save(tmp.name)
        return tmp.name
    except Exception as e:
        print(f"[TTS] Failed to generate audio: {e}")
        return None
