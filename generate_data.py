"""
generate_data.py
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Generates synthetic e-commerce clickstream dataset 'clickstream.csv' with 100,000+ rows.

Schema:
- event_id   : E100001, E100002...
- user_id    : U101 to U5000
- session_id : S1001 to S20000
- timestamp  : ISO format (YYYY-MM-DD HH:MM:SS), spread across 24 hours
- action     : SEARCH (35%), VIEW (40%), ADD_TO_CART (18%), PURCHASE (7%)
- product_id : P1001 to P1050
- category   : Electronics, Fashion, Home, Sports, Books
- price      : numeric float (e.g., 19.99 to 999.99)
- device     : Mobile, Desktop, Tablet
- location   : Pune, Mumbai, Delhi, Bangalore, Hyderabad

Session-Level Logic:
- If a session contains a PURCHASE event, it MUST have had previous VIEW or ADD_TO_CART
  events for that session.
"""

import csv
import random
import uuid
from datetime import datetime, timedelta

try:
    from faker import Faker
    fake = Faker()
except ImportError:
    fake = None

# Configuration & Constants
NUM_EVENTS = 2000000
OUTPUT_FILE = "clickstream.csv"

USERS = [f"U{i}" for i in range(101, 5001)]
SESSIONS = [f"S{i}" for i in range(1001, 20001)]
PRODUCT_IDS = [f"P{i}" for i in range(1001, 1051)]

CATEGORIES = ["Electronics", "Fashion", "Home", "Sports", "Books"]
DEVICES = ["Mobile", "Desktop", "Tablet"]
LOCATIONS = ["Pune", "Mumbai", "Delhi", "Bangalore", "Hyderabad"]

# Map products to fixed categories and base price ranges for consistency
PRODUCT_CATALOG = {}
for p_id in PRODUCT_IDS:
    cat = random.choice(CATEGORIES)
    if cat == "Electronics":
        price = round(random.uniform(99.99, 1499.99), 2)
    elif cat == "Fashion":
        price = round(random.uniform(14.99, 199.99), 2)
    elif cat == "Home":
        price = round(random.uniform(29.99, 499.99), 2)
    elif cat == "Sports":
        price = round(random.uniform(19.99, 299.99), 2)
    else:  # Books
        price = round(random.uniform(9.99, 79.99), 2)
    PRODUCT_CATALOG[p_id] = {"category": cat, "price": price}

# Action Funnel Weights: SEARCH 35%, VIEW 40%, ADD_TO_CART 18%, PURCHASE 7%
ACTIONS = ["SEARCH", "VIEW", "ADD_TO_CART", "PURCHASE"]
ACTION_WEIGHTS = [0.35, 0.40, 0.18, 0.07]


def generate_clickstream_dataset(num_rows=NUM_EVENTS, output_file=OUTPUT_FILE):
    print(f"Generating {num_rows:,} synthetic clickstream events...")
    
    # Base timestamp set to today spread over 24 hours
    base_time = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    events = []
    event_counter = 100001
    
    # Session state tracking to enforce session-level funnel rules
    session_history = {}  # session_id -> list of actions performed in this session
    
    # Pre-assign session metadata so user, device, location remain consistent within a session
    session_meta = {}
    for sess_id in SESSIONS:
        session_meta[sess_id] = {
            "user_id": random.choice(USERS),
            "device": random.choice(DEVICES),
            "location": random.choice(LOCATIONS),
            "start_time": base_time + timedelta(seconds=random.randint(0, 86399))
        }

    while len(events) < num_rows:
        sess_id = random.choice(SESSIONS)
        meta = session_meta[sess_id]
        
        # Determine current timestamp within the session
        if sess_id not in session_history or not session_history[sess_id]:
            curr_time = meta["start_time"]
            session_history[sess_id] = []
        else:
            # Add 5 seconds to 5 minutes between events in the same session
            last_event_time = session_history[sess_id][-1]["timestamp_obj"]
            curr_time = last_event_time + timedelta(seconds=random.randint(5, 300))
        
        # Pick action based on funnel weights
        chosen_action = random.choices(ACTIONS, weights=ACTION_WEIGHTS, k=1)[0]
        
        # Session-Level Rule Enforcement:
        # If PURCHASE is chosen, ensure the session has prior VIEW or ADD_TO_CART
        past_actions = [e["action"] for e in session_history[sess_id]]
        if chosen_action == "PURCHASE" and ("VIEW" not in past_actions and "ADD_TO_CART" not in past_actions):
            # Demote action to VIEW if no prior viewing/cart action exists
            chosen_action = "VIEW"
        
        # Select product
        prod_id = random.choice(PRODUCT_IDS)
        prod_info = PRODUCT_CATALOG[prod_id]
        
        event = {
            "event_id": f"E{event_counter}",
            "user_id": meta["user_id"],
            "session_id": sess_id,
            "timestamp": curr_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "action": chosen_action,
            "product_id": prod_id,
            "category": prod_info["category"],
            "price": prod_info["price"],
            "device": meta["device"],
            "location": meta["location"],
            "timestamp_obj": curr_time
        }
        
        session_history[sess_id].append(event)
        events.append(event)
        event_counter += 1

    # Sort events by timestamp for realistic log sequence
    events.sort(key=lambda x: x["timestamp"])

    # Write to CSV
    fieldnames = [
        "event_id", "user_id", "session_id", "timestamp",
        "action", "product_id", "category", "price", "device", "location"
    ]

    with open(output_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for ev in events:
            row = {k: ev[k] for k in fieldnames}
            writer.writerow(row)

    print(f"Successfully generated {len(events):,} rows and saved to '{output_file}'.")


if __name__ == "__main__":
    generate_clickstream_dataset(NUM_EVENTS, OUTPUT_FILE)
