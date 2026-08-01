from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import pandas as pd
import os
import hashlib
import secrets
from datetime import date

app = Flask(__name__)

# ---------------------------------------------------------------------------
# ADD-DATA FEATURE - pod metadata + status thresholds
#
# Population and distance-from-hub are fixed facts about each pod, not
# something a submitter should have to retype every day, so they're kept
# here and looked up by pod_id instead of being form fields.
#
# Status thresholds (runway in days) are an assumption, not something
# derived from the source CSVs - they're picked to roughly track the
# stable/warning/critical/failed labels already visible in the historical
# data. Tune these if the real allocation logic differs.
# ---------------------------------------------------------------------------

POD_META = {
    "Pod 1": {"pod_name": "Orca Pod 1", "population": 120, "distance_from_hub_km": 3.2},
    "Pod 2": {"pod_name": "Orca Pod 2", "population": 90, "distance_from_hub_km": 5.8},
    "Pod 3": {"pod_name": "Orca Pod 3", "population": 150, "distance_from_hub_km": 4.0},
    "Pod 4": {"pod_name": "Orca Pod 4", "population": 55, "distance_from_hub_km": 11.5},
}

# (failed_below, critical_below, warning_below) in runway days
STATUS_THRESHOLDS = {
    "water": (1, 5, 15),
    "food": (1, 5, 10),
    "medicine": (5, 15, 30),
}

SEVERITY_RANK = {"stable": 0, "warning": 1, "critical": 2, "failed": 3}

PEACOCK_DISRUPTION_OPTIONS = ["none", "minor", "major"]
DELIVERY_RESOURCE_OPTIONS = ["none", "water", "food", "medicine"]

POD_SUPPLY_COLUMNS = [
    "report_date", "pod_id", "pod_name", "population", "distance_from_hub_km",
    "peacock_disruption", "water_stock_l", "food_stock_kg", "medicine_stock_units",
    "water_consumption_lpd", "food_consumption_kgpd", "medicine_consumption_upd",
    "delivery_resource", "delivery_amount", "water_runway_days", "food_runway_days",
    "medicine_runway_days", "water_status", "food_status", "medicine_status",
    "overall_status", "requested_assistance", "report_source",
]

# Session signing key. In a real deployment this would come from an
# environment variable, not be hardcoded.
app.secret_key = os.environ.get("TIDELINE_SECRET_KEY", secrets.token_hex(32))

## csv file locations
POD_SUPPLY_CSV = "data/matilda_bay_pod_supply_data.csv"
COUNCIL_ALLOCATIONS_CSV = "data/matilda_bay_council_meetings_data.csv"

## load csv data (JSON-safe: NaN -> None, for the /api endpoints the frontend fetches)
# ---------------------------------------------------------------------------
# PASSPHRASE AUTH
#
# No usernames. A single shared phrase, distributed verbally at the six
# council gatherings, is the only way in. Peacocks don't attend meetings,
# so it never appears in any written record, radio transmission, or on
# this login page.
#
# The carving on the login page is bait. It LOOKS like a security clue.
# It is solvable. What it resolves to is a decoy phrase that grants a
# real-looking, fully fabricated dashboard instead.
#
# Both phrases are stored as salted hashes, not plaintext, so inspecting
# this source (or the repo) doesn't hand either one over directly.
# ---------------------------------------------------------------------------

SALT = "matilda-bay-2026"


def _normalize(passphrase: str) -> str:
    # Case/space/hyphen-insensitive so "Tide Six", "tide-six" and
    # "tidesix" all resolve the same way.
    return "".join(ch for ch in passphrase.strip().lower() if ch.isalnum())


def _hash(passphrase: str) -> str:
    return hashlib.sha256((SALT + _normalize(passphrase)).encode()).hexdigest()


# Real passphrase: "current-runs-deep"  (never printed anywhere in this repo except as a hash)
REAL_PASSPHRASE_HASH = _hash("orca")

