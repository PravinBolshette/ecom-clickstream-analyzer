"""
test_generator.py
─────────────────
Unit tests for the clickstream data generator.

Run:
    python -m pytest tests/test_generator.py -v
"""

import sys
import os
import pytest
import csv
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from src.data_generator.clickstream_generator import (
    generate_clickstream,
    generate_session_events,
    random_ip,
    save_to_csv,
    SAMPLE_RECORDS,
)
from config.app_config import ACTIONS


class TestRandomIp:
    def test_returns_string(self):
        ip = random_ip()
        assert isinstance(ip, str)

    def test_valid_format(self):
        ip = random_ip()
        parts = ip.split(".")
        assert len(parts) == 4

    def test_octets_in_range(self):
        for _ in range(100):
            ip = random_ip()
            parts = [int(p) for p in ip.split(".")]
            assert all(0 <= p <= 254 for p in parts)


class TestSessionEvents:
    def test_starts_with_login(self):
        events = generate_session_events(
            user_id=1, session_id="test-session",
            session_start=datetime(2024, 1, 1, 10, 0, 0),
            device="Mobile", browser="Chrome",
            city="Mumbai", ip="1.2.3.4"
        )
        assert events[0]["action"] == "login"

    def test_ends_with_logout(self):
        events = generate_session_events(
            user_id=1, session_id="test-session",
            session_start=datetime(2024, 1, 1, 10, 0, 0),
            device="Mobile", browser="Chrome",
            city="Mumbai", ip="1.2.3.4"
        )
        assert events[-1]["action"] == "logout"

    def test_minimum_length(self):
        events = generate_session_events(
            user_id=1, session_id="test-session",
            session_start=datetime(2024, 1, 1, 10, 0, 0),
            device="Desktop", browser="Firefox",
            city="Delhi", ip="5.6.7.8"
        )
        # At minimum: login + 3 middle + logout = 5
        assert len(events) >= 5

    def test_all_required_fields_present(self):
        required_fields = [
            "user_id", "session_id", "timestamp", "ip_address",
            "device", "browser", "action", "city",
        ]
        events = generate_session_events(
            user_id=2, session_id="sess-abc",
            session_start=datetime(2024, 1, 1, 12, 0, 0),
            device="Tablet", browser="Safari",
            city="Bangalore", ip="9.10.11.12"
        )
        for event in events:
            for field in required_fields:
                assert field in event, f"Missing field: {field}"

    def test_timestamps_ascending(self):
        events = generate_session_events(
            user_id=3, session_id="sess-xyz",
            session_start=datetime(2024, 1, 1, 9, 0, 0),
            device="Mobile", browser="Chrome",
            city="Chennai", ip="13.14.15.16"
        )
        timestamps = [e["timestamp"] for e in events]
        assert timestamps == sorted(timestamps)


class TestGenerateClickstream:
    def test_returns_correct_count(self):
        events = generate_clickstream(num_events=100)
        assert len(events) == 100

    def test_all_actions_are_valid(self):
        events = generate_clickstream(num_events=500)
        valid_actions = set(ACTIONS) | {"page_scroll"}
        for event in events:
            assert event["action"] in valid_actions, f"Invalid action: {event['action']}"

    def test_sorted_by_timestamp(self):
        events = generate_clickstream(num_events=200)
        timestamps = [e["timestamp"] for e in events]
        assert timestamps == sorted(timestamps)

    def test_user_ids_within_range(self):
        from config.app_config import NUM_USERS
        events = generate_clickstream(num_events=300)
        for event in events:
            assert 1 <= event["user_id"] <= NUM_USERS


class TestSaveToCsv:
    def test_creates_file(self, tmp_path):
        events = generate_clickstream(num_events=10)
        filepath = str(tmp_path / "test_output.csv")
        save_to_csv(events, filepath)
        assert os.path.exists(filepath)

    def test_correct_row_count(self, tmp_path):
        events = generate_clickstream(num_events=50)
        filepath = str(tmp_path / "test_output.csv")
        save_to_csv(events, filepath)

        with open(filepath, "r") as f:
            reader = csv.reader(f)
            rows = list(reader)
        # +1 for header
        assert len(rows) == 51

    def test_header_correct(self, tmp_path):
        events = generate_clickstream(num_events=5)
        filepath = str(tmp_path / "test_header.csv")
        save_to_csv(events, filepath)

        with open(filepath, "r") as f:
            header = f.readline().strip().split(",")

        expected = [
            "user_id", "session_id", "timestamp", "ip_address",
            "device", "browser", "action", "product_id", "category",
            "search_query", "city", "page_url", "referrer_url",
        ]
        assert header == expected


class TestSampleRecords:
    def test_has_at_least_50_records(self):
        assert len(SAMPLE_RECORDS) >= 50

    def test_each_record_has_11_fields(self):
        for record in SAMPLE_RECORDS:
            assert len(record) == 11, f"Record has {len(record)} fields: {record}"
