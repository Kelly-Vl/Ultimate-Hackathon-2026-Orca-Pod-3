// history.js — populates the overview table and per-pod timeline tabs
// on history.html by fetching from the existing Flask JSON API.

const STATUS_CLASSES = ["stable", "warning", "critical", "failed"];

function statusBadge(status) {
    const cls = STATUS_CLASSES.includes(status) ? status : "warning";
    const label = status || "unknown";
    return `<span class="badge ${cls}">${label}</span>`;
}

function fmt(value, suffix = "") {
    if (value === null || value === undefined || value === "") return "-";
    return `${value}${suffix}`;
}

function podKey(row) {
    // Prefer a human-readable name if present, fall back to the raw id
    return row.pod_name || row.pod_id || "Unknown Pod";
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Request to ${url} failed with status ${res.status}`);
    }
    return res.json();
}

function renderOverview(latestRows) {
    const tbody = document.getElementById("overviewBody");

    if (!latestRows.length) {
        tbody.innerHTML = `<tr class="loading-row"><td colspan="9">No pod data available.</td></tr>`;
        return;
    }

    const sorted = [...latestRows].sort((a, b) =>
        podKey(a).localeCompare(podKey(b))
    );

    tbody.innerHTML = sorted
        .map((row) => {
            const requesting = row.requested_assistance === true ? "Yes" : "No";
            return `
                <tr>
                    <td>${podKey(row)}</td>
                    <td class="mono">${fmt(row.report_date)}</td>
                    <td>${fmt(row.population)}</td>
                    <td>${fmt(row.distance_from_hub_km)}</td>
                    <td>${fmt(row.water_runway_days, "d")}</td>
                    <td>${fmt(row.food_runway_days, "d")}</td>
                    <td>${fmt(row.medicine_runway_days, "d")}</td>
                    <td>${statusBadge(row.overall_status)}</td>
                    <td>${requesting}</td>
                </tr>
            `;
        })
        .join("");
}

function groupByPod(rows) {
    const grouped = new Map();
    rows.forEach((row) => {
        const key = podKey(row);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(row);
    });

    // sort each pod's rows oldest -> newest, keep pod order stable/alphabetical
    const sortedKeys = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
    const result = new Map();
    sortedKeys.forEach((key) => {
        const rows = grouped.get(key).sort((a, b) =>
            a.report_date.localeCompare(b.report_date)
        );
        result.set(key, rows);
    });

    return result;
}

function renderTimelineTable(rows) {
    // newest first for readability
    const reversed = [...rows].reverse();

    const rowsHtml = reversed
        .map((row) => {
            const hasDelivery =
                row.delivery_resource && row.delivery_resource !== "none";
            const delivery = hasDelivery
                ? `${fmt(row.delivery_amount)} ${row.delivery_resource}`
                : "&mdash;";

            return `
                <tr>
                    <td class="mono">${fmt(row.report_date)}</td>
                    <td>${fmt(row.peacock_disruption)}</td>
                    <td>${fmt(row.water_stock_l)}</td>
                    <td>${fmt(row.food_stock_kg)}</td>
                    <td>${fmt(row.medicine_stock_units)}</td>
                    <td>${fmt(row.water_runway_days, "d")}</td>
                    <td>${fmt(row.food_runway_days, "d")}</td>
                    <td>${fmt(row.medicine_runway_days, "d")}</td>
                    <td>${statusBadge(row.overall_status)}</td>
                    <td>${delivery}</td>
                </tr>
            `;
        })
        .join("");

    return `
        <div class="table-scroll">
        <table>
            <thead>
                <tr>
                    <th class="mono">Date</th>
                    <th>Disruption</th>
                    <th>Water (L)</th>
                    <th>Food (kg)</th>
                    <th>Medicine (units)</th>
                    <th>Water Runway</th>
                    <th>Food Runway</th>
                    <th>Medicine Runway</th>
                    <th>Status</th>
                    <th>Delivery</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        </div>
    `;
}

function renderTimeline(podSupplyRows) {
    const tabsEl = document.getElementById("podTabs");
    const detailsEl = document.getElementById("podDetails");
    const grouped = groupByPod(podSupplyRows);

    if (!grouped.size) {
        tabsEl.innerHTML = "";
        detailsEl.innerHTML = `<p class="small">No timeline data available.</p>`;
        return;
    }

    let tabsHtml = "";
    let detailsHtml = "";
    let i = 0;

    grouped.forEach((rows, podName) => {
        const id = `pod-${i}`;
        const activeTab = i === 0 ? " active" : "";
        const activeDetail = i === 0 ? " active" : "";

        tabsHtml += `<button class="tab-btn${activeTab}" data-pod="${id}">${podName}</button>`;
        detailsHtml += `<div class="pod-detail${activeDetail}" id="${id}">${renderTimelineTable(rows)}</div>`;
        i += 1;
    });

    tabsEl.innerHTML = tabsHtml;
    detailsEl.innerHTML = detailsHtml;

    tabsEl.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            tabsEl.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            detailsEl.querySelectorAll(".pod-detail").forEach((d) => d.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(btn.dataset.pod).classList.add("active");
        });
    });
}

async function init() {
    try {
        const [latest, podSupply] = await Promise.all([
            fetchJSON("/api/pods/latest"),
            fetchJSON("/api/pod_supply"),
        ]);

        renderOverview(latest);
        renderTimeline(podSupply);
    } catch (err) {
        console.error("Failed to load history data:", err);
        document.getElementById("overviewBody").innerHTML =
            `<tr class="loading-row"><td colspan="9">Couldn't load pod data. Check the console for details.</td></tr>`;
        document.getElementById("podDetails").innerHTML =
            `<p class="small">Couldn't load timeline data.</p>`;
    }
}

document.addEventListener("DOMContentLoaded", init);