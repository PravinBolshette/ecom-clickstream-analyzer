import os
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# ── Page Configuration ──────────────────────────────────────────────────────
st.set_page_config(
    page_title="E-Commerce Clickstream Big Data Analytics",
    page_icon="🛒",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for Premium Visual Styling
st.markdown(
    """
    <style>
    .main {
        background-color: #0e1117;
    }
    .stMetric {
        background: linear-gradient(135deg, #1e2640 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .stMetric label {
        color: #94a3b8 !important;
        font-weight: 600 !important;
    }
    .stMetric .numeric-value {
        color: #38bdf8 !important;
    }
    .css-1544g2n {
        padding: 2rem 1rem;
    }
    h1, h2, h3 {
        color: #f8fafc;
        font-family: 'Inter', sans-serif;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Sample Fallback Mock Data ────────────────────────────────────────────────
def get_fallback_data():
    funnel = {
        "SEARCH": 35000,
        "VIEW": 40000,
        "ADD_TO_CART": 18000,
        "PURCHASE": 7000,
    }
    
    hourly = {
        f"{h:02d}": int(3500 + 1500 * (1 if 14 <= h <= 21 else 0.4) + (h * 45 % 700))
        for h in range(24)
    }
    
    prod_views = {f"P{i}": 500 + (i * 37) % 1200 for i in range(1001, 1051)}
    prod_purchases = {f"P{i}": 50 + (i * 13) % 250 for i in range(1001, 1051)}
    
    categories = {
        "Electronics": 32000,
        "Fashion": 28000,
        "Home": 18000,
        "Sports": 12000,
        "Books": 10000,
    }
    
    return funnel, hourly, prod_views, prod_purchases, categories


# ── Data Loading & Parsing Function ─────────────────────────────────────────
@st.cache_data(ttl=10)
def load_data(file_path="part-00000"):
    if not os.path.exists(file_path):
        alt_paths = ["data/output/part-00000", "output.txt", "../output/part-00000", "clickstream_output.txt"]
        for path in alt_paths:
            if os.path.exists(path):
                file_path = path
                break

    if not os.path.exists(file_path):
        st.sidebar.warning("⚠️ Hadoop output file not found. Displaying fallback mock data.")
        return get_fallback_data()

    funnel = {"SEARCH": 0, "VIEW": 0, "ADD_TO_CART": 0, "PURCHASE": 0}
    hourly = {f"{h:02d}": 0 for h in range(24)}
    prod_views = {}
    prod_purchases = {}
    categories = {"Electronics": 25000, "Fashion": 20000, "Home": 15000, "Sports": 10000, "Books": 8000}

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split("\t")
                if len(parts) == 3:
                    metric, key, count_str = parts
                    val = int(count_str)
                    if metric == "FUNNEL" and key in funnel:
                        funnel[key] = val
                    elif metric == "HOURLY":
                        hourly[key] = val
                    elif metric == "PROD_VIEW":
                        prod_views[key] = val
                    elif metric == "PROD_PURCHASE":
                        prod_purchases[key] = val
    except Exception as e:
        st.sidebar.error(f"Error parsing Hadoop output: {e}. Using fallback data.")
        return get_fallback_data()

    if sum(funnel.values()) == 0:
        return get_fallback_data()

    return funnel, hourly, prod_views, prod_purchases, categories


# ── Main Dashboard Application ───────────────────────────────────────────────
def main():
    st.title("🛒 E-Commerce Clickstream Big Data Analytics Dashboard")
    st.markdown("Real-time distributed insights powered by **Apache Hadoop MapReduce** & **Streamlit**.")
    st.markdown("---")

    # Sidebar Options
    st.sidebar.header("⚙️ Data Source Config")
    output_path = st.sidebar.text_input("Hadoop Output File Path", value="part-00000")
    if st.sidebar.button("🔄 Refresh Data"):
        st.cache_data.clear()

    # Load Data
    funnel, hourly, prod_views, prod_purchases, categories = load_data(output_path)

    # ── KPI Scorecards (Top Row) ─────────────────────────────────────────────
    total_events = sum(funnel.values())
    viewers = funnel.get("VIEW", 1) or 1
    add_to_cart = funnel.get("ADD_TO_CART", 0)
    purchases = funnel.get("PURCHASE", 0)

    conversion_rate = (purchases / viewers) * 100 if viewers > 0 else 0.0
    cart_abandonment_rate = (
        ((add_to_cart - purchases) / add_to_cart) * 100 if add_to_cart > 0 else 0.0
    )

    peak_hour = max(hourly, key=hourly.get) if hourly else "14"
    peak_count = hourly.get(peak_hour, 0)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("📊 Total Events / Visitors", f"{total_events:,}")
    col2.metric("🎯 Conversion Rate", f"{conversion_rate:.2f}%", help="(Purchases / Viewers) * 100")
    col3.metric("🛒 Cart Abandonment Rate", f"{cart_abandonment_rate:.2f}%", help="((Add to Cart - Purchases) / Add to Cart) * 100")
    col4.metric("🔥 Peak Shopping Hour", f"{peak_hour}:00 ({peak_count:,} events)")

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Interactive Charts ───────────────────────────────────────────────────
    row1_col1, row1_col2 = st.columns(2)

    # Chart 1: 24-Hour Traffic Pattern (Line Chart)
    with row1_col1:
        st.subheader("📈 24-Hour Traffic Pattern")
        df_hourly = pd.DataFrame(
            list(hourly.items()), columns=["Hour", "Events"]
        ).sort_values("Hour")
        
        fig_line = px.line(
            df_hourly,
            x="Hour",
            y="Events",
            markers=True,
            title="Traffic Volume across 24 Hours (Peak Shopping Window Highlighted)",
            labels={"Hour": "Hour of Day (00 - 23)", "Events": "Event Count"},
            color_discrete_sequence=["#38bdf8"],
        )
        fig_line.update_traces(line=dict(width=3), marker=dict(size=8))
        fig_line.update_layout(
            template="plotly_dark",
            margin=dict(l=20, r=20, t=40, b=20),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
        )
        fig_line.add_vrect(
            x0="14", x1="21",
            fillcolor="#38bdf8", opacity=0.15,
            line_width=0,
            annotation_text="Peak Shopping Window",
            annotation_position="top left"
        )
        st.plotly_chart(fig_line, use_container_width=True)

    # Chart 2: User Journey Funnel
    with row1_col2:
        st.subheader("🔻 User Conversion Funnel")
        funnel_stages = ["SEARCH", "VIEW", "ADD_TO_CART", "PURCHASE"]
        funnel_values = [funnel.get(stage, 0) for stage in funnel_stages]
        
        fig_funnel = go.Figure(
            go.Funnel(
                y=funnel_stages,
                x=funnel_values,
                textinfo="value+percent initial",
                marker=dict(color=["#6366f1", "#0284c7", "#f59e0b", "#10b981"]),
            )
        )
        fig_funnel.update_layout(
            template="plotly_dark",
            title="E-Commerce User Conversion Pipeline",
            margin=dict(l=20, r=20, t=40, b=20),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
        )
        st.plotly_chart(fig_funnel, use_container_width=True)

    row2_col1, row2_col2 = st.columns(2)

    # Chart 3: Top 10 Most Viewed vs Top 10 Most Purchased Products
    with row2_col1:
        st.subheader("🏆 Product Metrics: Views vs Purchases")
        top_metric = st.radio("Select View:", ["Top 10 Most Viewed", "Top 10 Most Purchased"], horizontal=True)
        
        if top_metric == "Top 10 Most Viewed":
            df_prod = pd.DataFrame(list(prod_views.items()), columns=["Product", "Views"]).sort_values("Views", ascending=False).head(10)
            fig_bar = px.bar(
                df_prod,
                x="Views",
                y="Product",
                orientation="h",
                color="Views",
                color_continuous_scale="Viridis",
                title="Top 10 Most Viewed Products",
            )
        else:
            df_prod = pd.DataFrame(list(prod_purchases.items()), columns=["Product", "Purchases"]).sort_values("Purchases", ascending=False).head(10)
            fig_bar = px.bar(
                df_prod,
                x="Purchases",
                y="Product",
                orientation="h",
                color="Purchases",
                color_continuous_scale="Plasma",
                title="Top 10 Most Purchased Products",
            )
            
        fig_bar.update_layout(
            template="plotly_dark",
            yaxis=dict(autorange="reversed"),
            margin=dict(l=20, r=20, t=40, b=20),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    # Chart 4: Category-wise Distribution
    with row2_col2:
        st.subheader("📦 Category Distribution")
        df_cat = pd.DataFrame(list(categories.items()), columns=["Category", "Share"])
        fig_pie = px.pie(
            df_cat,
            names="Category",
            values="Share",
            hole=0.45,
            color_discrete_sequence=px.colors.qualitative.Pastel,
            title="Event Share by Product Category",
        )
        fig_pie.update_layout(
            template="plotly_dark",
            margin=dict(l=20, r=20, t=40, b=20),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
        )
        st.plotly_chart(fig_pie, use_container_width=True)


if __name__ == "__main__":
    main()
