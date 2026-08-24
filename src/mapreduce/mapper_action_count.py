#!/usr/bin/env python3
"""
mapper_action_count.py
──────────────────────
MapReduce JOB 1 — Action Count Mapper

Purpose:
    Count how many times each action (login, search, product_view,
    add_to_cart, purchase, etc.) occurred across all clickstream events.

Input (stdin):
    CSV rows from clickstream_logs.csv
    Format: user_id,session_id,timestamp,ip_address,device,browser,
            action,product_id,category,search_query,city,page_url,referrer_url

Output (stdout):
    <action> TAB 1

Run standalone (test):
    cat data/raw/clickstream_logs.csv | python src/mapreduce/mapper_action_count.py

Hadoop Streaming:
    hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \
        -files src/mapreduce/mapper_action_count.py,src/mapreduce/reducer_action_count.py \
        -mapper  mapper_action_count.py \
        -reducer reducer_action_count.py \
        -input  /user/hadoop/clickstream/raw/clickstream_logs.csv \
        -output /user/hadoop/clickstream/output/action_count
"""

import sys

# ── Column indices in the CSV ──────────────────────────────────────────────
COL_ACTION = 6   # 0-indexed


def mapper():
    """
    Read lines from stdin, parse action field, emit (action, 1).
    """
    for line_num, line in enumerate(sys.stdin):
        line = line.strip()

        # Skip the CSV header row
        if line_num == 0 and line.startswith("user_id"):
            continue

        # Skip blank lines
        if not line:
            continue

        try:
            fields = line.split(",")
            if len(fields) < 7:
                continue

            action = fields[COL_ACTION].strip().lower()

            # Emit key-value pair: action → 1
            print(f"{action}\t1")

        except Exception:
            # Silently skip malformed rows in MapReduce
            continue


if __name__ == "__main__":
    mapper()
