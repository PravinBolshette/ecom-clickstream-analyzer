#!/usr/bin/env python3
"""
reducer_session_duration.py
───────────────────────────
MapReduce JOB 3 — Session Duration Reducer

Purpose:
    For each session, compute duration = last_event_time - first_event_time.

Input (stdin):
    session_id TAB user_id|timestamp (sorted by session_id)

Output (stdout):
    session_id | user_id | first_event | last_event | duration_seconds
"""

import sys
from datetime import datetime

TIMESTAMP_FMT = "%Y-%m-%d %H:%M:%S.%f"
TIMESTAMP_FMT2 = "%Y-%m-%d %H:%M:%S"


def parse_ts(ts_str: str) -> datetime:
    """Parse timestamp with or without milliseconds."""
    ts_str = ts_str.strip()
    try:
        return datetime.strptime(ts_str, TIMESTAMP_FMT)
    except ValueError:
        return datetime.strptime(ts_str, TIMESTAMP_FMT2)


def reducer():
    current_session = None
    timestamps      = []
    current_user    = None

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            session_id, value = line.split("\t", 1)
            user_id, timestamp_str = value.split("|", 1)
        except ValueError:
            continue

        if session_id == current_session:
            timestamps.append(parse_ts(timestamp_str))
        else:
            # Emit previous session
            if current_session is not None and timestamps:
                first = min(timestamps)
                last  = max(timestamps)
                duration = int((last - first).total_seconds())
                print(
                    f"{current_session}\t{current_user}\t"
                    f"{first.strftime(TIMESTAMP_FMT2)}\t"
                    f"{last.strftime(TIMESTAMP_FMT2)}\t"
                    f"{duration}"
                )

            current_session = session_id
            current_user    = user_id
            timestamps      = [parse_ts(timestamp_str)]

    # Emit last session
    if current_session is not None and timestamps:
        first    = min(timestamps)
        last     = max(timestamps)
        duration = int((last - first).total_seconds())
        print(
            f"{current_session}\t{current_user}\t"
            f"{first.strftime(TIMESTAMP_FMT2)}\t"
            f"{last.strftime(TIMESTAMP_FMT2)}\t"
            f"{duration}"
        )


if __name__ == "__main__":
    reducer()
