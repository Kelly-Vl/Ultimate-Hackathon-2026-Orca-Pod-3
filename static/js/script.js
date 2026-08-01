let podSupplyData = [];

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

async function loadPodCharts(){

    const response =
        await fetch("/api/pod_supply");


    const data =
        await response.json();


    /*
        Keep latest report for each pod
    */

    const latest = {};


    data.forEach(row=>{

        latest[row.pod_id] = row;

    });


    podSupplyData =
        Object.values(latest);



    createResourceChart();

    createDistributionChart();

    createHealthChart();

    }

// Chart 1 - resource comparison
function createResourceChart(){


const ctx =
document.getElementById(
"resourceChart"
);



new Chart(ctx, {


type:"bar",


data:{


labels:
podSupplyData.map(
p=>p.pod_name
),


datasets:[


{

label:"Water (L)",

data:
podSupplyData.map(
p=>p.water_stock_l
),

backgroundColor:
"#4FD8C4"

},


{

label:"Food (kg)",

data:
podSupplyData.map(
p=>p.food_stock_kg
),

backgroundColor:
"#F2A65A"

},


{

label:"Medicine",

data:
podSupplyData.map(
p=>p.medicine_stock_units
),

backgroundColor:
"#E8785A"

}



]

},



options:{


responsive:true,
maintainAspectRatio:false,


plugins:{


legend:{

labels:{
color:"#E8F1F2"
}

}

},



scales:{


x:{
ticks:{
color:"#E8F1F2"
}
},


y:{
ticks:{
color:"#E8F1F2"
}

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

// Chart 3 - pod health radar
function createHealthChart(){


const ctx =
document.getElementById(
"healthChart"
);



new Chart(ctx,{


type:"radar",


data:{


labels:[

"Water",
"Food",
"Medicine"

],


datasets:

podSupplyData.map(
pod=>({


label:
pod.pod_name,


data:[


pod.water_stock_l/1000,

pod.food_stock_kg/1000,

pod.medicine_stock_units/100


],


borderWidth:2


})

)


},



options:{


responsive:true,
maintainAspectRatio:false,


plugins:{


legend:{
labels:{
color:"#E8F1F2"
}
}


},



scales:{


r:{

ticks:{
display:false
},

pointLabels:{
color:"#E8F1F2"
}


}



}



}


});


}


    loadDashboard();

    loadCouncil();

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
    { keywords: ["pod 4", "pod4"], reply: "Pod 4 has been sitting at failed status for a while without a new assistance request — worth checking on them directly." },
    { keywords: ["hello", "hi", "hey"], reply: "Hey there 👋 I'm Tide, the recovery assistant. Ask me about water, food, medicine, or a specific pod." },
    { keywords: ["help"], reply: "I can answer quick questions about pod resource status — try asking about water, food, medicine, or a pod by name." },
    { keywords: ["thank"], reply: "Happy to help! Let me know if there's anything else you'd like to check." }
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