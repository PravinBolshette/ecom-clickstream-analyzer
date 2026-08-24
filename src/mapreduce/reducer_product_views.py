#!/usr/bin/env python3
"""
reducer_product_views.py
────────────────────────
MapReduce JOB 2 — Product View Count Reducer

Purpose:
    Sum view counts for each product_id.

Input (stdin):
    Sorted mapper output:
        2|Electronics   1
        2|Electronics   1
        11|Clothing     1
        ...

Output (stdout):
    product_id | category | view_count
    Sorted in descending order (via secondary sort or post-processing).
"""

import sys


def reducer():
    current_key   = None
    current_count = 0
    results       = []   # collect all to allow sort by count

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            key, count_str = line.split("\t", 1)
            count = int(count_str)
        except ValueError:
            continue

        if key == current_key:
            current_count += count
        else:
            if current_key is not None:
                results.append((current_key, current_count))
            current_key   = key
            current_count = count

    if current_key is not None:
        results.append((current_key, current_count))

    # Sort by view count descending and emit
    results.sort(key=lambda x: x[1], reverse=True)
    for key, count in results:
        product_id, category = key.split("|", 1) if "|" in key else (key, "Unknown")
        print(f"{product_id}\t{category}\t{count}")


if __name__ == "__main__":
    reducer()
