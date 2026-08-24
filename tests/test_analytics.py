"""
test_analytics.py
─────────────────
Unit tests for the analytics engine.

Run:
    python -m pytest tests/test_analytics.py -v
"""

import sys
import os
import pytest
import pandas as pd
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from src.analytics.analytics_engine import (
    kpi_overview,
    most_searched_products,
    most_viewed_products,
    most_purchased_products,
    peak_shopping_hours,
    action_distribution,
    session_duration_stats,
    conversion_rate,
    city_activity,
    category_performance,
    device_browser_breakdown,
    daily_trend,
    user_activity_heatmap,
)


# ── Fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture
def sample_df():
    """Create a minimal but realistic clickstream DataFrame for testing."""
    base = datetime(2024, 10, 1, 10, 0, 0)
    rows = [
        # Session 1: User 1, views product 2, adds to cart, purchases
        (1, "sess-1", base,                     "1.1.1.1", "Mobile",  "Chrome",  "login",           None, None,          None,        "Mumbai"),
        (1, "sess-1", base + timedelta(minutes=1), "1.1.1.1","Mobile","Chrome",  "search",           None, "Electronics", "headphones","Mumbai"),
        (1, "sess-1", base + timedelta(minutes=2), "1.1.1.1","Mobile","Chrome",  "product_view",     2,    "Electronics", None,        "Mumbai"),
        (1, "sess-1", base + timedelta(minutes=3), "1.1.1.1","Mobile","Chrome",  "add_to_cart",      2,    "Electronics", None,        "Mumbai"),
        (1, "sess-1", base + timedelta(minutes=4), "1.1.1.1","Mobile","Chrome",  "purchase",         2,    "Electronics", None,        "Mumbai"),
        (1, "sess-1", base + timedelta(minutes=5), "1.1.1.1","Mobile","Chrome",  "logout",           None, None,          None,        "Mumbai"),
        # Session 2: User 2, views products, adds to cart but does NOT purchase
        (2, "sess-2", base + timedelta(hours=2),   "2.2.2.2","Desktop","Firefox","login",            None, None,          None,        "Delhi"),
        (2, "sess-2", base + timedelta(hours=2, minutes=1),"2.2.2.2","Desktop","Firefox","search",   None,"Clothing","jeans",         "Delhi"),
        (2, "sess-2", base + timedelta(hours=2, minutes=2),"2.2.2.2","Desktop","Firefox","product_view",5,"Clothing",None,            "Delhi"),
        (2, "sess-2", base + timedelta(hours=2, minutes=3),"2.2.2.2","Desktop","Firefox","add_to_cart",5,"Clothing",None,             "Delhi"),
        (2, "sess-2", base + timedelta(hours=2, minutes=4),"2.2.2.2","Desktop","Firefox","remove_from_cart",5,"Clothing",None,        "Delhi"),
        (2, "sess-2", base + timedelta(hours=2, minutes=5),"2.2.2.2","Desktop","Firefox","logout",   None, None,          None,        "Delhi"),
        # Session 3: User 3, purchases
        (3, "sess-3", base + timedelta(hours=5),   "3.3.3.3","Tablet", "Safari", "login",            None, None,          None,        "Bangalore"),
        (3, "sess-3", base + timedelta(hours=5, minutes=2),"3.3.3.3","Tablet","Safari","product_view",2,"Electronics",None,           "Bangalore"),
        (3, "sess-3", base + timedelta(hours=5, minutes=3),"3.3.3.3","Tablet","Safari","purchase",    2,"Electronics",None,           "Bangalore"),
        (3, "sess-3", base + timedelta(hours=5, minutes=4),"3.3.3.3","Tablet","Safari","logout",      None,None,         None,        "Bangalore"),
    ]
    columns = ["user_id","session_id","timestamp","ip_address","device",
               "browser","action","product_id","category","search_query","city"]
    df = pd.DataFrame(rows, columns=columns)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


# ── Tests ─────────────────────────────────────────────────────────────────

class TestKpiOverview:
    def test_total_events(self, sample_df):
        result = kpi_overview(sample_df)
        assert result["total_events"] == len(sample_df)

    def test_unique_users(self, sample_df):
        result = kpi_overview(sample_df)
        assert result["total_users"] == 3

    def test_unique_sessions(self, sample_df):
        result = kpi_overview(sample_df)
        assert result["total_sessions"] == 3

    def test_total_purchases(self, sample_df):
        result = kpi_overview(sample_df)
        assert result["total_purchases"] == 2  # sess-1 and sess-3

    def test_revenue_positive(self, sample_df):
        result = kpi_overview(sample_df)
        assert result["total_revenue"] > 0


