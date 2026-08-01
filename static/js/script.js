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