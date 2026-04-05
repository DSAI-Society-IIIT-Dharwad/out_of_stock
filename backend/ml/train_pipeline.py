"""
ml/train_pipeline.py — Lightweight training pipeline.
Reads from Turso (price_records) → engineers features → trains PriceOptimizerNN → saves model.pth + scaler.pkl.
Called automatically by scheduler after each scrape run.
"""
import logging
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

log = logging.getLogger("train_pipeline")

MODEL_PATH  = Path(__file__).parent / "model.pth"
SCALER_PATH = Path(__file__).parent / "scaler.pkl"

MIN_ROWS = 50   # skip training if not enough data

FEATURES = [
    "simulated_price",
    "price_rank",
    "price_diff_from_min",
    "price_vs_group_avg",
    "product_rating",
    "review_count",
    "seller_win_rate",
    "seller_total_wins_log",
    "buybox_is_fba",
    "fba_ratio",
    "seller_count",
    "is_free_delivery",
    "is_fast_delivery",
    "hour",
    "day_of_week",
]


# ── Model ─────────────────────────────────────────────────────────────────────

class PriceOptimizerNN(nn.Module):
    """
    MLP for Buy Box win probability (binary classification).
    Architecture matches the saved ml/model.pth weights:
      Linear(input_dim→128) → ReLU → Linear(128→64) → ReLU
      → Linear(64→32) → ReLU → Linear(32→1) → Sigmoid
    State dict keys use 'model.*' prefix.
    """

    def __init__(self, input_dim: int = 15):
        super().__init__()
        self.model = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.model(x)


# ── Feature engineering ───────────────────────────────────────────────────────

