const STATUS_CLASSES = ["stable", "warning", "critical", "failed"];

function statusBadge(status) {
    const cls = STATUS_CLASSES.includes(status) ? status : "warning";
    return `<span class="badge ${cls}">${status || "unknown"}</span>`;
}

function fmt(value, suffix = "") {
    if (value === null || value === undefined || value === "") return "-";
    return `${value}${suffix}`;
}

async function loadLatestReports() {
    const tbody = document.getElementById("latestBody");
    try {
        const res = await fetch("/api/pods/latest");
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const rows = await res.json();

        if (!rows.length) {
            tbody.innerHTML = `<tr class="loading-row"><td colspan="7">No reports yet.</td></tr>`;
            return;
        }

        const sorted = [...rows].sort((a, b) =>
            (a.pod_name || "").localeCompare(b.pod_name || "")
        );

        tbody.innerHTML = sorted
            .map(row => `
                <tr>
                    <td>${row.pod_name}</td>
                    <td class="mono">${fmt(row.report_date)}</td>
                    <td>${fmt(row.water_stock_l)} L</td>
                    <td>${fmt(row.food_stock_kg)} kg</td>
                    <td>${fmt(row.medicine_stock_units)} units</td>
                    <td>${statusBadge(row.overall_status)}</td>
                    <td>${row.requested_assistance === true ? "Yes" : "No"}</td>
                </tr>
            `)
            .join("");
    } catch (err) {
        console.error("Failed to load latest reports:", err);
        tbody.innerHTML = `<tr class="loading-row"><td colspan="7">Couldn't load the latest reports.</td></tr>`;
    }
}

// Pre-fill population from the selected pod's known headcount - still
// editable, since population can genuinely change (losses, arrivals).
const podSelect = document.getElementById("pod_id");
const populationField = document.getElementById("population");

podSelect.addEventListener("change", () => {
    const selected = podSelect.selectedOptions[0];
    const known = selected && selected.dataset.population;
    if (known && !populationField.value) {
        populationField.value = known;
    }
});

// Delivery amount only makes sense once a delivery resource is picked
const deliveryResource = document.getElementById("delivery_resource");
const deliveryAmount = document.getElementById("delivery_amount");

function syncDeliveryAmount() {
    const enabled = deliveryResource.value !== "none";
    deliveryAmount.disabled = !enabled;
    if (!enabled) deliveryAmount.value = 0;
}

deliveryResource.addEventListener("change", syncDeliveryAmount);
syncDeliveryAmount();

loadLatestReports();
