#!/usr/bin/env python3
"""
mapper_product_views.py
───────────────────────
MapReduce JOB 2 — Product View Count Mapper

Purpose:
    For every 'product_view' event, emit the product_id with a count of 1.
    This identifies which products are viewed most often.

Input (stdin):
    CSV rows from clickstream_logs.csv

Output (stdout):
    <product_id> TAB 1          (only for product_view actions)

Processing Logic:
    - Filter: only rows where action == 'product_view'
    - Key:    product_id
    - Value:  1
"""

import sys

# Column indices
COL_ACTION     = 6
COL_PRODUCT_ID = 7
COL_CATEGORY   = 8


def mapper():
    for line_num, line in enumerate(sys.stdin):
        line = line.strip()

        # Skip header
        if line_num == 0 and line.startswith("user_id"):
            continue

        if not line:
            continue

        try:
            fields = line.split(",")
            if len(fields) < 9:
                continue

            action     = fields[COL_ACTION].strip().lower()
            product_id = fields[COL_PRODUCT_ID].strip()
            category   = fields[COL_CATEGORY].strip()

            # ── Filter: only product_view events ──────────────────────────
            if action != "product_view":
                continue

            # Skip if no product_id
            if not product_id:
                continue

            # Emit: product_id|category → 1
            # (We include category so the reducer can output it)
            print(f"{product_id}|{category}\t1")

        except Exception:
            continue


if __name__ == "__main__":
    mapper()
