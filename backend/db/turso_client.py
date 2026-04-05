"""Turso HTTP client — reused from pricesentinel package"""
import os
import json
import requests
from typing import List, Dict, Any, Optional


class TursoHTTPClient:
    def __init__(self, database_url: str, auth_token: str):
        if database_url.startswith("libsql://"):
            self.http_url = database_url.replace("libsql://", "https://") + "/v2/pipeline"
        else:
            raise ValueError("Invalid Turso database URL")
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
        }

    def execute(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        formatted = []
        for p in (params or []):
            if p is None:
                formatted.append({"type": "null"})
            elif isinstance(p, bool):
                # Turso /v2/pipeline rejects {"type":"integer"} — send everything as text
                formatted.append({"type": "text", "value": str(int(p))})
            elif isinstance(p, int):
                formatted.append({"type": "text", "value": str(p)})
            elif isinstance(p, float):
                formatted.append({"type": "float", "value": p})
            else:
                formatted.append({"type": "text", "value": str(p)})

        payload = {"requests": [{"type": "execute", "stmt": {"sql": sql, "args": formatted}}]}
        resp = requests.post(self.http_url, json=payload, headers=self.headers, timeout=30)
        resp.raise_for_status()
        result = resp.json()
        r = result["results"][0]
        if r.get("type") == "ok":
            return r["response"]["result"]
        raise Exception(f"Turso error: {r.get('error')}")

    def query_rows(self, sql: str, params: Optional[List[Any]] = None) -> List[Dict[str, Any]]:
        result = self.execute(sql, params)
        rows = []
        cols = [c["name"] for c in result.get("cols", [])]
        for row in result.get("rows", []):
            record = {}
            for i, col in enumerate(cols):
                cell = row[i]
                record[col] = cell.get("value") if isinstance(cell, dict) else None
            rows.append(record)
        return rows


def get_turso_client() -> Optional[TursoHTTPClient]:
    url = os.getenv("DATABASE_URL", "")
    token = os.getenv("TURSO_AUTH_TOKEN", "")
    if not url.startswith("libsql://") or not token:
        return None
    try:
        return TursoHTTPClient(url, token)
    except Exception as e:
        print(f"⚠️  Turso client init failed: {e}")
        return None
