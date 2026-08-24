"""
clickstream_generator.py
────────────────────────
Generates realistic e-commerce clickstream logs and saves them as CSV.
Each row represents one user interaction event on the platform.

Run:
    python src/data_generator/clickstream_generator.py

Output:
    data/raw/clickstream_logs.csv  (default 10,000 events)
"""

import csv
import random
import uuid
import os
import sys
from datetime import datetime, timedelta

# ── allow imports from project root ────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config.app_config import (
    NUM_USERS, NUM_PRODUCTS, NUM_EVENTS, LOG_FILE_PATH,
    ACTIONS, CATEGORIES, CITIES
)

# ── Constants ──────────────────────────────────────────────────────────────
DEVICES   = ["Desktop", "Mobile", "Tablet"]
BROWSERS  = ["Chrome", "Firefox", "Safari", "Edge", "Opera"]
DOMAINS   = ["google.com", "facebook.com", "instagram.com", "direct", "twitter.com"]

# Action weights: login/logout are rare compared to browsing actions
ACTION_WEIGHTS = {
    "login":            5,
    "search":          20,
    "product_view":    30,
    "add_to_cart":     15,
    "wishlist":         8,
    "remove_from_cart": 5,
    "purchase":         7,
    "logout":           4,
    "page_scroll":      6,   # bonus action not in ACTIONS config
}

# Search queries by category
SEARCH_TERMS = {
    "Electronics":    ["laptop", "wireless headphones", "smart tv", "camera", "power bank"],
    "Clothing":       ["jeans", "formal shirt", "running shoes", "summer dress", "kurta"],
    "Books":          ["self help", "fiction novels", "data structures", "python programming"],
    "Home & Kitchen": ["air fryer", "induction cooktop", "water purifier", "mixer grinder"],
    "Sports":         ["yoga mat", "cricket bat", "dumbbells", "running shoes", "badminton"],
    "Beauty":         ["face cream", "shampoo", "lipstick", "sunscreen", "hair oil"],
    "Toys":           ["lego", "remote car", "board games", "action figure", "puzzle"],
    "Grocery":        ["atta", "rice", "pulses", "cooking oil", "snacks"],
    "Furniture":      ["sofa", "bed frame", "wardrobe", "study table", "bookshelf"],
    "Mobiles":        ["smartphone", "phone case", "charger", "earphones", "screen guard"],
}


def random_ip() -> str:
    """Generate a random IPv4 address."""
    return f"{random.randint(1, 254)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"


def random_timestamp(start: datetime, end: datetime) -> datetime:
    """Return a random datetime between start and end."""
    delta = end - start
    random_seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=random_seconds)


