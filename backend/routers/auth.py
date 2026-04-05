"""
Authentication router — register, login, profile.
Uses JWT (HS256) + bcrypt directly (no passlib).
Users table schema: full_name, email, phone_number, city, state, password_hash.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt as _bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from db.session import get_turso
from db.turso_client import TursoHTTPClient

router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "pricesentinel-change-me-in-production")
ALGORITHM  = "HS256"
TOKEN_TTL  = int(os.getenv("JWT_TTL_HOURS", "72"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ── Crypto helpers ────────────────────────────────────────────────────────────
def _hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def _verify(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _create_token(user_id: int, email: str) -> str:
    exp = datetime.utcnow() + timedelta(hours=TOKEN_TTL)
    return jwt.encode({"sub": str(user_id), "email": email, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


# ── Auth dependencies ─────────────────────────────────────────────────────────
def get_current_user(
    token: str = Depends(oauth2_scheme),
    t: TursoHTTPClient = Depends(get_turso),
) -> dict:
    """FastAPI dependency — returns user row or raises 401."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    rows = t.query_rows("SELECT * FROM users WHERE id = ?", [user_id])
    if not rows:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return rows[0]


def get_optional_user(
    token: str = Depends(oauth2_scheme),
    t: TursoHTTPClient = Depends(get_turso),
) -> Optional[dict]:
    """Like get_current_user but returns None instead of raising."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
        rows = t.query_rows("SELECT * FROM users WHERE id = ?", [user_id])
        return rows[0] if rows else None
    except Exception:
        return None


# ── Schemas ───────────────────────────────────────────────────────────────────
class RegisterBody(BaseModel):
    full_name: str
    email: str
    password: str
    phone_number: str       # WhatsApp number, e.g. +919834577965
    city: str
    state: str
    company_name: Optional[str] = None
    business_type: Optional[str] = None


class LoginBody(BaseModel):
    email: str
    password: str


class UpdateProfileBody(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    company_name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/auth/register", status_code=201)
def register(body: RegisterBody, t: TursoHTTPClient = Depends(get_turso)):
    email = body.email.strip().lower()
    phone = body.phone_number.strip()

    if not phone.startswith("+"):
        raise HTTPException(400, "Phone must include country code, e.g. +919834577965")

    existing = t.query_rows("SELECT id FROM users WHERE email = ?", [email])
    if existing:
        raise HTTPException(409, "Email already registered")

    hashed = _hash(body.password)
    now = datetime.utcnow().isoformat()

    t.execute(
        """INSERT INTO users
           (full_name, email, password_hash, phone_number, city, state,
            company_name, business_type, is_active, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,1,?,?)""",
        [body.full_name.strip(), email, hashed, phone,
         body.city.strip(), body.state.strip(),
         (body.company_name or "").strip() or None,
         (body.business_type or "").strip() or None,
         now, now],
    )
    rows = t.query_rows("SELECT * FROM users WHERE email = ?", [email])
    user = rows[0]

    _send_welcome(phone, body.full_name.strip())

    token = _create_token(int(user["id"]), email)
    return {"token": token, "user": _safe(user)}


@router.post("/auth/login")
def login(body: LoginBody, t: TursoHTTPClient = Depends(get_turso)):
    email = body.email.strip().lower()
    rows = t.query_rows("SELECT * FROM users WHERE email = ?", [email])
    if not rows or not _verify(body.password, rows[0]["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    user = rows[0]
    token = _create_token(int(user["id"]), email)
    return {"token": token, "user": _safe(user)}


@router.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    return _safe(user)


@router.patch("/auth/me")
def update_profile(
    body: UpdateProfileBody,
    user: dict = Depends(get_current_user),
    t: TursoHTTPClient = Depends(get_turso),
):
    updates, params = [], []

    if body.full_name:
        updates.append("full_name = ?"); params.append(body.full_name.strip())
    if body.phone_number:
        phone = body.phone_number.strip()
        if not phone.startswith("+"):
            raise HTTPException(400, "Phone must include country code")
        updates.append("phone_number = ?"); params.append(phone)
    if body.city:
        updates.append("city = ?"); params.append(body.city.strip())
    if body.state:
        updates.append("state = ?"); params.append(body.state.strip())
    if body.company_name is not None:
        updates.append("company_name = ?"); params.append(body.company_name.strip())
    if body.new_password:
        if not body.current_password or not _verify(body.current_password, user["password_hash"]):
            raise HTTPException(400, "Current password is incorrect")
        updates.append("password_hash = ?"); params.append(_hash(body.new_password))

    if updates:
        updates.append("updated_at = ?"); params.append(datetime.utcnow().isoformat())
        params.append(user["id"])
        t.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)

    rows = t.query_rows("SELECT * FROM users WHERE id = ?", [user["id"]])
    return _safe(rows[0])


# ── Helpers ───────────────────────────────────────────────────────────────────
def _safe(user: dict) -> dict:
    """Strip password hash before returning to client."""
    return {k: v for k, v in user.items() if k != "password_hash"}


def _send_welcome(phone: str, name: str):
    try:
        from alerts import sendWhatsAppText
        msg = (
            f"👋 Welcome to *PriceSentinel*, {name}!\n\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"Your account is active. You will receive real-time alerts on this number whenever:\n\n"
            f"🔴 *Price Drop* — A competitor drops their price significantly\n"
            f"🟠 *Buy Box Change* — The Buy Box changes hands to a different seller\n"
            f"⚑ *Price War* — Multiple sellers are undercutting each other rapidly\n"
            f"📦 *Stockout Signal* — A competitor appears to have run out of stock\n\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"To set up your first alert, log in and go to the *Alerts* page.\n"
            f"_Reply *LANG* anytime to set your preferred language._\n"
            f"_PriceSentinel · Amazon Bearing Intelligence_"
        )
        sendWhatsAppText(phone, msg)
    except Exception as e:
        print(f"[Auth] Welcome message failed: {e}")