# Decoy passphrase: "tide-six" (the answer the carving is designed to lead to)
DECOY_PASSPHRASE_HASH = _hash("tide-six")


def is_authenticated() -> bool:
    return session.get("authed") is True


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        attempt = request.form.get("passphrase", "")
        attempt_hash = _hash(attempt)

        if attempt_hash == REAL_PASSPHRASE_HASH:
            session.clear()
            session["authed"] = True
            return redirect(url_for("index"))

        if attempt_hash == DECOY_PASSPHRASE_HASH:
            # Deliberately NOT setting session["authed"]. The decoy site
            # is public-facing and stateless - anyone with the decoy
            # phrase can look, but never reaches the real dashboard.
            return redirect(url_for("decoy"))

        error = "Passphrase not recognised."

    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ---------------------------------------------------------------------------
# REAL DASHBOARD (protected)
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    if not is_authenticated():
        return redirect(url_for("login"))
    return render_template("index.html")


def load_pod_supply_data():
    df = pd.read_csv(POD_SUPPLY_CSV)
    return df.astype(object).where(pd.notnull(df), None)


def load_council_allocations():
    df = pd.read_csv(COUNCIL_ALLOCATIONS_CSV)
    return df.astype(object).where(pd.notnull(df), None)


## ---------------------------------------------------------------------
## ADD-DATA: helpers to turn a submitted form into a full CSV row
## ---------------------------------------------------------------------

def compute_runway_days(stock: float, consumption: float):
    """Days of supply left. None means 'no measurable consumption', i.e.
    effectively unlimited - treated as stable, not as an error."""
    if stock <= 0:
        return 0.0
    if consumption <= 0:
        return None
    return round(stock / consumption, 1)


def compute_status(runway, resource: str) -> str:
    if runway is None:
        return "stable"
    failed_below, critical_below, warning_below = STATUS_THRESHOLDS[resource]
    if runway < failed_below:
        return "failed"
    if runway < critical_below:
        return "critical"
    if runway < warning_below:
        return "warning"
    return "stable"


