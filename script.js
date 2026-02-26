// ---------------- MQTT CONFIG ----------------
const BROKER = "wss://broker.hivemq.com:8884/mqtt";
const SENSOR_TOPIC = "livestock/sensors";
const STATUS_TOPIC = "livestock/status";
const LED_TOPIC = "livestock/led";
const TEMP_MIN = 20;
const AMMONIA_MAX = 25;
// --------------------------------------------

const client = mqtt.connect(BROKER);
let lastTempState = "";

const mqttStatus = document.getElementById("mqttStatus");
const loadingScreen = document.getElementById("loadingScreen");
const alertBox = document.getElementById("alertBox");
const pigLogo = document.querySelector(".pig-logo");

function setConnectionState(state, label) {
    mqttStatus.textContent = label;
    mqttStatus.classList.remove("online", "offline");
    mqttStatus.classList.add(state);
}

client.on("connect", () => {
    console.log("Connected to MQTT broker");
    loadingScreen.style.display = "none";
    setConnectionState("online", "Online");
    client.subscribe(SENSOR_TOPIC);
});

client.on("offline", () => {
    console.log("MQTT offline");
    setConnectionState("offline", "Offline");
});

client.on("error", (err) => {
    console.error("MQTT error", err);
    setConnectionState("offline", "Error");
});const ledButton = document.getElementById("ledButton");
let ledState = false;  // false = OFF, true = ON
ledState = !ledState;
const msg = ledState ? "OFF" : "ON";  // swapped
client.publish(LED_TOPIC, msg);

ledButton.textContent = ledState ? "Turn OFF LED" : "Turn ON LED";

ledButton.addEventListener("click", () => {
    if (!client.connected) {
        alert("MQTT not connected");
        return;
    }

    ledState = !ledState;

    const msg = ledState ? "ON" : "OFF";
    client.publish(LED_TOPIC, msg);

    ledButton.textContent = ledState ? "Turn ON Farm Lights" : "Turn OFF Farm Lights";

    console.log("LED command sent:", msg);
}); 
client.on("message", (_topic, message) => {
    let data;
    try {
        data = JSON.parse(message.toString());
    } catch (e) {
        console.error("Invalid JSON:", message.toString());
        return;
    }

    if (data.temperature !== undefined) {
        document.getElementById("temperature").textContent = `${data.temperature} C`;
    }

    if (data.ammonia !== undefined) {
        document.getElementById("ammonia").textContent = `${data.ammonia} ppm`;
    }

    if (data.load !== undefined) {
        document.getElementById("load").textContent = `${data.load} kg`;
    }

    if (data.energy !== undefined) {
        document.getElementById("energy").textContent = `${data.energy} Wh`;
    }

    const heaterOn = data.temperature < TEMP_MIN;
    const pumpOn = data.ammonia > AMMONIA_MAX;

    document.getElementById("heaterStatus").textContent = heaterOn ? "ON" : "OFF";
    document.getElementById("pumpStatus").textContent = pumpOn ? "ON" : "OFF";

    let alertMsg = "All systems normal";
    let alertClass = "alert safe";

    if (heaterOn && pumpOn) {
        alertMsg = "Temperature low and ammonia high - Heater and Pump activated";
        alertClass = "alert danger";
    } else if (heaterOn) {
        alertMsg = "Temperature is below threshold - Heater Activated";
        alertClass = "alert danger";
    } else if (pumpOn) {
        alertMsg = "High ammonia detected - Pump Activated";
        alertClass = "alert danger";
    }

    alertBox.textContent = alertMsg;
    alertBox.className = alertClass;
    pigLogo.classList.toggle("alert", alertClass.includes("danger"));

    const now = new Date();
    document.getElementById("lastUpdated").textContent =
        `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    const currentTempState = heaterOn ? "LOW" : "NORMAL";

    if (currentTempState !== lastTempState) {
        const statusMsg = currentTempState === "LOW"
            ? "Temperature is LOW"
            : "Temperature is NORMAL";

        client.publish(STATUS_TOPIC, statusMsg);
        console.log("Published:", statusMsg);
        lastTempState = currentTempState;
    }
});
