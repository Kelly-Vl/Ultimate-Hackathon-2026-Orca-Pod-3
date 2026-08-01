import pandas as pd

supply_df = pd.read_csv(
    "Matilda Bay/Matilday Bay/pod_supply_data/matilda_bay_pod_supply_data.csv"
)

supply_df_pod1 = supply_df[supply_df["pod_id"] == "Pod 1"]
#print(supply_df_pod1)
supply_df_pod1.to_csv("pod1_output.csv", index=False)

supply_df_pod2 = supply_df[supply_df["pod_id"] == "Pod 2"]
supply_df_pod2.to_csv("pod2_output.csv", index=False)

supply_df_pod3 = supply_df[supply_df["pod_id"] == "Pod 3"]
supply_df_pod3.to_csv("pod3_output.csv", index=False)

supply_df_pod4 = supply_df[supply_df["pod_id"] == "Pod 4"]
supply_df_pod4.to_csv("pod4_output.csv", index=False)