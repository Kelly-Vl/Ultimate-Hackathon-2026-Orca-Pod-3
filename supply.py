import pandas as pd

supply_df = pd.read_csv(
    "Matilda Bay/Matilday Bay/pod_supply_data/matilda_bay_pod_supply_data.csv"
)

supply_df_pod1 = supply_df[supply_df["pod_id"] == "Pod 1"]
#print(supply_df_pod1)
'''
print(supply_df_pod1[[
    "event_id",
    "event_date",
    "pod_id",
    "population",
    "need_status",
    "amount_requested",
    "pool_available_that_resource",
    "fair_priority_score",
    "amount_allocated",
    "unmet_amount"
]].to_string(index=False))
'''
supply_df_pod1.to_csv("pod1_output.csv", index=False)

supply_df_pod2 = supply_df[supply_df["pod_id"] == "Pod 2"]
supply_df_pod2.to_csv("pod2_output.csv", index=False)

supply_df_pod4 = supply_df[supply_df["pod_id"] == "Pod 4"]
supply_df_pod4.to_csv("pod4_output.csv", index=False)