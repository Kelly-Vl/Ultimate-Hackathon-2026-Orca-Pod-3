import streamlit as st
import pandas as pd
import plotly.express as px


# ==========================
# PAGE SETTINGS
# ==========================

st.set_page_config(
    page_title="Orcas Supply Dashboard",
    page_icon="🐋",
    layout="wide"
)


# ==========================
# BLACK THEME CSS
# ==========================

st.markdown("""
<style>

[data-testid="stAppViewContainer"] {

background:#000000;
color:white;

}


.block-container {

width:92%;
max-width:1200px;
padding-top:40px;

}


h1 {

font-size:42px !important;
color:white;

}


h2,h3 {

color:white;

}


/* Sidebar */

[data-testid="stSidebar"] {

background:#050505;

}



/* Cards */

[data-testid="metric-container"] {

background:#111111;

border:1px solid #333333;

border-radius:18px;

padding:25px;

}


[data-testid="stMetricValue"] {

color:white;

font-size:34px;

}



/* Buttons */

.stButton button {

background:#111111;

color:white;

border-radius:30px;

border:1px solid white;

}


.stButton button:hover {

background:white;

color:black;

}



/* Table */

[data-testid="stDataFrame"] {

background:#111111;

border-radius:18px;

}



</style>
""",
unsafe_allow_html=True)



# ==========================
# PASSWORD LOGIN
# ==========================

if "logged_in" not in st.session_state:

    st.session_state.logged_in = False


PASSWORD = "orcas2026"



if not st.session_state.logged_in:


    st.markdown("""
    <h1>🐋 Orcas Survival System</h1>

    <p style="
    color:#aaaaaa;
    font-size:18px;">
    Emergency resource monitoring platform
    </p>
    """,
    unsafe_allow_html=True)


    password = st.text_input(
        "Enter System Password",
        type="password"
    )


    if st.button(
        "🔐 Enter System",
        key="login_button"
    ):


        if password == PASSWORD:

            st.session_state.logged_in = True

            st.rerun()


        else:

            st.error(
                "Incorrect password"
            )


    st.stop()



# ==========================
# HEADER
# ==========================

st.markdown("""
<h1>
🐋 Orcas Emergency Supply Dashboard
</h1>

<p style="
color:#aaaaaa;
font-size:18px;">
Real-time survival resource monitoring system
</p>

""",
unsafe_allow_html=True)



# Logout

if st.sidebar.button(
    "Logout",
    key="logout_button"
):

    st.session_state.logged_in = False

    st.rerun()



# ==========================
# LOAD DATA
# ==========================


file_path = r"C:\Users\Eeshaa's Laptop\Downloads\Matilda Bay\Matilday Bay\pod_supply_data\matilda_bay_pod_supply_data.csv"


df = pd.read_csv(file_path)


df["report_date"] = pd.to_datetime(
    df["report_date"]
)



# ==========================
# FILTER
# ==========================


st.sidebar.header(
    "Control Panel"
)


date = st.sidebar.selectbox(
    "Select Date",
    sorted(
        df["report_date"].dt.date.unique()
    ),
    key="date_select"
)



pod = st.sidebar.selectbox(
    "Select Pod",
    ["All"] + list(df["pod_name"].unique()),
    key="pod_select"
)



filtered = df[
    df["report_date"].dt.date == date
]


if pod != "All":

    filtered = filtered[
        filtered["pod_name"] == pod
    ]



# ==========================
# RESOURCE CARDS
# ==========================


st.subheader(
    "🌊 Resource Overview"
)


c1,c2,c3,c4 = st.columns(4)



c1.metric(
    "Population",
    int(filtered.population.sum())
)



c2.metric(
    "Food Stock (kg)",
    round(
        filtered.food_stock_kg.sum(),
        1
    )
)



c3.metric(
    "Water Stock (L)",
    round(
        filtered.water_stock_l.sum(),
        1
    )
)



c4.metric(
    "Medicine",
    round(
        filtered.medicine_stock_units.sum(),
        1
    )
)



# ==========================
# STATUS TABLE
# ==========================


st.subheader(
    "🚨 Current Pod Status"
)



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

    st.subheader(
        "🍖 Food Distribution"
    )


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


    st.subheader(
        "💧 Water Supply"
    )


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
# TREND
# ==========================


st.subheader(
    "📈 Supply Trend"
)



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
# DOWNLOAD
# ==========================


st.download_button(

    "📥 Download Report",

    filtered.to_csv(index=False),

    "orcas_report.csv",

    "text/csv",

    key="download_button"

)