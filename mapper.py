#!/usr/bin/env python3
"""
mapper.py
─────────
Hadoop Streaming Mapper for E-Commerce Clickstream Logs.

Calculates key-value pairs for:
1. Funnel Counts: FUNNEL\t<action>\t1
2. Hourly Traffic: HOURLY\t<hour>\t1
3. Product Views: PROD_VIEW\t<product_id>\t1
4. Product Purchases: PROD_PURCHASE\t<product_id>\t1
"""

import sys

def parse_hour(timestamp_str):
    """
    Extract 2-digit hour (00-23) from ISO or standard timestamp.
    Example formats: '2026-08-16T14:30:00Z', '2026-08-16 14:30:00'
    """
    try:
        if 'T' in timestamp_str:
            time_part = timestamp_str.split('T')[1]
        else:
            time_part = timestamp_str.split(' ')[1]
        hour = time_part.split(':')[0]
        if len(hour) == 2 and hour.isdigit():
            return hour
    except Exception:
        pass
    return "00"

def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        # Skip CSV Header
        if line.startswith("event_id") or line.startswith("user_id"):
            continue

        try:
            fields = line.split(',')
            if len(fields) < 10:
                continue

            event_id   = fields[0].strip()
            user_id    = fields[1].strip()
            session_id = fields[2].strip()
            timestamp  = fields[3].strip()
            action     = fields[4].strip().upper()
            product_id = fields[5].strip()

            # 1. Funnel Metric
            if action in ["SEARCH", "VIEW", "ADD_TO_CART", "PURCHASE"]:
                print("FUNNEL\t{}\t1".format(action))

            # 2. Hourly Traffic Metric
            hour = parse_hour(timestamp)
            print("HOURLY\t{}\t1".format(hour))

            # 3. Product Metrics
            if product_id:
                if action == "VIEW":
                    print("PROD_VIEW\t{}\t1".format(product_id))
                elif action == "PURCHASE":
                    print("PROD_PURCHASE\t{}\t1".format(product_id))

        except Exception as e:
            # Safely skip malformed lines
            continue

if __name__ == "__main__":
    main()
