# PriceSentinel

Real-time Amazon price intelligence for industrial bearing distributors in India. Monitors Buy Box prices across 12+ cities, detects competitor moves, and delivers actionable WhatsApp alerts — with voice notes in 8 Indian languages.

---

## What it does

Bearing distributors on Amazon India face a constant reaction game: prices change, Buy Boxes shift, and price wars erupt — often before you notice. PriceSentinel automates the watching so you can focus on acting.

- Scrapes Amazon bearing prices (models 6205–6210) across 12+ Indian cities every 15 minutes using real PIN codes
- Detects four signal types: price drops, Buy Box changes, price wars, and stockout opportunities
- Sends WhatsApp alerts with context and a suggested action — not just a number
- Delivers voice notes via TTS in Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, Gujarati, or English
- Provides a full dashboard: geo price map, seller leaderboard, Buy Box timeline, ML price predictor

---

## Project structure

```
pricesentinel/          Scrapy spider — scrapes Amazon, writes to Turso DB
backend/                FastAPI API — auth, alerts, intelligence, ML, scheduler
  routers/              API route handlers (auth, alerts, prices, buybox, sellers, ml, ...)
  db/                   SQLAlchemy models + Turso HTTP client
  Agent/                LangChain agent — threat assessment, translation, voice delivery
  ml/                   PyTorch model for Buy Box win probability prediction
frontend/               React + Vite dashboard
  src/pages/            All UI pages (Dashboard, Alerts, GeoIntel, Predict, ...)
  src/store/            Zustand state (useAuth, useStore)
```

---

## Tech stack

| Layer | Stack |
|---|---|
| Scraper | Scrapy, ScrapeOps proxy rotation |
| Database | Turso (libsql over HTTP), SQLite fallback |
| Backend | FastAPI, APScheduler, SQLAlchemy |
| Auth | JWT (HS256) + bcrypt 4.2.1 |
| ML | PyTorch, scikit-learn |
| Agent | LangChain + Groq (Llama 3.1 8B) |
| WhatsApp | WasenderAPI |
| TTS | gTTS |
| Frontend | React 19, Vite, Tailwind CSS v4, Recharts, Zustand |

---

## Alert types

