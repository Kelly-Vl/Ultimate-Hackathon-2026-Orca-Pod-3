import pandas as pd

council_df = pd.read_csv(
    "Matilda Bay/Matilday Bay/pod_council_meetings/matilda_bay_council_meetings_data.csv"
)

council_df_pod1 = council_df[council_df["pod_id"] == "Pod 1"]
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
council_df_pod1.to_csv("pod1_council_output.csv", index=False)

council_df_pod2 = council_df[council_df["pod_id"] == "Pod 2"]
council_df_pod2.to_csv("pod2_council_output.csv", index=False)

council_df_pod4 = council_df[council_df["pod_id"] == "Pod 4"]
council_df_pod4.to_csv("pod4_council_output.csv", index=False)