def load_and_engineer() -> pd.DataFrame | None:
    """Load price_records from Turso and engineer ML features."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from db.turso_client import get_turso_client

    t = get_turso_client()
    if not t:
        log.warning("Turso not configured — cannot load training data")
        return None

    try:
        rows = t.query_rows("""
            SELECT asin, location, buybox_seller, buybox_price, ships_from,
                   all_sellers, scraped_at
            FROM price_records
            WHERE buybox_price IS NOT NULL
            ORDER BY scraped_at DESC
            LIMIT 5000
        """)
    except Exception as e:
        log.error(f"Turso query failed: {e}")
        return None

    if len(rows) < MIN_ROWS:
        log.warning(f"Only {len(rows)} rows — skipping training (need {MIN_ROWS})")
        return None

    df = pd.DataFrame(rows)

    # Numeric coercion
    df["buybox_price"] = pd.to_numeric(df["buybox_price"], errors="coerce")
    df = df.dropna(subset=["buybox_price"])

    # Time features
    df["scraped_at"] = pd.to_datetime(df["scraped_at"], errors="coerce")
    df["hour"]        = df["scraped_at"].dt.hour.fillna(12).astype(int)
    df["day_of_week"] = df["scraped_at"].dt.dayofweek.fillna(0).astype(int)

    # Parse all_sellers JSON to derive seller_count, fba_ratio, is_free_delivery, is_fast_delivery
    import json as _json

    def _parse_sellers(raw):
        if not raw:
            return 1, 0.5, 0, 0
        try:
            sellers = _json.loads(raw) if isinstance(raw, str) else raw
            if not isinstance(sellers, list) or len(sellers) == 0:
                return 1, 0.5, 0, 0
            count = len(sellers)
            fba_count = sum(1 for s in sellers if s.get("is_fba") or s.get("fba"))
            fba_ratio = fba_count / count
            # Delivery hints from seller data
            delivery_texts = " ".join(str(s.get("delivery", "")) for s in sellers).lower()
            is_free = int("free" in delivery_texts)
            is_fast = int(any(k in delivery_texts for k in ["1 day", "2 day", "tomorrow", "today"]))
            return count, fba_ratio, is_free, is_fast
        except Exception:
            return 1, 0.5, 0, 0

    parsed = df["all_sellers"].apply(_parse_sellers)
    df["seller_count"]     = parsed.apply(lambda x: x[0])
    df["fba_ratio"]        = parsed.apply(lambda x: x[1])
    df["is_free_delivery"] = parsed.apply(lambda x: x[2])
    df["is_fast_delivery"] = parsed.apply(lambda x: x[3])

    # Assume buybox is FBA if ships_from contains "Amazon"
    df["buybox_is_fba"] = df["ships_from"].fillna("").str.contains("Amazon", case=False).astype(int)

    # Placeholder product features (not in price_records — use neutral defaults)
    df["product_rating"] = 4.2
    df["review_count"]   = 50.0

    # Group-level competition features
    df["group_id"]        = df["asin"].astype(str) + "_" + df["location"].astype(str)
    df["price_rank"]      = df.groupby("group_id")["buybox_price"].rank(method="dense")
    df["min_price_group"] = df.groupby("group_id")["buybox_price"].transform("min")
    df["avg_price_group"] = df.groupby("group_id")["buybox_price"].transform("mean")
    df["price_diff_from_min"] = df["buybox_price"] - df["min_price_group"]
    df["price_vs_group_avg"]  = df["buybox_price"] / df["avg_price_group"].replace(0, np.nan)

    # Seller win rate
    win_counts = df["buybox_seller"].value_counts()
    df["seller_win_rate"]       = df["buybox_seller"].map(win_counts) / len(df)
    df["seller_total_wins_log"] = np.log1p(df["buybox_seller"].map(win_counts).fillna(0))

    # Target: 1 = this record is the buybox winner (always true for price_records rows)
    df["target"] = 1

    # Price scenarios (5×) — augment with near-miss prices as negatives
    rows_aug = []
    for _, row in df.iterrows():
        base = row["buybox_price"]
        for i, factor in enumerate([0.9, 0.95, 1.0, 1.05, 1.1]):
            r = row.copy()
            r["simulated_price"] = base * factor
            # Only the exact buybox price (factor=1.0) is a winner
            r["target"] = 1 if factor == 1.0 else 0
            rows_aug.append(r)
    df_aug = pd.DataFrame(rows_aug)

    df_aug = df_aug[FEATURES + ["target"]].dropna()
    log.info(f"Feature matrix: {df_aug.shape}")
    return df_aug


# ── Training ──────────────────────────────────────────────────────────────────

def train(epochs: int = 20) -> dict:
    """
    Full pipeline: load → engineer → train → save.
    Returns metrics dict. Safe to call from a background thread.
    """
    log.info("Training pipeline started")

    df = load_and_engineer()
    if df is None:
        return {"status": "skipped", "reason": "insufficient data"}

    X = df[FEATURES].values.astype(np.float32)
    y = df["target"].values.astype(np.float32)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    X_tr = torch.tensor(X_train_s, dtype=torch.float32)
    y_tr = torch.tensor(y_train,   dtype=torch.float32).view(-1, 1)
    X_te = torch.tensor(X_test_s,  dtype=torch.float32)
    y_te = torch.tensor(y_test,    dtype=torch.float32).view(-1, 1)

    model     = PriceOptimizerNN(input_dim=len(FEATURES))
    criterion = nn.BCELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    final_loss = 0.0
    for epoch in range(epochs):
        model.train()
        out  = model(X_tr)
        loss = criterion(out, y_tr)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        final_loss = loss.item()
        if (epoch + 1) % 5 == 0:
            log.info(f"  Epoch {epoch+1}/{epochs}  loss={final_loss:.4f}")

    model.eval()
    with torch.no_grad():
        preds    = (model(X_te) > 0.5).float()
        accuracy = (preds == y_te).float().mean().item()

    log.info(f"Training done — loss={final_loss:.4f}  accuracy={accuracy:.4f}")

    # Atomic save: write to tmp then rename
    tmp_model  = MODEL_PATH.with_suffix(".tmp.pth")
    tmp_scaler = SCALER_PATH.with_suffix(".tmp.pkl")
    torch.save(model.state_dict(), tmp_model)
    joblib.dump(scaler, tmp_scaler)
    tmp_model.replace(MODEL_PATH)
    tmp_scaler.replace(SCALER_PATH)

    log.info(f"Saved model → {MODEL_PATH}")
    log.info(f"Saved scaler → {SCALER_PATH}")

    return {
        "status":   "ok",
        "rows":     len(df),
        "epochs":   epochs,
        "loss":     round(final_loss, 4),
        "accuracy": round(accuracy, 4),
    }


# ── Inference helper (used by dashboard) ─────────────────────────────────────

def load_model() -> tuple["PriceOptimizerNN", "StandardScaler"] | tuple[None, None]:
    """
    Load saved model + scaler. Handles key prefix mismatches between
    old checkpoints (net.* or model.*) and the current class definition.
    Returns (None, None) if unavailable.
    """
    if not MODEL_PATH.exists() or not SCALER_PATH.exists():
        log.warning("model.pth or scaler.pkl not found")
        return None, None
    try:
        sd = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)

        # Auto-detect input dim from first 2-D weight tensor
        first_w = next(v for k, v in sd.items() if k.endswith(".weight") and v.ndim == 2)
        input_dim = first_w.shape[1]

        model = PriceOptimizerNN(input_dim=input_dim)

        # Try strict load first
        try:
            model.load_state_dict(sd, strict=True)
        except RuntimeError:
            # Remap saved keys to match current class attribute name
            # Determine what prefix the saved file uses vs what the class expects
            saved_prefix   = next(k.split(".")[0] for k in sd)          # e.g. "model" or "net"
            class_prefix   = next(k.split(".")[0] for k in model.state_dict())  # e.g. "model"
            if saved_prefix != class_prefix:
                sd = {class_prefix + k[len(saved_prefix):]: v for k, v in sd.items()}
                log.info(f"Remapped state dict keys: '{saved_prefix}.*' → '{class_prefix}.*'")
            model.load_state_dict(sd, strict=True)

        model.eval()
        scaler = joblib.load(SCALER_PATH)
        log.info(f"Model loaded (input_dim={input_dim})")
        return model, scaler
    except Exception as e:
        log.error(f"Failed to load model: {e}")
        return None, None


def predict_win_prob(model: PriceOptimizerNN, scaler: StandardScaler,
                     row: dict) -> float:
    """Predict Buy Box win probability for a single feature dict."""
    df = pd.DataFrame([row]).reindex(columns=FEATURES, fill_value=0)
    x  = torch.tensor(scaler.transform(df.values.astype(np.float32)), dtype=torch.float32)
    with torch.no_grad():
        return model(x).item()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")
    result = train()
    print(result)