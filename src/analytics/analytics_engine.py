"""
analytics_engine.py
───────────────────
Loads clickstream CSV (or MySQL) and computes all KPIs
required by the dashboard and reports.

Usage (standalone):
    python src/analytics/analytics_engine.py

Returns a dictionary of DataFrames used by the Streamlit dashboard.
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config.app_config import LOG_FILE_PATH, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB


# ── Helper: load data ──────────────────────────────────────────────────────

def load_from_csv(filepath: str = LOG_FILE_PATH) -> pd.DataFrame:
    """Load clickstream CSV into a pandas DataFrame."""
    df = pd.read_csv(filepath, low_memory=False)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["product_id"] = pd.to_numeric(df["product_id"], errors="coerce")
    return df


def load_from_mysql() -> pd.DataFrame:
    """Load clickstream data from MySQL (fallback if CSV unavailable)."""
    try:
        import mysql.connector
        conn = mysql.connector.connect(
            host=MYSQL_HOST, port=MYSQL_PORT,
            user=MYSQL_USER, password=MYSQL_PASSWORD,
            database=MYSQL_DB
        )
        query = """
            SELECT cl.*, p.product_name, p.price
            FROM clickstream_logs cl
            LEFT JOIN products p ON p.product_id = cl.product_id
            ORDER BY cl.event_time
        """
        df = pd.read_sql(query, conn)
        conn.close()
        df.rename(columns={"event_time": "timestamp"}, inplace=True)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        return df
    except Exception as e:
        print(f"[!] MySQL load failed: {e}")
        return pd.DataFrame()


def load_data() -> pd.DataFrame:
    """Try CSV first, then MySQL, then return empty DF."""
    if os.path.exists(LOG_FILE_PATH):
        return load_from_csv(LOG_FILE_PATH)
    return load_from_mysql()


# ── KPI Calculations ───────────────────────────────────────────────────────

def kpi_overview(df: pd.DataFrame) -> dict:
    """
    Returns high-level KPIs:
    - Total events
    - Total unique users
    - Total unique sessions
    - Total purchases
    - Total revenue (estimated using product price approximation)
    """
    total_events   = len(df)
    total_users    = df["user_id"].nunique()
    total_sessions = df["session_id"].nunique()
    total_purchases = df[df["action"] == "purchase"].shape[0]

    # Rough revenue: assume avg order value ₹2500 per purchase
    avg_order_value = 2500
    total_revenue   = total_purchases * avg_order_value

    return {
        "total_events":    total_events,
        "total_users":     total_users,
        "total_sessions":  total_sessions,
        "total_purchases": total_purchases,
        "total_revenue":   total_revenue,
    }


def most_searched_products(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """
    Returns top N most-searched terms from 'search' action rows.
    """
    search_df = df[(df["action"] == "search") & (df["search_query"].notna())]
    counts = (
        search_df["search_query"]
        .str.lower()
        .str.strip()
        .value_counts()
        .head(top_n)
        .reset_index()
    )
    counts.columns = ["search_query", "count"]
    return counts


def most_viewed_products(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """Returns top N products by view count."""
    view_df = df[(df["action"] == "product_view") & (df["product_id"].notna())]
    counts = (
        view_df["product_id"]
        .value_counts()
        .head(top_n)
        .reset_index()
    )
    counts.columns = ["product_id", "view_count"]
    return counts


def most_purchased_products(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """Returns top N products by purchase count."""
    purch_df = df[(df["action"] == "purchase") & (df["product_id"].notna())]
    counts = (
        purch_df["product_id"]
        .value_counts()
        .head(top_n)
        .reset_index()
    )
    counts.columns = ["product_id", "purchase_count"]
    return counts


def peak_shopping_hours(df: pd.DataFrame) -> pd.DataFrame:
    """
    Returns event count per hour of day (0–23).
    Identifies peak shopping hours.
    """
    df = df.copy()
    df["hour"] = df["timestamp"].dt.hour
    hourly = (
        df.groupby("hour")
        .agg(event_count=("action", "count"), unique_users=("user_id", "nunique"))
        .reset_index()
        .sort_values("hour")
    )
    return hourly


def action_distribution(df: pd.DataFrame) -> pd.DataFrame:
    """Returns count of each action type — funnel analysis."""
    dist = (
        df["action"]
        .value_counts()
        .reset_index()
    )
    dist.columns = ["action", "count"]

    # Define funnel order
    funnel_order = ["login", "search", "product_view", "add_to_cart",
                    "wishlist", "remove_from_cart", "purchase", "logout"]
    dist["order"] = dist["action"].apply(
        lambda x: funnel_order.index(x) if x in funnel_order else 99
    )
    dist = dist.sort_values("order").drop(columns="order")
    return dist


def session_duration_stats(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes session duration for each session_id.
    Returns: session_id, user_id, duration_seconds, event_count
    """
    session_df = (
        df.groupby("session_id")
        .agg(
            user_id     =("user_id", "first"),
            first_event =("timestamp", "min"),
            last_event  =("timestamp", "max"),
            event_count =("action", "count"),
        )
        .reset_index()
    )
    session_df["duration_seconds"] = (
        session_df["last_event"] - session_df["first_event"]
    ).dt.total_seconds().astype(int)

    return session_df


