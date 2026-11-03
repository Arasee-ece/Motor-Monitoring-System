// ENTER YOUR ADAFRUIT IO USERNAME HERE
const AIO_USERNAME = "KAALI";

// Adafruit IO feed keys
const FEEDS = {
    temperature: "temperature",
    current: "current",
    vibration: "vibration",
    motorStatus: "motor-status",
    alertMessage: "alert-message"
};

// Get the latest value from an Adafruit IO feed
async function getFeedValue(feedKey) {

    const url =
        `https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/${feedKey}/data/last.json`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to read feed: " + feedKey);
    }

    const data = await response.json();

    return data.value;
}

// Update one dashboard element
function updateText(id, value) {
    document.getElementById(id).textContent = value;
}

// Update all dashboard readings
async function updateDashboard() {

    try {

        const results = await Promise.all([
            getFeedValue(FEEDS.temperature),
            getFeedValue(FEEDS.current),
            getFeedValue(FEEDS.vibration),
            getFeedValue(FEEDS.motorStatus),
            getFeedValue(FEEDS.alertMessage)
        ]);

        const temperature = results[0];
        const current = results[1];
        const vibration = results[2];
        const motorStatus = results[3];
        const alertMessage = results[4];

        // Temperature and current
        updateText("temperature", Number(temperature).toFixed(1));
        updateText("current", Number(current).toFixed(2));

        // Vibration status
        const vibrationDetected = Number(vibration) === 1;

        updateText(
            "vibration",
            vibrationDetected ? "DETECTED" : "NORMAL"
        );

        // Motor status
        const motorAlert = Number(motorStatus) === 1;

        updateText(
            "motor-status",
            motorAlert ? "ALERT" : "NORMAL"
        );

        // Alert message
        updateText("alert-message", alertMessage);

        // Alert design
        const alertBox = document.getElementById("alert-box");

        if (motorAlert || vibrationDetected) {
            alertBox.classList.add("warning");
        } else {
            alertBox.classList.remove("warning");
        }

        // Connection status
        updateText("connection", "Connected");

        document.querySelector(".dot").style.background = "#22c55e";

        // Last updated time
        updateText(
            "last-updated",
            "Last updated: " + new Date().toLocaleTimeString()
        );

    } catch (error) {

        updateText("connection", "Connection error");

        document.querySelector(".dot").style.background = "red";

        console.error(error);
    }
}

// First update when the page opens
updateDashboard();

// Refresh automatically every 5 seconds
setInterval(updateDashboard, 5000);
