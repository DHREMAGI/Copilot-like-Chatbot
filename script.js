window.onload = () => {
    const select = document.getElementById("dataset-select");
    ["shipments","sales"].forEach(ds => {
        const option = document.createElement("option");
        option.value = ds;
        option.innerText = ds;
        select.appendChild(option);
    });
    loadData();
};

// --- Load table dynamically ---
function loadData() {
    const dataset = document.getElementById("dataset-select").value;
    const rows = document.getElementById("row-size").value;
    fetch(`/get_data?dataset=${dataset}&rows=${rows}`)
        .then(res => res.json())
        .then(data => renderTable(data));
}

// --- Render table on homepage ---
function renderTable(data) {
    const table = document.getElementById("data-table");
    table.innerHTML = "";
    if (!data || data.length==0) return;
    let header = Object.keys(data[0]);
    let tr = document.createElement("tr");
    header.forEach(h => { let th=document.createElement("th"); th.innerText=h; tr.appendChild(th); });
    table.appendChild(tr);
    data.forEach(row=>{
        let tr=document.createElement("tr");
        header.forEach(h=>{ let td=document.createElement("td"); td.innerText=row[h]; tr.appendChild(td); });
        table.appendChild(tr);
    });
}

// --- Toggle chatbox ---
function toggleChat() {
    const chat = document.getElementById("chatbox");
    chat.style.display = chat.style.display==="none"?"flex":"none";
}

// --- Send user query to backend ---
function sendQuery(){
    const dataset = document.getElementById("dataset-select").value;
    const query = document.getElementById("chat-input").value;
    const chartType = document.getElementById("chart-type").value;
    if(!query) return;
    fetch("/query",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({dataset: dataset, query: query, chart_type: chartType})
    }).then(res=>res.json())
      .then(data=>showChatResponse(data));
}

// --- Show response in chat ---
function showChatResponse(data){
    const output = document.getElementById("chat-output");
    const container = document.createElement("div");
    container.style.marginBottom="15px";
    container.style.borderTop="1px solid #ccc";
    container.style.paddingTop="5px";

    // --- User question ---
    const qDiv = document.createElement("div");
    qDiv.innerText = data.question;
    qDiv.style.backgroundColor = "#cce5ff"; // light blue pastel
    qDiv.style.padding = "5px";
    qDiv.style.borderRadius = "5px";
    container.appendChild(qDiv);

    // --- Table answer ---
    if(data.table && Array.isArray(data.table) && data.table.length > 0){
        let tableContainer = document.createElement("div");
        tableContainer.style.maxHeight = "200px"; // scrollable height
        tableContainer.style.overflowY = "auto";
        tableContainer.style.marginTop = "5px";
        tableContainer.style.border = "1px solid #ddd";
        tableContainer.style.borderRadius = "5px";
        tableContainer.style.backgroundColor = "#ffe6f0"; // light pink pastel

        let table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";

        let keys = Object.keys(data.table[0]);
        let tr = document.createElement("tr");
        keys.forEach(k => {
            let th = document.createElement("th");
            th.innerText = k;
            th.style.borderBottom = "1px solid #ccc";
            th.style.padding = "4px";
            tr.appendChild(th);
        });
        table.appendChild(tr);

        data.table.forEach(row => {
            let tr = document.createElement("tr");
            keys.forEach(k => {
                let td = document.createElement("td");
                td.innerText = row[k];
                td.style.padding = "4px";
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        tableContainer.appendChild(table);
        container.appendChild(tableContainer);

        // --- Chart toggle ---
        if(data.is_analytic && data.chart){
            const chartBtn = document.createElement("button");
            chartBtn.innerText = "Show Chart";
            chartBtn.style.marginTop="5px";
            chartBtn.onclick = () => {
                const existing = container.querySelector("img.chart-img");
                if(existing) existing.remove();

                let img = document.createElement("img");
                img.src = "data:image/png;base64," + data.chart;
                img.className = "chart-img";
                img.style.maxWidth="100%";
                img.style.height="auto";
                container.appendChild(img);

                let hideBtn = document.createElement("button");
                hideBtn.innerText="Hide Chart";
                hideBtn.onclick = ()=> { img.remove(); hideBtn.remove(); };
                container.appendChild(hideBtn);
            };
            container.appendChild(chartBtn);
        }
    }

    output.appendChild(container);
    output.scrollTop = output.scrollHeight;
    document.getElementById("chat-input").value = "";
}

// --- Drag chatbox ---
const chatbox = document.getElementById("chatbox");
const header = document.getElementById("chat-header");
let isDragging = false;
let offsetX, offsetY;
header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - chatbox.offsetLeft;
    offsetY = e.clientY - chatbox.offsetTop;
    document.body.style.userSelect = "none";
});
document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = "auto";
});
document.addEventListener('mousemove', (e) => {
    if(isDragging){
        chatbox.style.left = e.clientX - offsetX + "px";
        chatbox.style.top = e.clientY - offsetY + "px";
    }
});
