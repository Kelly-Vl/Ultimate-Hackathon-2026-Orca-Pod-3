from flask import Flask, render_template, jsonify
import pandas as pd
import os

app = Flask(__name__)

## csv file locations 
POD_SUPPLY_CSV = "data/matilda_bay_pod_supply_data.csv"
COUNCIL_ALLOCATIONS_CSV = "data/matilda_bay_council_meetings_data.csv"

## load csv data
def load_pod_supply_data():
    return pd.read_csv(POD_SUPPLY_CSV)


def load_council_allocations():
    return pd.read_csv(COUNCIL_ALLOCATIONS_CSV)


## main page
@app.route("/")
def index():
    return render_template("index.html")

## API - pod supply data
@app.route("/api/pod_supply")
def get_pod_supply():
    df = load_pod_supply_data()
    return jsonify(
        df.to_dict(orient="records")
    )

## API - coucil allocations
@app.route("/api/council_allocations")
def get_council_allocations():
    df = load_council_allocations()
    return jsonify(
        df.to_dict(orient="records")
    )

## API - latest state per pod 
@app.route("/api/pods/latest")
def latest_pod_status():
    df = load_pod_supply_data()
    df["report_date"] = pd.to_datetime(df["report_date"])
    
    latest = (
        df.sort_values("report_date")
        .groupby("pod_id")
        .tail(1)
    )

    return jsonify(
        latest.to_dict(orient="records")
    )

## run server
if __name__ == "__main__":
    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )