"""
recommendation.py
─────────────────
Machine Learning Enhancement — Product Recommendation System

Approaches implemented:
1. Collaborative Filtering  — User-Item matrix with cosine similarity
2. Content-Based Filtering  — Category / product attribute matching
3. Purchase Probability      — Logistic Regression on session features

Usage:
    python src/ml/recommendation.py --user_id 5 --top_n 5
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from config.app_config import LOG_FILE_PATH, NUM_PRODUCTS


# ── 1. Collaborative Filtering ─────────────────────────────────────────────

def build_user_item_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build a User × Product interaction matrix.
    Values encode action weights:
        product_view  → 1
        add_to_cart   → 3
        wishlist      → 2
        purchase      → 5
    """
    weight_map = {
        "product_view":    1,
        "add_to_cart":     3,
        "wishlist":        2,
        "purchase":        5,
        "remove_from_cart":-1,
    }

    # Filter to product interaction events
    interaction_df = df[
        df["action"].isin(weight_map.keys()) &
        df["product_id"].notna()
    ].copy()

    interaction_df["product_id"] = interaction_df["product_id"].astype(int)
    interaction_df["weight"]     = interaction_df["action"].map(weight_map)

    # Aggregate by user × product
    agg = (
        interaction_df.groupby(["user_id", "product_id"])["weight"]
        .sum()
        .reset_index()
    )

    # Pivot to matrix form
    matrix = agg.pivot_table(
        index="user_id", columns="product_id", values="weight", fill_value=0
    )
    return matrix


def collaborative_recommend(user_id: int, matrix: pd.DataFrame, top_n: int = 5) -> list[int]:
    """
    Find similar users using cosine similarity, then recommend products
    that the similar users interacted with but the target user hasn't.

    Returns: list of recommended product_ids
    """
    if user_id not in matrix.index:
        # New user: return most popular products (cold start)
        return list(matrix.sum(axis=0).nlargest(top_n).index)

    # Compute cosine similarity between all users
    sim_matrix = cosine_similarity(matrix.values)
    sim_df     = pd.DataFrame(sim_matrix, index=matrix.index, columns=matrix.index)

    # Get top-5 similar users (excluding self)
    similar_users = (
        sim_df[user_id]
        .drop(user_id)
        .nlargest(5)
        .index.tolist()
    )

    # Products the target user has interacted with
    user_products = set(matrix.columns[matrix.loc[user_id] > 0])

    # Products popular among similar users but not yet seen by target
    candidate_scores: dict = {}
    for su in similar_users:
        similarity_score = sim_df.loc[user_id, su]
        products_of_su   = matrix.loc[su]
        for prod_id, score in products_of_su.items():
            if prod_id not in user_products and score > 0:
                candidate_scores[prod_id] = (
                    candidate_scores.get(prod_id, 0) + score * similarity_score
                )

    # Sort by score and return top_n
    recommended = sorted(candidate_scores, key=candidate_scores.get, reverse=True)[:top_n]

    # Fallback if not enough candidates
    if len(recommended) < top_n:
        remaining = [p for p in matrix.columns if p not in user_products and p not in recommended]
        recommended += remaining[: top_n - len(recommended)]

    return recommended


# ── 2. Content-Based Filtering ─────────────────────────────────────────────

def content_based_recommend(
    user_id: int, df: pd.DataFrame, top_n: int = 5
) -> list[int]:
    """
    Recommend products from the same categories the user most frequently
    browses, weighted by view and purchase counts.
    """
    user_df = df[(df["user_id"] == user_id) & df["category"].notna()]

    if user_df.empty:
        return []

    # Identify user's preferred categories
    pref_categories = (
        user_df[user_df["action"].isin(["product_view","purchase","add_to_cart","wishlist"])]
        ["category"]
        .value_counts()
        .head(3)
        .index.tolist()
    )

    # Get products in those categories that user hasn't purchased
    purchased = set(
        user_df[user_df["action"] == "purchase"]["product_id"]
        .dropna().astype(int).tolist()
    )

    candidate_products = (
        df[
            df["category"].isin(pref_categories) &
            df["product_id"].notna()
        ]["product_id"]
        .astype(int)
        .value_counts()
        .drop(labels=[p for p in purchased if p in df["product_id"].values], errors="ignore")
        .head(top_n)
        .index.tolist()
    )

    return candidate_products


# ── 3. Purchase Probability Model ──────────────────────────────────────────

