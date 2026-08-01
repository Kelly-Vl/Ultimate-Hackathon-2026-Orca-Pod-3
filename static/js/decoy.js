async function loadDecoyPods() {
    const res = await fetch("/api/decoy/pod_supply");
    const pods = await res.json();
    const container = document.getElementById("podCards");

    pods.forEach(pod => {
        const status = pod.overall_status.toLowerCase();
        container.innerHTML += `
            <div class="card">
                <div class="pod-header">
                    <h3>${pod.pod_name}</h3>
                    <span class="badge ${status}">${status}</span>
                </div>
                <div class="pod"><p>Water</p><strong>${pod.water_stock_l} L</strong></div>
                <div class="pod"><p>Food</p><strong>${pod.food_stock_kg} kg</strong></div>
                <div class="pod"><p>Medicine</p><strong>${pod.medicine_stock_units} units</strong></div>
            </div>
        `;
    });
}

async function loadDecoyRoutes() {
    const res = await fetch("/api/decoy/routes");
    const routes = await res.json();
    const table = document.getElementById("routeTable");

    routes.forEach(r => {
        table.innerHTML += `
            <tr>
                <td>${r.route}</td>
                <td>${r.status}</td>
                <td>${r.note}</td>
            </tr>
        `;
    });
}

loadDecoyPods();
loadDecoyRoutes();
