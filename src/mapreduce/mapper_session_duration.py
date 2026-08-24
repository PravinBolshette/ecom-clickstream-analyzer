#!/usr/bin/env python3
"""
mapper_session_duration.py
──────────────────────────
MapReduce JOB 3 — Session Duration Mapper

Purpose:
    For each event, emit session_id with its timestamp so the reducer
    can compute (max_time - min_time) = session duration.

Input (stdin):
    CSV rows

Output (stdout):
    <session_id> TAB <timestamp>
"""

import sys

COL_SESSION   = 1
COL_TIMESTAMP = 2
COL_USER_ID   = 0


def mapper():
    for line_num, line in enumerate(sys.stdin):
        line = line.strip()

        if line_num == 0 and line.startswith("user_id"):
            continue
        if not line:
            continue

        try:
            fields = line.split(",")
            if len(fields) < 3:
                continue

            user_id    = fields[COL_USER_ID].strip()
            session_id = fields[COL_SESSION].strip()
            timestamp  = fields[COL_TIMESTAMP].strip()

            if not session_id or not timestamp:
                continue

            # Emit session_id → user_id|timestamp
            print(f"{session_id}\t{user_id}|{timestamp}")

        except Exception:
            continue


if __name__ == "__main__":
    mapper()
