let podSupplyData = [];      // latest report per pod (used by cards, distribution, health charts)
let podHistoryData = [];     // full day-by-day report history (used by the resource trend chart)
let resourceChartInstance = null;

const POD_COLORS = ["#4FD8C4", "#F2A65A", "#E8785A", "#7EA8FF", "#C792EA", "#F5E663"];

function podColor(index) {
    return POD_COLORS[index % POD_COLORS.length];
}

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

// ---------------------------------------------------------------------------
// Failed-status pods table (replaces the old Council Allocation History)
// ---------------------------------------------------------------------------

function fmtValue(value, suffix = "") {
    if (value === null || value === undefined || value === "") return "-";
    return `${value}${suffix}`;
}

async function loadFailedPods(){

    const table = document.getElementById("failedPodsTable");

    try {
        const response = await fetch("/api/pods/failed");
        const data = await response.json();

        if (!data.length) {
            table.innerHTML = `<tr class="empty-row"><td colspan="7">No pods are currently in failed status.</td></tr>`;
            return;
        }

        table.innerHTML = data.map(row => {
            const requesting = row.requested_assistance === true ? "Yes" : "No";
            const status = (row.overall_status || "").toLowerCase();
            const rowClass = status === "failed" ? "row-failed" : status === "critical" ? "row-critical" : "";
            return `
                <tr class="${rowClass}">
                    <td>${row.pod_name || row.pod_id}</td>
                    <td class="mono">${fmtValue(row.report_date)}</td>
                    <td>${fmtValue(row.population)}</td>
                    <td>${fmtValue(row.water_runway_days, "d")}</td>
                    <td>${fmtValue(row.food_runway_days, "d")}</td>
                    <td>${fmtValue(row.medicine_runway_days, "d")}</td>
                    <td>${requesting}</td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        console.error("Failed to load failed-status pods:", err);
        table.innerHTML = `<tr class="empty-row"><td colspan="7">Couldn't load pod data.</td></tr>`;
    }
}

async function loadPodCharts(){

    const response =
        await fetch("/api/pod_supply");


    const data =
        await response.json();

    podHistoryData = data;

    /*
        Keep latest report for each pod
    */

    const latest = {};


    data.forEach(row=>{

        latest[row.pod_id] = row;

    });


    podSupplyData =
        Object.values(latest);



    setupResourceToggle();
    createResourceChart("water_stock_l", "Water", "L");

    createDistributionChart();

    createHealthChart();

    }

// ---------------------------------------------------------------------------
// Chart 1 - Pod Resource Inventory: day-to-day line trend per pod, with a
// dashed linear trendline overlaid for each pod. Switches between water,
// food and medicine via the toggle buttons above the chart.
// ---------------------------------------------------------------------------

function setupResourceToggle(){
    const toggle = document.getElementById("resourceToggle");
    if (!toggle) return;

    toggle.querySelectorAll(".resource-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            toggle.querySelectorAll(".resource-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            createResourceChart(btn.dataset.resource, btn.dataset.label, btn.dataset.unit);
        });
    });
}

function linearRegression(values){
    // values is an array that may contain nulls; x is simply the index.
    let n = 0, sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    values.forEach((v, i) => {
        if (v === null || v === undefined) return;
        n++;
        sumX += i;
        sumY += v;
        sumXY += i * v;
        sumXX += i * i;
    });

    if (n < 2) return null;

    const denom = (n * sumXX - sumX * sumX);
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

function buildResourceSeries(resourceKey){
    // Group history rows by pod
    const byPod = new Map();
    podHistoryData.forEach(row => {
        const key = row.pod_name || row.pod_id;
        if (!byPod.has(key)) byPod.set(key, []);
        byPod.get(key).push(row);
    });

    // Sort every pod's rows by date, and collect the full set of unique dates
    // across all pods so every dataset can share the same x-axis labels.
    const dateSet = new Set();
    byPod.forEach(rows => {
        rows.sort((a, b) => String(a.report_date).localeCompare(String(b.report_date)));
        rows.forEach(r => dateSet.add(r.report_date));
    });

    const labels = [...dateSet].sort((a, b) => String(a).localeCompare(String(b)));

    const podNames = [...byPod.keys()].sort();

    const datasets = [];

    podNames.forEach((podName, idx) => {
        const rows = byPod.get(podName);
        const byDate = new Map(rows.map(r => [r.report_date, r[resourceKey]]));

        const series = labels.map(d => {
            const v = byDate.has(d) ? byDate.get(d) : null;
            return (v === null || v === undefined) ? null : Number(v);
        });

        const color = podColor(idx);

        datasets.push({
            label: podName,
            data: series,
            borderColor: color,
            backgroundColor: color,
            spanGaps: true,
            tension: 0.25,
            pointRadius: 2,
            borderWidth: 2
        });

        // Trendline: linear regression over this pod's actual data points,
        // drawn only across the span where the pod has real reports.
        const reg = linearRegression(series);
        if (reg) {
            const firstIdx = series.findIndex(v => v !== null);
            const lastIdx = series.length - 1 - [...series].reverse().findIndex(v => v !== null);

            const trend = series.map((_, i) => {
                if (i < firstIdx || i > lastIdx) return null;
                return reg.intercept + reg.slope * i;
            });

            datasets.push({
                label: `${podName} trend`,
                data: trend,
                borderColor: color,
                borderDash: [6, 4],
                borderWidth: 2,
                pointRadius: 0,
                spanGaps: true,
                tension: 0
            });
        }
    });

    return { labels, datasets };
}

function createResourceChart(resourceKey, label, unit){

    const ctx = document.getElementById("resourceChart");

    const { labels, datasets } = buildResourceSeries(resourceKey);

    if (resourceChartInstance) {
        resourceChartInstance.destroy();
    }

    resourceChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "nearest",
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#E8F1F2",
                        filter: item => !item.text.endsWith("trend")
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue}${unit}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: "#E8F1F2", maxRotation: 0, autoSkip: true },
                    title: { display: false }
                },
                y: {
                    ticks: { color: "#E8F1F2" },
                    title: { display: true, text: `${label} (${unit.trim()})`, color: "#9fb7c0" }
                }
            }
        }
    });
}

