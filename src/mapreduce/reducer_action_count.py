#!/usr/bin/env python3
"""
reducer_action_count.py
───────────────────────
MapReduce JOB 1 — Action Count Reducer

Purpose:
    Sum up the count emitted by the mapper for each action type.

Input (stdin):
    Sorted key-value pairs from mapper:
        login   1
        login   1
        search  1
        ...

Output (stdout):
    <action> TAB <total_count>
    e.g.
        add_to_cart     1523
        login           982
        logout          978
        product_view    4201
        purchase        612
        remove_from_cart 304
        search          1890
        wishlist        510
"""

import sys


def reducer():
    """
    Accumulate counts for each action key.
    Input must be sorted by key (Hadoop guarantees this).
    """
    current_action = None
    current_count  = 0

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            action, count_str = line.split("\t", 1)
            count = int(count_str)
        except ValueError:
            continue

        if action == current_action:
            # Same key — accumulate
            current_count += count
        else:
            # New key — emit previous key's result
            if current_action is not None:
                print(f"{current_action}\t{current_count}")
            current_action = action
            current_count  = count

    # Emit the last key
    if current_action is not None:
        print(f"{current_action}\t{current_count}")


if __name__ == "__main__":
    reducer()
