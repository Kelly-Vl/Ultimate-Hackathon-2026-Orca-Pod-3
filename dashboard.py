import pandas as pd
import streamlit as st
import pandas as pd
import plotly.express as px
from openai import OpenAI
import os
from dotenv import load_dotenv


# ==========================
# LOGIN SYSTEM
# ==========================

if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

USERNAME = "survivor"
PASSWORD = "orcas2026"


if not st.session_state.logged_in:

    st.title("🔐 Orcas Survival System Login")

    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if st.button("Login"):

        if username == USERNAME and password == PASSWORD:
            st.session_state.logged_in = True
            st.rerun()

        else:
            st.error("Incorrect login details")

    st.stop()



# ==========================
# DASHBOARD
# ==========================


st.set_page_config(
    page_title="Orcas Supply Dashboard",
    page_icon="🐋",
    layout="wide"
)


st.title("🐋 Orcas Emergency Supply Dashboard")


# Logout

if st.sidebar.button("Logout"):
    st.session_state.logged_in = False
    st.rerun()



# ==========================
# LOAD DATA
# ==========================

file_path = r"C:\Users\Eeshaa's Laptop\Downloads\Matilda Bay\Matilday Bay\pod_supply_data\matilda_bay_pod_supply_data.csv"


df = pd.read_csv(file_path)


df["report_date"] = pd.to_datetime(df["report_date"])



# ==========================
# FILTER
# ==========================

date = st.sidebar.selectbox(
    "Select Date",
    sorted(df["report_date"].dt.date.unique())
)


pod = st.sidebar.selectbox(
    "Select Pod",
    ["All"] + list(df["pod_name"].unique())
)



filtered = df[
    df["report_date"].dt.date == date
]


if pod != "All":
    filtered = filtered[
        filtered["pod_name"] == pod
    ]



# ==========================
# SUMMARY CARDS
# ==========================


c1,c2,c3,c4 = st.columns(4)


c1.metric(
    "Population",
    int(filtered.population.sum())
)


c2.metric(
    "Food kg",
    round(filtered.food_stock_kg.sum(),1)
)


c3.metric(
    "Water L",
    round(filtered.water_stock_l.sum(),1)
)


c4.metric(
    "Medicine",
    round(filtered.medicine_stock_units.sum(),1)
)



# ==========================
# STATUS
# ==========================


st.subheader("🚨 Current Status")


st.dataframe(
    filtered[
        [
        "pod_name",
        "overall_status",
        "food_status",
        "water_status",
        "medicine_status",
        "requested_assistance"
        ]
    ],
    use_container_width=True
)



# ==========================
# CHARTS
# ==========================


col1,col2 = st.columns(2)


with col1:

    st.subheader("Food Distribution")

    fig = px.pie(
        filtered,
        names="pod_name",
        values="food_stock_kg",
        hole=0.4
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


with col2:

    st.subheader("Water Distribution")

    fig2 = px.bar(
        filtered,
        x="pod_name",
        y="water_stock_l",
        color="overall_status"
    )

    st.plotly_chart(
        fig2,
        use_container_width=True
    )



# ==========================
# TRENDS
# ==========================


st.subheader("📈 Supply Trend")


trend = df.copy()


if pod != "All":
    trend = trend[
        trend.pod_name == pod
    ]


fig3 = px.line(
    trend,
    x="report_date",
    y=[
        "food_stock_kg",
        "water_stock_l",
        "medicine_stock_units"
    ],
    markers=True
)


st.plotly_chart(
    fig3,
    use_container_width=True
)



# ==========================
# DOWNLOAD DATA
# ==========================


csv = filtered.to_csv(index=False)


st.download_button(
    "📥 Download Report",
    csv,
    "orcas_report.csv",
    "text/csv"
)



# ==========================
# AI ADVISOR
# ==========================


st.header("🤖 AI Emergency Advisor")


if st.button("Generate AI Recommendation"):


    load_dotenv()

    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY")
    )


    data = filtered.to_string()


    prompt=f"""

You are an emergency logistics AI.

Analyse this Orca survival data:

{data}


Provide:

1. Most endangered pod
2. Main resource shortage
3. Resource redistribution plan
4. Emergency priority actions

Keep answer concise.
"""


    response = client.chat.completions.create(

        model="gpt-4.1-mini",

        messages=[
            {
            "role":"system",
            "content":
            "You manage disaster resource allocation."
            },

            {
            "role":"user",
            "content":prompt
            }
        ]
    )


    st.success(
        response.choices[0].message.content
    )