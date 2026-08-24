"""
api_server.py
─────────────
REST API server (Flask) exposing analytics endpoints.
Used by external dashboards (Power BI, Tableau) or mobile apps.

Endpoints:
    GET  /api/health                   → server health check
    GET  /api/overview                 → KPI summary
    GET  /api/top-products             → most viewed / purchased
    GET  /api/peak-hours               → hourly traffic
    GET  /api/categories               → category performance
    GET  /api/cities                   → city activity
    GET  /api/conversion               → conversion & cart abandon rates
    GET  /api/heatmap                  → activity heatmap data

Run:
    python src/api/api_server.py
    Open: http://localhost:5000/api/overview
"""

import os
import sys
from functools import lru_cache

from flask import Flask, jsonify, request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from src.analytics.analytics_engine import run_all_analytics, load_data

app = Flask(__name__)

# ── Data cache (loaded once at startup) ───────────────────────────────────
_analytics_cache = None


def get_analytics():
    global _analytics_cache
    if _analytics_cache is None:
        df = load_data()
        _analytics_cache = run_all_analytics(df)
    return _analytics_cache


# ── Response helper ────────────────────────────────────────────────────────
def success(data):
    return jsonify({"status": "success", "data": data})


def error(message, code=400):
    return jsonify({"status": "error", "message": message}), code


# ── Routes ──────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return success({"message": "Clickstream Analytics API is running", "version": "1.0.0"})


@app.route("/api/overview")
def overview():
    analytics = get_analytics()
    ov = analytics["overview"]
    cr = analytics["conversion"]
    return success({
        "total_events":         ov["total_events"],
        "total_users":          ov["total_users"],
        "total_sessions":       ov["total_sessions"],
        "total_purchases":      ov["total_purchases"],
        "estimated_revenue_inr": ov["total_revenue"],
        "conversion_rate_pct":  cr["conversion_rate"],
        "cart_abandonment_rate_pct": cr["cart_abandonment_rate"],
    })


@app.route("/api/top-products")
def top_products():
    top_n = int(request.args.get("top_n", 10))
    analytics = get_analytics()

    viewed    = analytics["most_viewed"].head(top_n)
    purchased = analytics["most_purchased"].head(top_n)

    return success({
        "most_viewed": viewed.to_dict(orient="records"),
        "most_purchased": purchased.to_dict(orient="records"),
    })


@app.route("/api/peak-hours")
def peak_hours():
    analytics = get_analytics()
    df = analytics["peak_hours"]
    return success(df.to_dict(orient="records"))


@app.route("/api/categories")
def categories():
    analytics = get_analytics()
    df = analytics["category_performance"]
    return success(df.to_dict(orient="records"))


@app.route("/api/cities")
def cities():
    top_n = int(request.args.get("top_n", 10))
    analytics = get_analytics()
    df = analytics["city_activity"].head(top_n)
    return success(df.to_dict(orient="records"))


@app.route("/api/conversion")
def conversion():
    analytics = get_analytics()
    return success(analytics["conversion"])


@app.route("/api/heatmap")
def heatmap():
    analytics = get_analytics()
    hm = analytics["heatmap"]
    # Convert to list-of-dicts for JSON serialization
    records = []
    for day in hm.index:
        for hour in hm.columns:
            records.append({
                "day":    day,
                "hour":   int(hour),
                "events": int(hm.loc[day, hour]),
            })
    return success(records)


@app.route("/api/search-terms")
def search_terms():
    top_n = int(request.args.get("top_n", 20))
    analytics = get_analytics()
    df = analytics["most_searched"].head(top_n)
    return success(df.to_dict(orient="records"))


@app.route("/api/action-distribution")
def action_distribution():
    analytics = get_analytics()
    df = analytics["action_distribution"]
    return success(df.to_dict(orient="records"))


@app.route("/api/daily-trend")
def daily_trend():
    analytics = get_analytics()
    df = analytics["daily_trend"]
    df["date"] = df["date"].astype(str)
    return success(df.to_dict(orient="records"))


if __name__ == "__main__":
    print("[→] Starting Clickstream Analytics API on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
