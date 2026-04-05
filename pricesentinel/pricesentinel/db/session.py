import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from pricesentinel.db.models import Base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///pricesentinel.db")

# Always resolve to an absolute path so the DB file is the same
# regardless of which directory scrapy / uvicorn is launched from.
_HERE = os.path.dirname(os.path.abspath(__file__))              # .../pricesentinel/pricesentinel/db/
_PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))  # .../pricesentinel/ (project dir)
_DB_PATH = os.path.join(_PROJECT_ROOT, "pricesentinel_local.db")

if DATABASE_URL.startswith("libsql://"):
    _engine_url = f"sqlite:///{_DB_PATH}"
else:
    _engine_url = DATABASE_URL if os.path.isabs(DATABASE_URL.replace("sqlite:///", "")) \
        else f"sqlite:///{_DB_PATH}"

engine = create_engine(
    _engine_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(price_records)"))}
        # New columns from amazon_bearing_monitor merge
        for col, col_type in [
            ("ships_from", "TEXT"), ("seller_location", "TEXT"), ("state", "TEXT"),
            ("brand", "TEXT"), ("category", "TEXT"), ("rating", "REAL"),
            ("review_count", "INTEGER"), ("region", "TEXT"), ("buybox_is_fba", "INTEGER"),
        ]:
            if col not in existing:
                conn.execute(text(f"ALTER TABLE price_records ADD COLUMN {col} {col_type}"))
                conn.commit()
    print(f"✅ DB ready — {_engine_url}")


def get_session():
    return SessionLocal()