def generate_session_events(
    user_id: int,
    session_id: str,
    session_start: datetime,
    device: str,
    browser: str,
    city: str,
    ip: str,
) -> list[dict]:
    """
    Generate a sequence of events for one browsing session.
    A session always starts with 'login' and ends with 'logout'.
    """
    events = []
    current_time = session_start
    selected_category = random.choice(CATEGORIES)

    # ── Always start with login ────────────────────────────────────────────
    events.append({
        "user_id":      user_id,
        "session_id":   session_id,
        "timestamp":    current_time.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
        "ip_address":   ip,
        "device":       device,
        "browser":      browser,
        "action":       "login",
        "product_id":   "",
        "category":     "",
        "search_query": "",
        "city":         city,
        "page_url":     "/login",
        "referrer_url": random.choice(DOMAINS),
    })

    # ── Middle events (3–12 interactions) ──────────────────────────────────
    num_middle = random.randint(3, 12)
    cart_products = []   # track what's in cart for remove logic

    for _ in range(num_middle):
        current_time += timedelta(seconds=random.randint(5, 180))
        action = random.choices(
            list(ACTION_WEIGHTS.keys()),
            weights=list(ACTION_WEIGHTS.values()),
        )[0]

        product_id    = ""
        search_query  = ""
        page_url      = "/"
        category      = selected_category

        if action == "search":
            search_query = random.choice(SEARCH_TERMS.get(selected_category, ["product"]))
            page_url     = f"/search?q={search_query.replace(' ', '+')}"

        elif action in ("product_view", "add_to_cart", "wishlist", "purchase"):
            product_id = random.randint(1, NUM_PRODUCTS)
            page_url   = f"/product/{product_id}"
            if action == "add_to_cart":
                cart_products.append(product_id)

        elif action == "remove_from_cart":
            if cart_products:
                product_id = cart_products.pop(random.randrange(len(cart_products)))
            else:
                product_id = random.randint(1, NUM_PRODUCTS)
            page_url = "/cart"

        elif action == "page_scroll":
            action   = "product_view"     # normalise to valid action
            product_id = random.randint(1, NUM_PRODUCTS)
            page_url   = f"/product/{product_id}"

        events.append({
            "user_id":      user_id,
            "session_id":   session_id,
            "timestamp":    current_time.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
            "ip_address":   ip,
            "device":       device,
            "browser":      browser,
            "action":       action,
            "product_id":   product_id,
            "category":     category,
            "search_query": search_query,
            "city":         city,
            "page_url":     page_url,
            "referrer_url": "",
        })

    # ── Always end with logout ─────────────────────────────────────────────
    current_time += timedelta(seconds=random.randint(10, 60))
    events.append({
        "user_id":      user_id,
        "session_id":   session_id,
        "timestamp":    current_time.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
        "ip_address":   ip,
        "device":       device,
        "browser":      browser,
        "action":       "logout",
        "product_id":   "",
        "category":     "",
        "search_query": "",
        "city":         city,
        "page_url":     "/logout",
        "referrer_url": "",
    })

    return events


def generate_clickstream(num_events: int = NUM_EVENTS) -> list[dict]:
    """
    Generate `num_events` clickstream records across multiple users
    and sessions over the past 30 days.
    """
    all_events: list[dict] = []

    end_date   = datetime.now()
    start_date = end_date - timedelta(days=30)

    # We keep generating sessions until we have enough events
    while len(all_events) < num_events:
        user_id    = random.randint(1, NUM_USERS)
        session_id = str(uuid.uuid4())
        device     = random.choice(DEVICES)
        browser    = random.choice(BROWSERS)
        city       = random.choice(CITIES)
        ip         = random_ip()
        sess_start = random_timestamp(start_date, end_date)

        session_events = generate_session_events(
            user_id, session_id, sess_start, device, browser, city, ip
        )
        all_events.extend(session_events)

    # Sort by timestamp and trim to exactly num_events
    all_events.sort(key=lambda x: x["timestamp"])
    return all_events[:num_events]