// Chart 2 - distribution chart
function createDistributionChart(){


const ctx =
document.getElementById(
"distributionChart"
);



new Chart(ctx,{


type:"bar",


data:{


labels:
podSupplyData.map(
p=>p.pod_name
),


datasets:[


{
label:"Water",

data:
podSupplyData.map(
p=>p.water_stock_l
),

backgroundColor:"#4FD8C4"

},


{
label:"Food",

data:
podSupplyData.map(
p=>p.food_stock_kg
),

backgroundColor:"#F2A65A"

},


{
label:"Medicine",

data:
podSupplyData.map(
p=>p.medicine_stock_units
),

backgroundColor:"#E8785A"

}



]


},



options:{


responsive:true,
maintainAspectRatio:false,


scales:{


x:{
stacked:true,
ticks:{
color:"#E8F1F2"
}

},


y:{
stacked:true,
ticks:{
color:"#E8F1F2"
}

}


}


}



});


}

// Chart 3 - pod health profile, as a pie chart.
// A radar chart overlapped too much once there were several pods on top of
// each other, so instead each pod gets one slice sized by a composite
// health score (its water/food/medicine stock normalised against the
// healthiest pod for that resource, then averaged).
function createHealthChart(){

    const ctx = document.getElementById("healthChart");

    const maxWater = Math.max(...podSupplyData.map(p => p.water_stock_l || 0), 1);
    const maxFood = Math.max(...podSupplyData.map(p => p.food_stock_kg || 0), 1);
    const maxMedicine = Math.max(...podSupplyData.map(p => p.medicine_stock_units || 0), 1);

    const scores = podSupplyData.map(pod => {
        const waterScore = (pod.water_stock_l || 0) / maxWater;
        const foodScore = (pod.food_stock_kg || 0) / maxFood;
        const medicineScore = (pod.medicine_stock_units || 0) / maxMedicine;
        return ((waterScore + foodScore + medicineScore) / 3) * 100;
    });

    new Chart(ctx,{

        type:"pie",

        data:{
            labels: podSupplyData.map(p => p.pod_name),
            datasets:[{
                label: "Relative resource health",
                data: scores,
                backgroundColor: podSupplyData.map((_, i) => podColor(i)),
                borderColor: "#071923",
                borderWidth: 2
            }]
        },

        options:{
            responsive:true,
            maintainAspectRatio:false,

            plugins:{
                legend:{
                    labels:{
                        color:"#E8F1F2"
                    }
                },
                tooltip:{
                    callbacks:{
                        label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(1)} / 100 relative health`
                    }
                }
            }
        }

    });

}


    loadDashboard();

    loadFailedPods();

    loadPodCharts();


/* ================= CHATBOT WIDGET (mock / canned responses only) ================= */

const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotWindow = document.getElementById("chatbotWindow");
const chatbotClose = document.getElementById("chatbotClose");
const chatbotForm = document.getElementById("chatbotForm");
const chatbotInput = document.getElementById("chatbotInput");
const chatbotMessages = document.getElementById("chatbotMessages");

// Pre-written replies matched by keyword. First match in the list wins.
const CANNED_KEYWORD_RESPONSES = [
    { keywords: ["water"], reply: "Water levels are lowest in Pod 2 right now — it dropped into critical range this week." },
    { keywords: ["food"], reply: "Food stock is tightest in Pod 1. Council allocations have been trailing the requested amount there." },
    { keywords: ["medicine"], reply: "Medicine units are holding steady across most pods, but I'd keep an eye on Pod 4." },
    { keywords: ["pod 1", "pod1"], reply: "Pod 1 has been cycling between warning and critical on food stock most of the month." },
    { keywords: ["pod 2", "pod2"], reply: "Pod 2 is the one to watch — water there has been failing and the latest report even came back with missing readings." },
    { keywords: ["pod 3", "pod3"], reply: "Pod 3 is in the best shape of the four right now, sitting mostly in warning rather than critical or failed." },
    { keywords: ["pod 4", "pod4"], reply: "Pod 4 has been sitting at failed status for a while without a new assistance request — worth checking on them directly." },
    { keywords: ["status", "overall"], reply: "Overall status ranges from stable to failed depending on the pod — Pod 3 is holding up best, Pod 4 is struggling most." },
    { keywords: ["critical"], reply: "A handful of pods have dipped into critical status this month, mostly on water and food." },
    { keywords: ["stable"], reply: "Stable pods still get monitored daily — status can shift quickly after a peacock disruption event." },
    { keywords: ["council", "allocation", "allocate"], reply: "Council allocations don't always match what's requested — some pods have had requests only partially fulfilled." },
    { keywords: ["request", "assistance"], reply: "Assistance requests are logged per pod per resource type — I can't pull live numbers yet, but that's tracked in the council data." },
    { keywords: ["delivery", "deliver"], reply: "Deliveries vary by pod based on distance from the hub and how difficult the route is." },
    { keywords: ["disruption", "peacock"], reply: "Peacock disruption events (minor, major, none) tend to line up with sharper drops in resource stock." },
    { keywords: ["population"], reply: "Pod populations range roughly from 55 to 120 orcas depending on the pod." },
    { keywords: ["distance", "hub"], reply: "Distance from the hub varies quite a bit by pod, which affects delivery difficulty." },
    { keywords: ["who are you", "what are you"], reply: "I'm Tide — a mock recovery assistant for now, not a real AI model yet." },
    { keywords: ["hello", "hi", "hey"], reply: "Hey there 👋 I'm Tide, the recovery assistant. Ask me about water, food, medicine, or a specific pod." },
    { keywords: ["help"], reply: "I can answer quick questions about pod resource status — try asking about water, food, medicine, or a pod by name." },
    { keywords: ["thank"], reply: "Happy to help! Let me know if there's anything else you'd like to check." },
    { keywords: ["bye", "goodbye", "see you"], reply: "Take care! Close the window anytime, I'll be here when you need me." }
];

// Fallback replies cycle in order (not randomly) when nothing matches,
// so the demo still feels pre-scripted rather than chaotic.
const CANNED_FALLBACK_RESPONSES = [
    "I'm just a demo assistant right now, so I don't have a live answer for that yet — but it's on the roadmap!",
    "Good question. This is a placeholder response since I'm not wired up to a real model yet.",
    "Noted! Once real AI insights are hooked up, I'll be able to dig into the pod data for you.",
    "Still just a mock-up for now! Try asking about water, food, medicine, or a specific pod."
];

let fallbackIndex = 0;

function pickCannedResponse(userText) {
    const lower = userText.toLowerCase();

    const match = CANNED_KEYWORD_RESPONSES.find(entry =>
        entry.keywords.some(keyword => lower.includes(keyword))
    );

    if (match) {
        return match.reply;
    }

    const reply = CANNED_FALLBACK_RESPONSES[fallbackIndex % CANNED_FALLBACK_RESPONSES.length];
    fallbackIndex++;

    return reply;
}

function addChatBubble(text, sender) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;

    chatbotMessages.appendChild(bubble);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

    return bubble;
}

function openChatbot() {
    chatbotWindow.classList.remove("hidden");

    if (chatbotMessages.children.length === 0) {
        addChatBubble("Hi! I'm Tide, your recovery assistant. Ask me about water, food, medicine, or a pod.", "bot");
    }

    chatbotInput.focus();
}

function closeChatbot() {
    chatbotWindow.classList.add("hidden");
}

chatbotToggle.addEventListener("click", () => {
    chatbotWindow.classList.contains("hidden") ? openChatbot() : closeChatbot();
});

chatbotClose.addEventListener("click", closeChatbot);

chatbotForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = chatbotInput.value.trim();
    if (!text) return;

    addChatBubble(text, "user");
    chatbotInput.value = "";

    const typingBubble = addChatBubble("Tide is typing...", "bot typing");

    setTimeout(() => {
        typingBubble.remove();
        addChatBubble(pickCannedResponse(text), "bot");
    }, 700 + Math.random() * 500);
});