// =======================================
// MOTORGUARD - ADAFRUIT IO CONFIGURATION
// =======================================

// Replace with your Adafruit IO username
const AIO_USERNAME = "KAALI";

// Your five Adafruit IO feed keys
const FEEDS = {
    temperature: "temperature",
    current: "current",
    vibration: "vibration",
    motorStatus: "motor-status",
    alertMessage: "alert-message"
};

// Alert thresholds - illustrative project settings
const TEMP_LIMIT = 40;
const CURRENT_LIMIT = 1.0;

// Gauge display maximums.
// Adjust current maximum to suit your sensor.
const TEMP_GAUGE_MAX = 100;
const CURRENT_GAUGE_MAX = 5;

let temperatureChart;
let currentChart;

// =======================================
// ADAFRUIT IO DATA READING
// =======================================

async function getLatestValue(feedKey) {

    const url =
        `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feedKey}/data/last.json`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Cannot read feed: " + feedKey);
    }

    const data = await response.json();

    return data.value;
}


// Get historical readings for charts
async function getHistory(feedKey) {

    const url =
        `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feedKey}/data?limit=20`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Cannot read history: " + feedKey);
    }

    return await response.json();
}


// =======================================
// DASHBOARD ELEMENT UPDATES
// =======================================

function setText(id, value) {
    document.getElementById(id).textContent = value;
}


function setGauge(id, value, maximum) {

    const percentage = Math.max(
        0,
        Math.min(100, (Number(value) / maximum) * 100)
    );

    const degrees = percentage * 3.6;

    const color = id === "temperatureGauge"
        ? "#ffad55"
        : "#42a5ff";

    document.getElementById(id).style.background =
        `conic-gradient(${color} ${degrees}deg, #263448 ${degrees}deg)`;
}


function setConnection(connected) {

    setText(
        "connectionText",
        connected ? "Adafruit IO Connected" : "Connection Error"
    );

    setText(
        "sideConnection",
        connected ? "Online" : "Offline"
    );

    document.getElementById("connectionDot").style.background =
        connected ? "#35d39a" : "#ff647c";

    document.querySelector(".mini-dot").style.background =
        connected ? "#35d39a" : "#ff647c";
}


// =======================================
// CHART INITIALIZATION
// =======================================

