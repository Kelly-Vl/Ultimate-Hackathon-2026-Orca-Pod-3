from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import pandas as pd
import os
import hashlib
import secrets

app = Flask(__name__)

# Session signing key. In a real deployment this would come from an
# environment variable, not be hardcoded.
app.secret_key = os.environ.get("TIDELINE_SECRET_KEY", secrets.token_hex(32))

## csv file locations
POD_SUPPLY_CSV = "data/matilda_bay_pod_supply_data.csv"
COUNCIL_ALLOCATIONS_CSV = "data/matilda_bay_council_meetings_data.csv"

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
    return render_template("history.html")

## run server
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)