import pandas as pd
import streamlit as st
import plotly.express as px

st.title("Orcas Food Supply Dashboard") #Add title
file_path = r"C:\Users\Eeshaa's Laptop\Downloads\Matilda Bay\Matilday Bay\pod_supply_data\matilda_bay_pod_supply_data.csv"
df = pd.read_csv(file_path)#load the file 

#Problem 1
st.subheader("Controls the last working water purification system and has started charging steep tolls in food for access. This is not out of cruelty. Its own food stores are nearly gone, and it is afraid it will not survive.")
fig1 = px.pie(df, names="pod_name", values="food_stock_kg")
st.plotly_chart(fig1)
#Problem 3
st.subheader("Overproduces food through a surviving greenhouse setup, but stopped sharing after a trade convoy was intercepted. The pod now hoards out of distrust, not genuine need.")
fig2 = px.pie(df, names="pod_name", values="water_stock_l")
st.plotly_chart(fig2)
#streamlit run dashboard.py           