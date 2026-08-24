#!/usr/bin/env python3
"""
reducer.py
──────────
Hadoop Streaming Reducer for E-Commerce Clickstream Logs.

Aggregates mapper output for Funnel, Hourly Traffic, and Product Metrics.
"""

import sys

def main():
    current_key = None
    current_count = 0

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            parts = line.split('\t')
            if len(parts) == 3:
                metric_type, key, count_str = parts
                full_key = f"{metric_type}\t{key}"
                count = int(count_str)
            elif len(parts) == 2:
                full_key, count_str = parts
                count = int(count_str)
            else:
                continue

            if current_key == full_key:
                current_count += count
            else:
                if current_key:
                    print(f"{current_key}\t{current_count}")
                current_key = full_key
                current_count = count

        except ValueError:
            continue

    if current_key:
        print(f"{current_key}\t{current_count}")

if __name__ == "__main__":
    main()
