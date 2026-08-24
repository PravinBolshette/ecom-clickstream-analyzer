"""
test_mapreduce.py
─────────────────
Unit tests for MapReduce mapper and reducer scripts.
Tests run the scripts locally via subprocess (simulates Hadoop Streaming).

Run:
    python -m pytest tests/test_mapreduce.py -v
"""

import sys
import os
import subprocess
import pytest

MAPPER_ACTION   = "src/mapreduce/mapper_action_count.py"
REDUCER_ACTION  = "src/mapreduce/reducer_action_count.py"
MAPPER_PRODUCT  = "src/mapreduce/mapper_product_views.py"
REDUCER_PRODUCT = "src/mapreduce/reducer_product_views.py"

# Sample input CSV rows (no header, or with header first)
SAMPLE_CSV_LINES = """user_id,session_id,timestamp,ip_address,device,browser,action,product_id,category,search_query,city,page_url,referrer_url
1,sess-001,2024-01-01 10:00:00,1.2.3.4,Mobile,Chrome,login,,,,Mumbai,/login,google.com
1,sess-001,2024-01-01 10:01:00,1.2.3.4,Mobile,Chrome,search,,Electronics,wireless headphones,Mumbai,/search,
1,sess-001,2024-01-01 10:02:00,1.2.3.4,Mobile,Chrome,product_view,2,Electronics,,Mumbai,/product/2,
1,sess-001,2024-01-01 10:03:00,1.2.3.4,Mobile,Chrome,add_to_cart,2,Electronics,,Mumbai,/cart,
1,sess-001,2024-01-01 10:04:00,1.2.3.4,Mobile,Chrome,product_view,5,Electronics,,Mumbai,/product/5,
2,sess-002,2024-01-01 11:00:00,5.6.7.8,Desktop,Firefox,login,,,,Delhi,/login,
2,sess-002,2024-01-01 11:01:00,5.6.7.8,Desktop,Firefox,product_view,2,Electronics,,Delhi,/product/2,
2,sess-002,2024-01-01 11:02:00,5.6.7.8,Desktop,Firefox,purchase,2,Electronics,,Delhi,/checkout,
2,sess-002,2024-01-01 11:03:00,5.6.7.8,Desktop,Firefox,logout,,,,Delhi,/logout,"""


def run_script(script: str, stdin_data: str) -> str:
    """Run a Python script with stdin_data and return stdout."""
    result = subprocess.run(
        [sys.executable, script],
        input=stdin_data,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"Script failed:\n{result.stderr}"
    return result.stdout.strip()


class TestActionCountMapper:
    def test_emits_tab_separated_pairs(self):
        output = run_script(MAPPER_ACTION, SAMPLE_CSV_LINES)
        for line in output.split("\n"):
            assert "\t" in line, f"No tab in line: {line}"

    def test_emits_correct_actions(self):
        output = run_script(MAPPER_ACTION, SAMPLE_CSV_LINES)
        actions = [line.split("\t")[0] for line in output.split("\n") if line]
        expected = ["login", "search", "product_view", "add_to_cart",
                    "product_view", "login", "product_view", "purchase", "logout"]
        assert actions == expected

    def test_values_are_all_one(self):
        output = run_script(MAPPER_ACTION, SAMPLE_CSV_LINES)
        for line in output.split("\n"):
            if line:
                parts = line.split("\t")
                assert parts[1] == "1", f"Expected value '1', got '{parts[1]}'"

    def test_skips_header(self):
        # If header is included in output that would be wrong
        output = run_script(MAPPER_ACTION, SAMPLE_CSV_LINES)
        actions = [line.split("\t")[0] for line in output.split("\n") if line]
        assert "user_id" not in actions

    def test_handles_empty_input(self):
        output = run_script(MAPPER_ACTION, "")
        assert output == ""


class TestActionCountReducer:
    def _sorted_mapper_output(self) -> str:
        """Get mapper output, sort it (as Hadoop would), return as string."""
        raw = run_script(MAPPER_ACTION, SAMPLE_CSV_LINES)
        lines = sorted(raw.split("\n"))
        return "\n".join(lines)

    def test_reduces_to_unique_keys(self):
        sorted_input = self._sorted_mapper_output()
        output = run_script(REDUCER_ACTION, sorted_input)
        keys = [line.split("\t")[0] for line in output.split("\n") if line]
        assert len(keys) == len(set(keys)), "Duplicate keys in reducer output"

    def test_correct_counts(self):
        sorted_input = self._sorted_mapper_output()
        output = run_script(REDUCER_ACTION, sorted_input)
        result = {}
        for line in output.split("\n"):
            if line:
                k, v = line.split("\t")
                result[k] = int(v)

        # From our sample: product_view appears 3 times
        assert result.get("product_view") == 3
        # login appears 2 times
        assert result.get("login") == 2
        # purchase appears 1 time
        assert result.get("purchase") == 1

    def test_output_values_are_integers(self):
        sorted_input = self._sorted_mapper_output()
        output = run_script(REDUCER_ACTION, sorted_input)
        for line in output.split("\n"):
            if line:
                parts = line.split("\t")
                assert parts[1].isdigit(), f"Non-integer value: {parts[1]}"


class TestProductViewMapper:
    def test_only_emits_for_product_view(self):
        output = run_script(MAPPER_PRODUCT, SAMPLE_CSV_LINES)
        lines = [l for l in output.split("\n") if l]
        # From sample: 3 product_view events all have product_ids
        assert len(lines) == 3

    def test_key_contains_product_and_category(self):
        output = run_script(MAPPER_PRODUCT, SAMPLE_CSV_LINES)
        for line in output.split("\n"):
            if line:
                key = line.split("\t")[0]
                assert "|" in key, f"Key missing category separator: {key}"


class TestProductViewReducer:
    def test_sums_product_views(self):
        # Create mapper output with duplicate product
        mapper_output = "2|Electronics\t1\n2|Electronics\t1\n5|Electronics\t1"
        output = run_script(REDUCER_PRODUCT, mapper_output)
        lines = [l for l in output.split("\n") if l]

        # Product 2 should have count 2
        product2_line = [l for l in lines if l.startswith("2\t")]
        assert len(product2_line) == 1
        assert product2_line[0].split("\t")[2] == "2"

    def test_sorted_descending_by_count(self):
        mapper_output = (
            "5|Electronics\t1\n"
            "2|Electronics\t1\n2|Electronics\t1\n2|Electronics\t1\n"
            "10|Clothing\t1\n10|Clothing\t1\n"
        )
        # Sort as Hadoop would
        sorted_input = "\n".join(sorted(mapper_output.strip().split("\n")))
        output = run_script(REDUCER_PRODUCT, sorted_input)
        counts = [int(line.split("\t")[2]) for line in output.split("\n") if line]
        assert counts == sorted(counts, reverse=True)
