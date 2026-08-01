async function loadDashboard(){

        const supplyResponse =
            await fetch("/api/pod_supply");

        const supply =
            await supplyResponse.json();

        const podContainer =
            document.getElementById("podCards");

        const latest = {};

        supply.forEach(row=>{

            latest[row.pod_id]=row;

        });

        Object.values(latest).forEach(pod=>{

            let status =
                pod.overall_status.toLowerCase();

            podContainer.innerHTML += `

            <div class="card">

            <div class="pod-header">

            <h3>
            ${pod.pod_name}
            </h3>

            <span class="badge ${status}">
            ${status}
            </span>

            </div>

            <div class="pod">

            <p>
            Water
            </p>

            <strong>
            ${pod.water_stock_l}
            L
            </strong>

            </div>

            <div class="pod">

            <p>
            Food
            </p>

            <strong>
            ${pod.food_stock_kg}
            kg
            </strong>

            </div>

            <div class="pod">

            <p>
            Medicine
            </p>

            <strong>
            ${pod.medicine_stock_units}
            units
            </strong>

            </div>

            </div>

            `;
        });
    }

    async function loadCouncil(){

    const response =
    await fetch("/api/council_allocations");

    const data =
    await response.json();

    const table =
    document.getElementById(
    "allocationTable"
    );

    data.forEach(row=>{

    table.innerHTML += `

    <tr>

    <td>${row.event_date}</td>

    <td>${row.pod_name}</td>

    <td>${row.resource_type}</td>

    <td>${row.amount_requested}</td>

    <td>${row.amount_allocated}</td>

    </tr>

    `;

    });

    }

    loadDashboard();

    loadCouncil();