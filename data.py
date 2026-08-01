import pandas as pd

supply_df = pd.read_csv(
    "Matilda Bay/Matilday Bay/pod_supply_data/matilda_bay_pod_supply_data.csv"
)

council_df = pd.read_csv(
    "Matilda Bay/Matilday Bay/pod_council_meetings/matilda_bay_council_meetings_data.csv"
)

print("Supply data:")
print(supply_df.head())

print("\nCouncil data:")
print(council_df.head())