from flask import Flask, render_template, jsonify, request
import pandas as pd
import os

app = Flask(__name__)

## csv file locations 
POD_SUPPLY_CSV = "data/matilda_bay_pod_supply_data.csv"
COUNCIL_ALLOCATIONS_CSV = "data/matilda_bay_council_meetings_data.csv"

## load csv data (JSON-safe: NaN -> None, for the /api endpoints the frontend fetches)
def load_pod_supply_data():
    df = pd.read_csv(POD_SUPPLY_CSV)
    # Replace NaN (from blank CSV cells) with None so jsonify emits valid `null`
    # instead of the invalid JSON literal `NaN`, which crashes JSON.parse() in the browser
    return df.astype(object).where(pd.notnull(df), None)


def load_council_allocations():
    df = pd.read_csv(COUNCIL_ALLOCATIONS_CSV)
    return df.astype(object).where(pd.notnull(df), None)


## raw numeric loaders (real NaN, not None) -- used internally by the AI features below,
## which need working pandas math (.mean(), .dropna(), z-scores). Never returned directly via jsonify.
def load_pod_supply_data_raw():
    return pd.read_csv(POD_SUPPLY_CSV)


def load_council_allocations_raw():
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