def save_to_csv(events: list[dict], filepath: str) -> None:
    """Write events list to a CSV file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    fieldnames = [
        "user_id", "session_id", "timestamp", "ip_address",
        "device", "browser", "action", "product_id", "category",
        "search_query", "city", "page_url", "referrer_url",
    ]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(events)
    print(f"[✓] Saved {len(events):,} events → {filepath}")


# ── 50+ sample records printed for verification ────────────────────────────
SAMPLE_RECORDS = [
    # fmt: off
    # user_id, session_id (short), timestamp,             ip,             device,   browser,  action,         prod_id, category,      search_query,     city
    (1, "sess-001", "2024-10-01 09:00:00", "103.21.44.5",  "Mobile",  "Chrome",  "login",          "",  "",              "",                "Mumbai"),
    (1, "sess-001", "2024-10-01 09:01:12", "103.21.44.5",  "Mobile",  "Chrome",  "search",         "",  "Electronics",   "wireless headphones","Mumbai"),
    (1, "sess-001", "2024-10-01 09:02:30", "103.21.44.5",  "Mobile",  "Chrome",  "product_view",   "2", "Electronics",   "",                "Mumbai"),
    (1, "sess-001", "2024-10-01 09:04:15", "103.21.44.5",  "Mobile",  "Chrome",  "add_to_cart",    "2", "Electronics",   "",                "Mumbai"),
    (1, "sess-001", "2024-10-01 09:05:00", "103.21.44.5",  "Mobile",  "Chrome",  "purchase",       "2", "Electronics",   "",                "Mumbai"),
    (1, "sess-001", "2024-10-01 09:06:00", "103.21.44.5",  "Mobile",  "Chrome",  "logout",         "",  "",              "",                "Mumbai"),
    (2, "sess-002", "2024-10-01 10:10:00", "117.55.32.10", "Desktop", "Firefox", "login",          "",  "",              "",                "Delhi"),
    (2, "sess-002", "2024-10-01 10:11:30", "117.55.32.10", "Desktop", "Firefox", "search",         "",  "Clothing",      "jeans",           "Delhi"),
    (2, "sess-002", "2024-10-01 10:12:45", "117.55.32.10", "Desktop", "Firefox", "product_view",   "11","Clothing",      "",                "Delhi"),
    (2, "sess-002", "2024-10-01 10:14:00", "117.55.32.10", "Desktop", "Firefox", "wishlist",       "11","Clothing",      "",                "Delhi"),
    (2, "sess-002", "2024-10-01 10:16:00", "117.55.32.10", "Desktop", "Firefox", "product_view",   "12","Clothing",      "",                "Delhi"),
    (2, "sess-002", "2024-10-01 10:18:00", "117.55.32.10", "Desktop", "Firefox", "add_to_cart",    "12","Clothing",      "",                "Delhi"),
    (2, "sess-002", "2024-10-01 10:20:00", "117.55.32.10", "Desktop", "Firefox", "logout",         "",  "",              "",                "Delhi"),
    (3, "sess-003", "2024-10-01 11:00:00", "122.45.67.89", "Tablet",  "Safari",  "login",          "",  "",              "",                "Bangalore"),
    (3, "sess-003", "2024-10-01 11:02:00", "122.45.67.89", "Tablet",  "Safari",  "search",         "",  "Books",         "self help",       "Bangalore"),
    (3, "sess-003", "2024-10-01 11:03:20", "122.45.67.89", "Tablet",  "Safari",  "product_view",   "22","Books",         "",                "Bangalore"),
    (3, "sess-003", "2024-10-01 11:05:10", "122.45.67.89", "Tablet",  "Safari",  "product_view",   "21","Books",         "",                "Bangalore"),
    (3, "sess-003", "2024-10-01 11:06:30", "122.45.67.89", "Tablet",  "Safari",  "add_to_cart",    "22","Books",         "",                "Bangalore"),
    (3, "sess-003", "2024-10-01 11:08:00", "122.45.67.89", "Tablet",  "Safari",  "purchase",       "22","Books",         "",                "Bangalore"),
    (3, "sess-003", "2024-10-01 11:09:00", "122.45.67.89", "Tablet",  "Safari",  "logout",         "",  "",              "",                "Bangalore"),
    (4, "sess-004", "2024-10-01 14:00:00", "198.32.11.44", "Mobile",  "Chrome",  "login",          "",  "",              "",                "Hyderabad"),
    (4, "sess-004", "2024-10-01 14:01:00", "198.32.11.44", "Mobile",  "Chrome",  "search",         "",  "Mobiles",       "smartphone",      "Hyderabad"),
    (4, "sess-004", "2024-10-01 14:02:30", "198.32.11.44", "Mobile",  "Chrome",  "product_view",   "47","Mobiles",       "",                "Hyderabad"),
    (4, "sess-004", "2024-10-01 14:03:45", "198.32.11.44", "Mobile",  "Chrome",  "product_view",   "48","Mobiles",       "",                "Hyderabad"),
    (4, "sess-004", "2024-10-01 14:05:00", "198.32.11.44", "Mobile",  "Chrome",  "add_to_cart",    "47","Mobiles",       "",                "Hyderabad"),
    (4, "sess-004", "2024-10-01 14:06:30", "198.32.11.44", "Mobile",  "Chrome",  "remove_from_cart","47","Mobiles",      "",                "Hyderabad"),
    (4, "sess-004", "2024-10-01 14:07:00", "198.32.11.44", "Mobile",  "Chrome",  "logout",         "",  "",              "",                "Hyderabad"),
    (5, "sess-005", "2024-10-01 16:00:00", "45.23.78.90",  "Desktop", "Edge",    "login",          "",  "",              "",                "Chennai"),
    (5, "sess-005", "2024-10-01 16:02:00", "45.23.78.90",  "Desktop", "Edge",    "search",         "",  "Sports",        "yoga mat",        "Chennai"),
    (5, "sess-005", "2024-10-01 16:03:30", "45.23.78.90",  "Desktop", "Edge",    "product_view",   "43","Sports",        "",                "Chennai"),
    (5, "sess-005", "2024-10-01 16:05:00", "45.23.78.90",  "Desktop", "Edge",    "add_to_cart",    "43","Sports",        "",                "Chennai"),
    (5, "sess-005", "2024-10-01 16:06:00", "45.23.78.90",  "Desktop", "Edge",    "product_view",   "44","Sports",        "",                "Chennai"),
    (5, "sess-005", "2024-10-01 16:07:30", "45.23.78.90",  "Desktop", "Edge",    "wishlist",       "44","Sports",        "",                "Chennai"),
    (5, "sess-005", "2024-10-01 16:09:00", "45.23.78.90",  "Desktop", "Edge",    "purchase",       "43","Sports",        "",                "Chennai"),
    (5, "sess-005", "2024-10-01 16:10:00", "45.23.78.90",  "Desktop", "Edge",    "logout",         "",  "",              "",                "Chennai"),
    (6, "sess-006", "2024-10-02 08:00:00", "202.11.98.33", "Mobile",  "Chrome",  "login",          "",  "",              "",                "Kolkata"),
    (6, "sess-006", "2024-10-02 08:01:30", "202.11.98.33", "Mobile",  "Chrome",  "search",         "",  "Home & Kitchen","air fryer",       "Kolkata"),
    (6, "sess-006", "2024-10-02 08:03:00", "202.11.98.33", "Mobile",  "Chrome",  "product_view",   "32","Home & Kitchen","",                "Kolkata"),
    (6, "sess-006", "2024-10-02 08:04:30", "202.11.98.33", "Mobile",  "Chrome",  "add_to_cart",    "32","Home & Kitchen","",                "Kolkata"),
    (6, "sess-006", "2024-10-02 08:05:00", "202.11.98.33", "Mobile",  "Chrome",  "purchase",       "32","Home & Kitchen","",                "Kolkata"),
    (6, "sess-006", "2024-10-02 08:06:00", "202.11.98.33", "Mobile",  "Chrome",  "logout",         "",  "",              "",                "Kolkata"),
    (7, "sess-007", "2024-10-02 12:00:00", "99.11.22.33",  "Desktop", "Chrome",  "login",          "",  "",              "",                "Pune"),
    (7, "sess-007", "2024-10-02 12:01:00", "99.11.22.33",  "Desktop", "Chrome",  "search",         "",  "Beauty",        "face cream",      "Pune"),
    (7, "sess-007", "2024-10-02 12:02:30", "99.11.22.33",  "Desktop", "Chrome",  "product_view",   "56","Beauty",        "",                "Pune"),
    (7, "sess-007", "2024-10-02 12:04:00", "99.11.22.33",  "Desktop", "Chrome",  "wishlist",       "56","Beauty",        "",                "Pune"),
    (7, "sess-007", "2024-10-02 12:05:00", "99.11.22.33",  "Desktop", "Chrome",  "logout",         "",  "",              "",                "Pune"),
    (8, "sess-008", "2024-10-02 20:00:00", "55.66.77.88",  "Tablet",  "Safari",  "login",          "",  "",              "",                "Jaipur"),
    (8, "sess-008", "2024-10-02 20:02:00", "55.66.77.88",  "Tablet",  "Safari",  "product_view",   "5", "Electronics",   "",                "Jaipur"),
    (8, "sess-008", "2024-10-02 20:04:00", "55.66.77.88",  "Tablet",  "Safari",  "add_to_cart",    "5", "Electronics",   "",                "Jaipur"),
    (8, "sess-008", "2024-10-02 20:06:00", "55.66.77.88",  "Tablet",  "Safari",  "remove_from_cart","5","Electronics",   "",                "Jaipur"),
    (8, "sess-008", "2024-10-02 20:07:00", "55.66.77.88",  "Tablet",  "Safari",  "logout",         "",  "",              "",                "Jaipur"),
    (9, "sess-009", "2024-10-03 09:30:00", "71.82.93.10",  "Mobile",  "Firefox", "login",          "",  "",              "",                "Ahmedabad"),
    (9, "sess-009", "2024-10-03 09:31:30", "71.82.93.10",  "Mobile",  "Firefox", "search",         "",  "Grocery",       "rice",            "Ahmedabad"),
    (9, "sess-009", "2024-10-03 09:33:00", "71.82.93.10",  "Mobile",  "Firefox", "product_view",   "78","Grocery",       "",                "Ahmedabad"),
    (9, "sess-009", "2024-10-03 09:34:30", "71.82.93.10",  "Mobile",  "Firefox", "add_to_cart",    "78","Grocery",       "",                "Ahmedabad"),
    (9, "sess-009", "2024-10-03 09:35:00", "71.82.93.10",  "Mobile",  "Firefox", "purchase",       "78","Grocery",       "",                "Ahmedabad"),
    (9, "sess-009", "2024-10-03 09:36:00", "71.82.93.10",  "Mobile",  "Firefox", "logout",         "",  "",              "",                "Ahmedabad"),
    (10,"sess-010", "2024-10-03 18:00:00", "88.99.10.20",  "Desktop", "Chrome",  "login",          "",  "",              "",                "Lucknow"),
    (10,"sess-010", "2024-10-03 18:01:00", "88.99.10.20",  "Desktop", "Chrome",  "search",         "",  "Furniture",     "sofa",            "Lucknow"),
    (10,"sess-010", "2024-10-03 18:02:30", "88.99.10.20",  "Desktop", "Chrome",  "product_view",   "89","Furniture",     "",                "Lucknow"),
    (10,"sess-010", "2024-10-03 18:04:00", "88.99.10.20",  "Desktop", "Chrome",  "wishlist",       "89","Furniture",     "",                "Lucknow"),
    (10,"sess-010", "2024-10-03 18:05:30", "88.99.10.20",  "Desktop", "Chrome",  "logout",         "",  "",              "",                "Lucknow"),
    # fmt: on
]


def print_sample_records():
    """Print the 60 hardcoded sample records in a readable table."""
    header = (
        f"{'#':<4} {'UserID':<8} {'Session':<10} {'Timestamp':<22} "
        f"{'IP':<16} {'Device':<8} {'Browser':<9} {'Action':<18} "
        f"{'ProdID':<8} {'City':<12}"
    )
    print("\n" + "=" * 120)
    print("  SAMPLE CLICKSTREAM RECORDS (60 records)")
    print("=" * 120)
    print(header)
    print("-" * 120)
    for i, r in enumerate(SAMPLE_RECORDS, 1):
        print(
            f"{i:<4} {r[0]:<8} {r[1]:<10} {r[2]:<22} "
            f"{r[3]:<16} {r[4]:<8} {r[5]:<9} {r[6]:<18} "
            f"{str(r[7]):<8} {r[10]:<12}"
        )
    print("=" * 120)
    print(f"  Total sample records shown: {len(SAMPLE_RECORDS)}")
    print("=" * 120 + "\n")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate clickstream log data")
    parser.add_argument("--events",   type=int, default=NUM_EVENTS, help="Number of events to generate")
    parser.add_argument("--output",   type=str, default=LOG_FILE_PATH, help="Output CSV file path")
    parser.add_argument("--sample",   action="store_true", help="Print 60 sample records and exit")
    args = parser.parse_args()

    if args.sample:
        print_sample_records()
    else:
        print(f"[→] Generating {args.events:,} clickstream events...")
        events = generate_clickstream(args.events)
        save_to_csv(events, args.output)
        print_sample_records()