| Type | Trigger | What you get |
|---|---|---|
| `PRICE_DROP` | Competitor drops price ≥ 5% | Old price, new price, % drop, suggested action |
| `BUYBOX_CHANGE` | Buy Box changes hands | Previous seller, new seller, what to do |
| `PRICE_WAR` | 3+ drops in 6 hours on same ASIN | Warning to hold — don't react yet |
| `STOCKOUT_SIGNAL` | Price spikes ≥ 20% | Push your inventory now |

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager — used by both backend and scraper)
- A [Turso](https://turso.tech/) database
- A [WasenderAPI](https://wasenderapi.com/) account (WhatsApp delivery)
- A [ScrapeOps](https://scrapeops.io/) API key (proxy rotation for scraper)
- A [Groq](https://console.groq.com/) API key (LLM for agent)

---

### 1. Clone the repo

```bash
git clone <repo-url>
cd pricesentinel-root
```

---

### 2. Scraper setup

```bash
cd pricesentinel
cp .env.example .env
# Fill in SCRAPEOPS_API_KEY, DATABASE_URL, TURSO_AUTH_TOKEN
uv sync
```

Test the spider manually:

```bash
uv run scrapy crawl amazon_bearing -a models=6205,6206 -a locations=chennai,mumbai -a limit=10
```

---

### 3. Backend setup

```bash
cd backend
```

Create `.env`:

```env
DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token

WASENDER_API_KEY=your-wasenderapi-key
WASENDER_BASE_URL=https://api.wasenderapi.com

SCRAPEOPS_API_KEY=your-scrapeops-key
GROQ_API_KEY=your-groq-key

JWT_SECRET=change-this-to-a-long-random-string
JWT_TTL_HOURS=72
```

Install dependencies and start the API:

```bash
uv sync
uv run uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

On startup, `init_db()` runs automatically — it creates all tables and migrates any missing columns.

---

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` and proxies all `/api` requests to `http://localhost:8000`.

To build for production:

```bash
npm run build
# Output in frontend/dist/
```

---

### 5. WhatsApp Agent (optional)

The agent handles language selection, LLM-generated alerts, and voice note delivery. It requires a running webhook server so WasenderAPI can deliver incoming replies.

```bash
cd backend/Agent
# Set GROQ_API_KEY, WASENDER_API_KEY, WASENDER_BASE_URL, AUDIO_HOST_URL in Agent/.env
uv run python webhook_server.py   # starts Flask webhook on port 5000
```

To expose the webhook publicly (for receiving WhatsApp replies):

```bash
ngrok http 5000
# Copy the https URL into Agent/.webhook_url
```

---

## Database schema

All tables live in Turso (libsql). The backend creates and migrates them on startup.

```
users           id, full_name, email, password_hash, phone_number, city, state,
                company_name, business_type, is_active, created_at, updated_at

alert_rules     id, user_id, asin, location, alert_type, threshold, mobile, active, created_at

alerts          id, type, asin, model, location, message, old_price, new_price,
                delta_percent, old_seller, new_seller, drop_count, spike_percent,
                whatsapp_sent, fired_at

price_records   id, asin, model, title, brand, category, rating, review_count,
                location, state, pin_code, region, buybox_seller, buybox_price,
                buybox_is_fba, ships_from, seller_location, all_sellers, scraped_at

offers          id, asin, seller_name, seller_price, shipping_price, is_fba,
                seller_rating, location, pin_code, region, scraped_at
```

---

## API overview

All routes are prefixed with `/api/v1`.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create account, receive welcome WhatsApp |
| POST | `/auth/login` | — | Get JWT token |
| GET | `/auth/me` | ✓ | Current user profile |
| PATCH | `/auth/me` | ✓ | Update profile / change password |
| GET | `/alerts` | optional | Alert feed (filtered to user's ASINs if authenticated) |
| POST | `/alerts/rules` | ✓ | Create alert rule (phone auto-filled from profile) |
| GET | `/alerts/rules` | ✓ | List your active rules |
| DELETE | `/alerts/rules/{id}` | ✓ | Deactivate a rule |
| POST | `/alerts/simulate` | ✓ | Fire a demo alert (optionally sends WhatsApp) |
| GET | `/prices/{asin}` | — | Price history for an ASIN |
| GET | `/buybox/{asin}` | — | Buy Box timeline |
| GET | `/sellers/{asin}` | — | Seller leaderboard |
| GET | `/asins` | — | All tracked ASINs |
| POST | `/scrape/trigger` | — | Trigger a scrape job immediately |
| POST | `/ml/predict` | — | Buy Box win probability prediction |
| GET | `/analytics/{asin}` | — | Full analytics bundle |
| GET | `/geo/{asin}` | — | Geo price breakdown |

---

## How alerts flow

```
Scrapy spider
  → writes price_records to Turso
  → intelligence engine compares against previous record
  → fires alert row into alerts table
  → evaluate_rules() queries alert_rules for matching user subscriptions
  → sends WhatsApp to each matched user's phone_number
  → (optional) Agent translates + generates voice note
```

Alert rules are user-scoped. When you create a rule, your registered WhatsApp number is saved automatically — you never enter it again. Change your number in Profile and all future alerts update instantly.

---

## ML price predictor

The model (`ml/model.pth`) is a PyTorch neural network trained on historical price and Buy Box data. Given an ASIN and a candidate price, it returns the estimated Buy Box win probability. The `/ml/predict` endpoint sweeps 20 price points and returns the optimal price that maximises expected profit.

Retraining runs automatically 30 seconds after each scheduled scrape completes.

---

## Scheduler

APScheduler runs inside the FastAPI process and triggers the Scrapy spider every 15 minutes via `uv run scrapy crawl ...`. The scraper directory is resolved relative to the backend at `../pricesentinel`.

You can also trigger a scrape manually from the Dashboard or via `POST /api/v1/scrape/trigger`.

---

## Environment variables reference

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | backend, scraper | Turso libsql URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | backend, scraper | Turso auth token |
| `WASENDER_API_KEY` | backend | WasenderAPI key for WhatsApp delivery |
| `WASENDER_BASE_URL` | backend | WasenderAPI base URL |
| `SCRAPEOPS_API_KEY` | scraper | ScrapeOps proxy rotation key |
| `GROQ_API_KEY` | backend/Agent | Groq API key for LLM translation |
| `JWT_SECRET` | backend | Secret for signing JWT tokens — change in production |
| `JWT_TTL_HOURS` | backend | Token expiry in hours (default: 72) |
| `AUDIO_HOST_URL` | Agent | Public URL for serving voice note audio files |
| `NGROK_AUTH_TOKEN` | Agent | ngrok token for exposing webhook locally |