def extract_session_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create feature vectors per session for the purchase probability model.

    Features:
    - num_product_views
    - num_searches
    - num_add_to_cart
    - num_remove_from_cart
    - num_wishlist
    - session_duration_minutes
    - device_encoded
    - hour_of_day
    - is_weekend
    - purchased (target label)
    """
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["hour"]       = df["timestamp"].dt.hour
    df["is_weekend"] = df["timestamp"].dt.dayofweek.isin([5, 6]).astype(int)

    le_device = LabelEncoder()
    df["device_enc"] = le_device.fit_transform(df["device"].fillna("Unknown"))

    # Group by session
    session_features = df.groupby("session_id").agg(
        num_product_views   =("action", lambda x: (x == "product_view").sum()),
        num_searches        =("action", lambda x: (x == "search").sum()),
        num_add_to_cart     =("action", lambda x: (x == "add_to_cart").sum()),
        num_remove_from_cart=("action", lambda x: (x == "remove_from_cart").sum()),
        num_wishlist        =("action", lambda x: (x == "wishlist").sum()),
        session_duration_sec=(
            "timestamp",
            lambda x: (x.max() - x.min()).total_seconds()
        ),
        device_enc          =("device_enc", "first"),
        hour_of_day         =("hour", "first"),
        is_weekend          =("is_weekend", "first"),
        purchased           =("action", lambda x: int((x == "purchase").any())),
    ).reset_index()

    session_features["session_duration_min"] = (
        session_features["session_duration_sec"] / 60.0
    )

    return session_features


def train_purchase_probability_model(df: pd.DataFrame):
    """
    Train a Logistic Regression model to predict purchase probability.
    Returns: trained model, scaler, feature_cols, accuracy
    """
    session_df = extract_session_features(df)

    feature_cols = [
        "num_product_views", "num_searches", "num_add_to_cart",
        "num_remove_from_cart", "num_wishlist",
        "session_duration_min", "device_enc", "hour_of_day", "is_weekend",
    ]

    X = session_df[feature_cols].fillna(0)
    y = session_df["purchased"]

    # Need at least 2 classes
    if y.nunique() < 2:
        print("[!] Not enough purchase variety to train. Generate more data.")
        return None, None, feature_cols, 0.0

    scaler     = StandardScaler()
    X_scaled   = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    model = LogisticRegression(max_iter=500, random_state=42, class_weight="balanced")
    model.fit(X_train, y_train)

    y_pred   = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n[✓] Purchase Probability Model Accuracy: {accuracy:.2%}")
    print(classification_report(y_test, y_pred, target_names=["No Purchase", "Purchase"]))

    return model, scaler, feature_cols, accuracy


def predict_purchase_probability(
    model, scaler, feature_cols: list, session_features: dict
) -> float:
    """
    Predict the probability that a given session will result in a purchase.

    session_features: dict with keys matching feature_cols
    Returns: probability (0.0 – 1.0)
    """
    if model is None:
        return 0.0

    feat_vector = np.array([[session_features.get(col, 0) for col in feature_cols]])
    feat_scaled = scaler.transform(feat_vector)
    prob        = model.predict_proba(feat_scaled)[0][1]
    return round(float(prob), 4)


# ── Main Demo ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Recommendation System Demo")
    parser.add_argument("--user_id", type=int, default=1, help="Target user ID")
    parser.add_argument("--top_n",   type=int, default=5, help="Number of recommendations")
    args = parser.parse_args()

    if not os.path.exists(LOG_FILE_PATH):
        print(f"[!] Data file not found: {LOG_FILE_PATH}")
        print("    Run: python src/data_generator/clickstream_generator.py")
        return

    print(f"[→] Loading data from {LOG_FILE_PATH}...")
    df = pd.read_csv(LOG_FILE_PATH)
    df["product_id"] = pd.to_numeric(df["product_id"], errors="coerce")

    print("\n" + "=" * 60)
    print(f"  RECOMMENDATIONS for User #{args.user_id}")
    print("=" * 60)

    # ── Collaborative Filtering ────────────────────────────────────────────
    print("\n[1] Collaborative Filtering:")
    matrix = build_user_item_matrix(df)
    cf_recs = collaborative_recommend(args.user_id, matrix, args.top_n)
    for i, p in enumerate(cf_recs, 1):
        print(f"    {i}. Product #{p}")

    # ── Content-Based Filtering ───────────────────────────────────────────
    print("\n[2] Content-Based Filtering:")
    cb_recs = content_based_recommend(args.user_id, df, args.top_n)
    for i, p in enumerate(cb_recs, 1):
        print(f"    {i}. Product #{p}")

    # ── Purchase Probability Model ────────────────────────────────────────
    print("\n[3] Training Purchase Probability Model...")
    model, scaler, feature_cols, accuracy = train_purchase_probability_model(df)

    # Simulate a new session
    example_session = {
        "num_product_views":    3,
        "num_searches":         1,
        "num_add_to_cart":      2,
        "num_remove_from_cart": 0,
        "num_wishlist":         1,
        "session_duration_min": 8.5,
        "device_enc":           1,
        "hour_of_day":          14,
        "is_weekend":           0,
    }
    prob = predict_purchase_probability(model, scaler, feature_cols, example_session)
    print(f"\n    Example session purchase probability: {prob:.1%}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