def conversion_rate(df: pd.DataFrame) -> dict:
    """
    Conversion Rate = (sessions with purchase / total sessions) × 100
    Cart Abandonment Rate = (sessions with add_to_cart but no purchase / sessions with add_to_cart) × 100
    """
    sessions_with_purchase = set(df[df["action"] == "purchase"]["session_id"])
    sessions_with_cart     = set(df[df["action"] == "add_to_cart"]["session_id"])
    total_sessions         = df["session_id"].nunique()

    conv_rate = (len(sessions_with_purchase) / total_sessions * 100) if total_sessions else 0

    abandoned = sessions_with_cart - sessions_with_purchase
    cart_abandon_rate = (
        len(abandoned) / len(sessions_with_cart) * 100
        if sessions_with_cart else 0
    )

    return {
        "conversion_rate":      round(conv_rate, 2),
        "cart_abandonment_rate": round(cart_abandon_rate, 2),
        "sessions_with_purchase": len(sessions_with_purchase),
        "sessions_with_cart":    len(sessions_with_cart),
        "abandoned_carts":       len(abandoned),
    }


def city_activity(df: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """Returns top N cities by event count."""
    city_df = df[df["city"].notna()]
    result = (
        city_df.groupby("city")
        .agg(
            total_events  =("action", "count"),
            unique_users  =("user_id", "nunique"),
            purchases     =("action", lambda x: (x == "purchase").sum()),
        )
        .reset_index()
        .sort_values("total_events", ascending=False)
        .head(top_n)
    )
    return result


def category_performance(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregates views, cart adds, and purchases per category."""
    cat_df = df[df["category"].notna()]
    result = (
        cat_df.groupby("category")
        .agg(
            views     =("action", lambda x: (x == "product_view").sum()),
            cart_adds =("action", lambda x: (x == "add_to_cart").sum()),
            purchases =("action", lambda x: (x == "purchase").sum()),
            wishlists =("action", lambda x: (x == "wishlist").sum()),
        )
        .reset_index()
        .sort_values("views", ascending=False)
    )
    return result


def device_browser_breakdown(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Returns device and browser usage distributions."""
    device_dist = (
        df["device"].value_counts().reset_index()
    )
    device_dist.columns = ["device", "count"]

    browser_dist = (
        df["browser"].value_counts().reset_index()
    )
    browser_dist.columns = ["browser", "count"]

    return device_dist, browser_dist


def daily_trend(df: pd.DataFrame, last_n_days: int = 30) -> pd.DataFrame:
    """
    Returns daily event counts and purchase counts for trend charts.
    """
    df = df.copy()
    df["date"] = df["timestamp"].dt.date
    daily = (
        df.groupby("date")
        .agg(
            events    =("action", "count"),
            purchases =("action", lambda x: (x == "purchase").sum()),
            users     =("user_id", "nunique"),
        )
        .reset_index()
        .sort_values("date")
        .tail(last_n_days)
    )
    return daily


def user_activity_heatmap(df: pd.DataFrame) -> pd.DataFrame:
    """
    Returns a pivot table: rows = day of week, cols = hour of day.
    Values = event count. Used for activity heatmap in dashboard.
    """
    df = df.copy()
    df["hour"]       = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.day_name()

    pivot = (
        df.groupby(["day_of_week", "hour"])["action"]
        .count()
        .unstack(fill_value=0)
    )

    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    pivot = pivot.reindex([d for d in day_order if d in pivot.index])
    return pivot


# ── Full analytics pipeline ────────────────────────────────────────────────

def run_all_analytics(df: pd.DataFrame = None) -> dict:
    """
    Run the complete analytics pipeline.
    Returns a dict of all computed results.
    """
    if df is None:
        df = load_data()

    if df.empty:
        print("[!] No data loaded. Run the data generator first.")
        return {}

    print(f"[→] Running analytics on {len(df):,} events...")

    results = {
        "df":                    df,
        "overview":              kpi_overview(df),
        "most_searched":         most_searched_products(df),
        "most_viewed":           most_viewed_products(df),
        "most_purchased":        most_purchased_products(df),
        "peak_hours":            peak_shopping_hours(df),
        "action_distribution":   action_distribution(df),
        "session_durations":     session_duration_stats(df),
        "conversion":            conversion_rate(df),
        "city_activity":         city_activity(df),
        "category_performance":  category_performance(df),
        "device_browser":        device_browser_breakdown(df),
        "daily_trend":           daily_trend(df),
        "heatmap":               user_activity_heatmap(df),
    }

    # ── Print summary ──────────────────────────────────────────────────────
    ov = results["overview"]
    cr = results["conversion"]
    print("\n" + "=" * 60)
    print("  ANALYTICS SUMMARY")
    print("=" * 60)
    print(f"  Total Events       : {ov['total_events']:>10,}")
    print(f"  Unique Users       : {ov['total_users']:>10,}")
    print(f"  Unique Sessions    : {ov['total_sessions']:>10,}")
    print(f"  Total Purchases    : {ov['total_purchases']:>10,}")
    print(f"  Est. Revenue (INR) : ₹{ov['total_revenue']:>9,}")
    print(f"  Conversion Rate    : {cr['conversion_rate']:>9.1f}%")
    print(f"  Cart Abandon Rate  : {cr['cart_abandonment_rate']:>9.1f}%")
    print("=" * 60 + "\n")

    return results


if __name__ == "__main__":
    run_all_analytics()