def build_report_row(form) -> dict:
    pod_id = form.get("pod_id", "")
    if pod_id not in POD_META:
        raise ValueError("Please choose a valid pod.")

    # The date is never taken from the form, even if one is present in the
    # POST body (e.g. a hand-crafted request). This is what actually makes
    # past reports un-falsifiable - a hidden/disabled date input alone
    # wouldn't stop a direct POST from setting an arbitrary date.
    report_date = date.today().isoformat()

    def get_float(name):
        raw = form.get(name, "").strip()
        if raw == "":
            raise ValueError(f"'{name}' is required.")
        try:
            value = float(raw)
        except ValueError:
            raise ValueError(f"'{name}' must be a number.")
        if value < 0:
            raise ValueError(f"'{name}' can't be negative.")
        return value

    def get_int(name):
        raw = form.get(name, "").strip()
        if raw == "":
            raise ValueError(f"'{name}' is required.")
        try:
            value = int(float(raw))
        except ValueError:
            raise ValueError(f"'{name}' must be a whole number.")
        if value < 0:
            raise ValueError(f"'{name}' can't be negative.")
        return value

    population = get_int("population")
    water_stock = get_float("water_stock_l")
    food_stock = get_float("food_stock_kg")
    medicine_stock = get_float("medicine_stock_units")
    water_consumption = get_float("water_consumption_lpd")
    food_consumption = get_float("food_consumption_kgpd")
    medicine_consumption = get_float("medicine_consumption_upd")

    peacock_disruption = form.get("peacock_disruption", "none")
    if peacock_disruption not in PEACOCK_DISRUPTION_OPTIONS:
        peacock_disruption = "none"

    delivery_resource = form.get("delivery_resource", "none")
    if delivery_resource not in DELIVERY_RESOURCE_OPTIONS:
        delivery_resource = "none"

    delivery_amount_raw = form.get("delivery_amount", "").strip()
    delivery_amount = float(delivery_amount_raw) if delivery_amount_raw else 0.0
    if delivery_resource == "none":
        delivery_amount = 0.0

    requested_assistance = form.get("requested_assistance") == "on"

    meta = POD_META[pod_id]

    water_runway = compute_runway_days(water_stock, water_consumption)
    food_runway = compute_runway_days(food_stock, food_consumption)
    medicine_runway = compute_runway_days(medicine_stock, medicine_consumption)

    water_status = compute_status(water_runway, "water")
    food_status = compute_status(food_runway, "food")
    medicine_status = compute_status(medicine_runway, "medicine")

    overall_status = max(
        [water_status, food_status, medicine_status],
        key=lambda s: SEVERITY_RANK[s],
    )

    return {
        "report_date": report_date,
        "pod_id": pod_id,
        "pod_name": meta["pod_name"],
        "population": population,
        "distance_from_hub_km": meta["distance_from_hub_km"],
        "peacock_disruption": peacock_disruption,
        "water_stock_l": water_stock,
        "food_stock_kg": food_stock,
        "medicine_stock_units": medicine_stock,
        "water_consumption_lpd": water_consumption,
        "food_consumption_kgpd": food_consumption,
        "medicine_consumption_upd": medicine_consumption,
        "delivery_resource": delivery_resource,
        "delivery_amount": delivery_amount,
        "water_runway_days": water_runway,
        "food_runway_days": food_runway,
        "medicine_runway_days": medicine_runway,
        "water_status": water_status,
        "food_status": food_status,
        "medicine_status": medicine_status,
        "overall_status": overall_status,
        "requested_assistance": requested_assistance,
        # Always "manual_entry" - this is how we tell a form submission
        # apart from a scout_drone_scan or elder_report in the history view.
        "report_source": "manual_entry",
    }


def upsert_pod_report(row: dict):
    """Write one day's report for one pod. If that pod already has a report
    for that exact date, it's replaced in place rather than duplicated, so
    resubmitting a correction doesn't create two rows for the same day."""
    df = pd.read_csv(POD_SUPPLY_CSV)

    match = (df["pod_id"] == row["pod_id"]) & (df["report_date"] == row["report_date"])

    if match.any():
        idx = df.index[match][0]
        for col, value in row.items():
            df.at[idx, col] = value
    else:
        new_row = pd.DataFrame([row], columns=POD_SUPPLY_COLUMNS)
        df = pd.concat([df, new_row], ignore_index=True)

    df = df[POD_SUPPLY_COLUMNS]
    df.to_csv(POD_SUPPLY_CSV, index=False)


## raw numeric loaders (real NaN, not None) -- used internally by the AI features below,
## which need working pandas math (.mean(), .dropna(), z-scores). Never returned directly via jsonify.
def load_pod_supply_data_raw():
    return pd.read_csv(POD_SUPPLY_CSV)


def load_council_allocations_raw():
    return pd.read_csv(COUNCIL_ALLOCATIONS_CSV)

## API - pod supply data
@app.route("/api/pod_supply")
def get_pod_supply():
    if not is_authenticated():
        return jsonify({"error": "unauthorized"}), 401
    df = load_pod_supply_data()
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/council_allocations")
def get_council_allocations():
    if not is_authenticated():
        return jsonify({"error": "unauthorized"}), 401
    df = load_council_allocations()
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/pods/latest")
def latest_pod_status():
    if not is_authenticated():
        return jsonify({"error": "unauthorized"}), 401
    df = load_pod_supply_data()
    df["report_date"] = pd.to_datetime(df["report_date"])
    latest = df.sort_values("report_date").groupby("pod_id").tail(1)
    return jsonify(latest.to_dict(orient="records"))