function createCharts() {

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
            legend: {
                display: false
            }
        },

        scales: {
            x: {
                ticks: {
                    color: "#91a2b9",
                    maxTicksLimit: 6
                },
                grid: {
                    color: "#25354b"
                }
            },

            y: {
                ticks: {
                    color: "#91a2b9"
                },
                grid: {
                    color: "#25354b"
                }
            }
        }
    };


    temperatureChart = new Chart(
        document.getElementById("temperatureChart"),
        {
            type: "line",

            data: {
                labels: [],
                datasets: [{
                    label: "Temperature",
                    data: [],
                    borderColor: "#ffad55",
                    backgroundColor: "rgba(255,173,85,0.12)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                }]
            },

            options: chartOptions
        }
    );


    currentChart = new Chart(
        document.getElementById("currentChart"),
        {
            type: "line",

            data: {
                labels: [],
                datasets: [{
                    label: "Current",
                    data: [],
                    borderColor: "#42a5ff",
                    backgroundColor: "rgba(66,165,255,0.12)",
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                }]
            },

            options: chartOptions
        }
    );
}


// =======================================
// UPDATE CHART DATA
// =======================================

async function updateCharts() {

    try {

        const [tempData, currentData] = await Promise.all([
            getHistory(FEEDS.temperature),
            getHistory(FEEDS.current)
        ]);

        const tempReadings = tempData.reverse();
        const currentReadings = currentData.reverse();

        temperatureChart.data.labels = tempReadings.map(
            item => new Date(item.created_at).toLocaleTimeString()
        );

        temperatureChart.data.datasets[0].data = tempReadings.map(
            item => Number(item.value)
        );

        currentChart.data.labels = currentReadings.map(
            item => new Date(item.created_at).toLocaleTimeString()
        );

        currentChart.data.datasets[0].data = currentReadings.map(
            item => Number(item.value)
        );

        temperatureChart.update();
        currentChart.update();

    } catch (error) {

        console.error("Chart update error:", error);

    }
}


// =======================================
// HEALTH STATUS
// =======================================

function updateHealth(temp, current, vibration, motorStatus) {

    const highTemp = temp > TEMP_LIMIT;
    const highCurrent = current > CURRENT_LIMIT;
    const vibrationDetected = vibration === 1;
    const motorAlert = motorStatus === 1;

    const isAlert =
        highTemp || highCurrent || vibrationDetected || motorAlert;

    const banner = document.getElementById("healthBanner");

    const symbol = document.querySelector(".health-symbol");

    if (isAlert) {

        banner.classList.add("danger");

        symbol.textContent = "!";

        setText("healthTitle", "Attention Required");

        setText(
            "healthDescription",
            "An abnormal sensor condition has been detected."
        );

        setText("healthTag", "WARNING");

    } else {

        banner.classList.remove("danger");

        symbol.textContent = "✓";

        setText("healthTitle", "Motor Operating Normally");

        setText(
            "healthDescription",
            "No abnormal condition is reported by the monitoring system."
        );

        setText("healthTag", "NORMAL");
    }

    return {
        isAlert,
        highTemp,
        highCurrent,
        vibrationDetected,
        motorAlert
    };
}


// =======================================
// ALERT DISPLAY
// =======================================

function updateAlert(message, health) {

    const panel = document.getElementById("alertPanel");

    const hasAlert = health.isAlert;

    panel.classList.toggle("warning", hasAlert);

    document.querySelector(".alert-icon").textContent =
        hasAlert ? "!" : "✓";

    setText(
        "alertTitle",
        hasAlert ? "Motor Alert Detected" : "System Normal"
    );

    let displayMessage = message || "NORMAL";

    if (hasAlert && (!message || message === "NORMAL")) {

        const reasons = [];

        if (health.highTemp) reasons.push("HIGH TEMPERATURE");
        if (health.highCurrent) reasons.push("HIGH CURRENT");
        if (health.vibrationDetected) reasons.push("VIBRATION DETECTED");
        if (health.motorAlert) reasons.push("MOTOR STATUS ALERT");

        displayMessage = reasons.join(" | ");
    }

    setText("alertMessage", displayMessage);

    setText("alertTime", new Date().toLocaleTimeString());
}


// =======================================
// MAIN DASHBOARD UPDATE
// =======================================

async function updateDashboard() {

    if (AIO_USERNAME === "YOUR_ADAFRUIT_USERNAME") {

        setConnection(false);

        setText("connectionText", "Add your Adafruit IO username");

        return;
    }

    try {

        const results = await Promise.all([

            getLatestValue(FEEDS.temperature),
            getLatestValue(FEEDS.current),
            getLatestValue(FEEDS.vibration),
            getLatestValue(FEEDS.motorStatus),
            getLatestValue(FEEDS.alertMessage)

        ]);

        const temp = Number(results[0]);
        const current = Number(results[1]);
        const vibration = Number(results[2]);
        const motorStatus = Number(results[3]);
        const message = String(results[4]);

        if (
            !Number.isFinite(temp) ||
            !Number.isFinite(current) ||
            !Number.isFinite(vibration) ||
            !Number.isFinite(motorStatus)
        ) {
            throw new Error("Invalid sensor value received");
        }

        // Temperature
        setText("temperature", temp.toFixed(1));
        setGauge("temperatureGauge", temp, TEMP_GAUGE_MAX);

        setText(
            "temperatureState",
            temp > TEMP_LIMIT ? "HIGH" : "NORMAL"
        );

        // Current
        setText("current", current.toFixed(2));
        setGauge("currentGauge", current, CURRENT_GAUGE_MAX);

        setText(
            "currentState",
            current > CURRENT_LIMIT ? "HIGH" : "NORMAL"
        );

        // Vibration
        const vibrationDetected = vibration === 1;

        setText(
            "vibration",
            vibrationDetected ? "DETECTED" : "NORMAL"
        );

        document.getElementById("vibrationCircle")
            .classList.toggle("danger", vibrationDetected);

        document.getElementById("vibrationCircle").textContent =
            vibrationDetected ? "!" : "✓";

        setText(
            "vibrationState",
            vibrationDetected ? "Abnormal" : "Stable"
        );

        // Motor status
        const motorAlert = motorStatus === 1;

        setText(
            "motorStatus",
            motorAlert ? "ALERT" : "NORMAL"
        );

        document.getElementById("motorCircle")
            .classList.toggle("danger", motorAlert);

        document.getElementById("motorCircle").textContent =
            motorAlert ? "!" : "✓";

        setText(
            "motorState",
            motorAlert ? "Attention" : "Operating"
        );

        // Overall health and alerts
        const health = updateHealth(
            temp,
            current,
            vibration,
            motorStatus
        );

        updateAlert(message, health);

        // Connection and update time
        setConnection(true);

        setText(
            "lastUpdated",
            new Date().toLocaleTimeString()
        );

    } catch (error) {

        console.error("Dashboard error:", error);

        setConnection(false);

        setText("healthTitle", "Connection Problem");

        setText(
            "healthDescription",
            "Unable to retrieve the latest readings from Adafruit IO."
        );

        setText("healthTag", "OFFLINE");
    }
}


// =======================================
// START DASHBOARD
// =======================================

createCharts();

updateDashboard();

updateCharts();

// Latest readings every 15 seconds
setInterval(updateDashboard, 15000);

// Chart history every 60 seconds
setInterval(updateCharts, 60000);