class TestSearchProducts:
    def test_returns_dataframe(self, sample_df):
        result = most_searched_products(sample_df)
        assert isinstance(result, pd.DataFrame)

    def test_columns(self, sample_df):
        result = most_searched_products(sample_df)
        assert "search_query" in result.columns
        assert "count" in result.columns

    def test_top_n_respected(self, sample_df):
        result = most_searched_products(sample_df, top_n=1)
        assert len(result) <= 1

    def test_only_search_actions_counted(self, sample_df):
        # Our sample has 2 search events with distinct queries
        result = most_searched_products(sample_df, top_n=10)
        assert len(result) == 2


class TestViewedProducts:
    def test_returns_correct_columns(self, sample_df):
        result = most_viewed_products(sample_df)
        assert "product_id" in result.columns
        assert "view_count" in result.columns

    def test_product_2_is_most_viewed(self, sample_df):
        # Product 2 is viewed in sess-1 and sess-3 = 2 views
        result = most_viewed_products(sample_df, top_n=5)
        top_product = result.iloc[0]["product_id"]
        assert top_product == 2.0


class TestConversionRate:
    def test_returns_dict(self, sample_df):
        result = conversion_rate(sample_df)
        assert isinstance(result, dict)

    def test_conversion_rate_between_0_and_100(self, sample_df):
        result = conversion_rate(sample_df)
        assert 0 <= result["conversion_rate"] <= 100

    def test_cart_abandon_rate_between_0_and_100(self, sample_df):
        result = conversion_rate(sample_df)
        assert 0 <= result["cart_abandonment_rate"] <= 100

    def test_correct_sessions_with_purchase(self, sample_df):
        result = conversion_rate(sample_df)
        assert result["sessions_with_purchase"] == 2  # sess-1, sess-3

    def test_correct_abandoned_carts(self, sample_df):
        result = conversion_rate(sample_df)
        # sess-2 added to cart but did not purchase → 1 abandon
        assert result["abandoned_carts"] == 1


class TestSessionDuration:
    def test_returns_dataframe(self, sample_df):
        result = session_duration_stats(sample_df)
        assert isinstance(result, pd.DataFrame)

    def test_has_all_sessions(self, sample_df):
        result = session_duration_stats(sample_df)
        assert len(result) == 3

    def test_duration_non_negative(self, sample_df):
        result = session_duration_stats(sample_df)
        assert (result["duration_seconds"] >= 0).all()

    def test_duration_of_session1(self, sample_df):
        result = session_duration_stats(sample_df)
        sess1 = result[result["session_id"] == "sess-1"].iloc[0]
        # Session 1 runs for 5 minutes = 300 seconds
        assert sess1["duration_seconds"] == 300


class TestPeakHours:
    def test_returns_all_hours(self, sample_df):
        result = peak_shopping_hours(sample_df)
        # Our sample spans hours 10, 12, 15
        assert len(result) >= 1

    def test_has_required_columns(self, sample_df):
        result = peak_shopping_hours(sample_df)
        assert "hour" in result.columns
        assert "event_count" in result.columns


class TestCityActivity:
    def test_returns_dataframe(self, sample_df):
        result = city_activity(sample_df)
        assert isinstance(result, pd.DataFrame)

    def test_top_n_respected(self, sample_df):
        result = city_activity(sample_df, top_n=2)
        assert len(result) <= 2

    def test_correct_cities(self, sample_df):
        result = city_activity(sample_df)
        cities = set(result["city"].tolist())
        assert {"Mumbai", "Delhi", "Bangalore"}.issubset(cities)


class TestCategoryPerformance:
    def test_electronics_category_present(self, sample_df):
        result = category_performance(sample_df)
        assert "Electronics" in result["category"].values

    def test_view_count_correct(self, sample_df):
        result = category_performance(sample_df)
        elec = result[result["category"] == "Electronics"].iloc[0]
        # product_view events in Electronics: 2 (sess-1 and sess-3)
        assert elec["views"] == 2


class TestHeatmap:
    def test_returns_dataframe(self, sample_df):
        result = user_activity_heatmap(sample_df)
        assert isinstance(result, pd.DataFrame)

    def test_columns_are_hours(self, sample_df):
        result = user_activity_heatmap(sample_df)
        for col in result.columns:
            assert 0 <= col <= 23

    def test_rows_are_days(self, sample_df):
        result = user_activity_heatmap(sample_df)
        valid_days = {"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"}
        for idx in result.index:
            assert idx in valid_days