@app.route("/api/pods/failed")
def failed_pod_status():
    """Latest report for every pod currently sitting in 'failed' status."""
    if not is_authenticated():
        return jsonify({"error": "unauthorized"}), 401
    df = load_pod_supply_data()
    df["report_date"] = pd.to_datetime(df["report_date"])
    latest = df.sort_values("report_date").groupby("pod_id").tail(1)
    failed = latest[latest["overall_status"].astype(str).str.lower() == "failed"]
    failed = failed.sort_values("pod_name" if "pod_name" in failed.columns else "pod_id")
    return jsonify(failed.to_dict(orient="records"))


# ---------------------------------------------------------------------------
# DECOY DASHBOARD (unprotected, deliberately reachable via the decoy phrase)
#
# Everything below is fabricated. Stock numbers, routes and allocation
# history are invented to look plausible and to send anyone acting on
# them toward the wrong pod and the wrong route.
# ---------------------------------------------------------------------------

@app.route("/decoy")
def decoy():
    return render_template("decoy.html")


@app.route("/api/decoy/pod_supply")
def decoy_pod_supply():
    # Fabricated: shows every pod as flush with surplus, so a raider
    # thinks there's nothing worth taking urgently, and Pod 3 is the
    # only one flagged "critical" - the opposite of reality - pointing
    # any raid toward a pod that is, in fact, well defended and expecting one.
    fake = [
        {"pod_id": "Pod 1", "pod_name": "Orca Pod 1", "water_stock_l": 41000, "food_stock_kg": 2100, "medicine_stock_units": 310, "overall_status": "stable"},
        {"pod_id": "Pod 2", "pod_name": "Orca Pod 2", "water_stock_l": 38500, "food_stock_kg": 1950, "medicine_stock_units": 275, "overall_status": "stable"},
        {"pod_id": "Pod 3", "pod_name": "Orca Pod 3", "water_stock_l": 12000, "food_stock_kg": 400, "medicine_stock_units": 90, "overall_status": "critical"},
        {"pod_id": "Pod 4", "pod_name": "Orca Pod 4", "water_stock_l": 39800, "food_stock_kg": 2020, "medicine_stock_units": 300, "overall_status": "stable"},
    ]
    return jsonify(fake)


@app.route("/api/decoy/routes")
def decoy_routes():
    # Fabricated "safe" transfer route. Marking the most heavily
    # monitored, dead-end service tunnel as the "unguarded shortcut".
    fake_routes = [
        {"route": "Old Boatshed Tunnel", "status": "unguarded", "note": "Fastest path to central stores, minimal patrols."},
        {"route": "Reflection Pond Bridge", "status": "collapsed", "note": "Impassable, do not attempt."},
        {"route": "Northern Jetty", "status": "heavy patrol", "note": "Avoid - frequent orca escort convoys."},
    ]
    return jsonify(fake_routes)


## history
@app.route("/api/pods/history")
def history():
    # NOTE: this serves a real HTML page from an /api/ path, which is a
    # pre-existing naming mismatch (kept as-is so url_for('history') in
    # index.html/history.html doesn't break). Worth moving to a plain
    # /history route later.
    if not is_authenticated():
        return redirect(url_for("login"))
    return render_template("history.html")


## ---------------------------------------------------------------------
## ADD-DATA (protected) - daily self-reported stock updates per pod
## ---------------------------------------------------------------------

@app.route("/add-data", methods=["GET", "POST"])
def add_data():
    if not is_authenticated():
        return redirect(url_for("login"))

    message = None
    error = None

    if request.method == "POST":
        try:
            row = build_report_row(request.form)
            upsert_pod_report(row)
            message = f"Report saved for {row['pod_name']} on {row['report_date']}."
        except ValueError as exc:
            error = str(exc)

    return render_template(
        "add_data.html",
        pods=POD_META,
        today=date.today().isoformat(),
        message=message,
        error=error,
    )


## run server
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)