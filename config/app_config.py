"""
app_config.py
─────────────
Central configuration for the Clickstream Analyzer project.
All environment-sensitive values can be overridden via .env file.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── MySQL ──────────────────────────────────────────────────────────────────
MYSQL_HOST     = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT     = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER     = os.getenv("MYSQL_USER", "ecom_user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "ecom@1234")
MYSQL_DB       = os.getenv("MYSQL_DB", "ecommerce_db")

# ── HDFS ───────────────────────────────────────────────────────────────────
HDFS_NAMENODE  = os.getenv("HDFS_NAMENODE", "hdfs://namenode:9000")
HDFS_LOG_DIR   = "/user/hadoop/clickstream/raw"
HDFS_OUTPUT_DIR = "/user/hadoop/clickstream/output"

# ── Data Generator ─────────────────────────────────────────────────────────
NUM_USERS      = 200
NUM_PRODUCTS   = 100
NUM_EVENTS     = 10_000        # events to generate
LOG_FILE_PATH  = "data/raw/clickstream_logs.csv"

# ── Dashboard ──────────────────────────────────────────────────────────────
DASHBOARD_TITLE = "E-Commerce Clickstream Analytics"
DASHBOARD_ICON  = "🛒"

# ── Actions supported by the platform ─────────────────────────────────────
ACTIONS = [
    "login",
    "search",
    "product_view",
    "add_to_cart",
    "wishlist",
    "remove_from_cart",
    "purchase",
    "logout",
]

# ── Product categories ──────────────────────────────────────────────────────
CATEGORIES = [
    "Electronics",
    "Clothing",
    "Books",
    "Home & Kitchen",
    "Sports",
    "Beauty",
    "Toys",
    "Grocery",
    "Furniture",
    "Mobiles",
]

# ── Indian cities (for geo-analysis) ───────────────────────────────────────
CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
    "Surat", "Nagpur", "Indore", "Bhopal", "Chandigarh",
]
