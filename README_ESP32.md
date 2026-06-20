# ESP32 Arduino Sketch — AquaPulse IoT Integration

## Required Libraries
Install via Arduino Library Manager:
- `WiFi` (built-in ESP32)
- `HTTPClient` (built-in ESP32)
- `ArduinoJson` v6.x

## Wiring

| Sensor | ESP32 Pin |
|--------|-----------|
| pH Sensor (analog out) | GPIO 34 (ADC) |
| Turbidity Sensor (analog out) | GPIO 35 (ADC) |
| DS18B20 Temperature | GPIO 4 (OneWire) |

---

## Sample Sketch

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ===== CONFIGURATION =====
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "https://your-render-backend.onrender.com/api/sensors/ingest";
const char* DEVICE_ID     = "ESP32-001";  // Must match WaterSource.deviceId in DB
const char* DEVICE_KEY    = "aquapulse_device_secret_key_2024"; // Must match DEVICE_API_KEY in .env

const int PH_PIN          = 34;
const int TURBIDITY_PIN   = 35;
const int TEMP_PIN        = 4;
const int INTERVAL_MS     = 60000; // 60 seconds between readings

// ===== TEMPERATURE SETUP =====
OneWire oneWire(TEMP_PIN);
DallasTemperature tempSensor(&oneWire);

// ===== pH CALIBRATION =====
// Calibrate with buffer solutions at pH 4.0 and 7.0
float calibratePH(int rawADC) {
  float voltage = rawADC * (3.3 / 4095.0);
  // Adjust these values after calibration
  float ph = 3.5 * voltage + 0.0;
  return constrain(ph, 0, 14);
}

// ===== TURBIDITY CALIBRATION =====
// 0 NTU = ~4.2V, 3000 NTU = ~2.5V (varies by sensor)
float calibrateTurbidity(int rawADC) {
  float voltage = rawADC * (3.3 / 4095.0);
  float ntu = -1120.4 * sq(voltage) + 5742.3 * voltage - 4352.9;
  return max(0.0f, ntu);
}

void setup() {
  Serial.begin(115200);
  tempSensor.begin();

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected: " + WiFi.localIP().toString());
}

void loop() {
  // Read sensors
  int phRaw = analogRead(PH_PIN);
  int turbRaw = analogRead(TURBIDITY_PIN);
  tempSensor.requestTemperatures();
  float temperature = tempSensor.getTempCByIndex(0);

  float ph = calibratePH(phRaw);
  float turbidity = calibrateTurbidity(turbRaw);

  Serial.printf("pH: %.2f | Turbidity: %.2f NTU | Temp: %.1f°C\n", ph, turbidity, temperature);

  // Build JSON payload
  StaticJsonDocument<200> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["ph"]          = ph;
  doc["turbidity"]   = turbidity;
  doc["temperature"] = temperature;

  String payload;
  serializeJson(doc, payload);

  // POST to AquaPulse backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-key", DEVICE_KEY);

    int responseCode = http.POST(payload);

    if (responseCode > 0) {
      String response = http.getString();
      Serial.printf("✅ Server response [%d]: %s\n", responseCode, response.c_str());
    } else {
      Serial.printf("❌ HTTP Error: %s\n", http.errorToString(responseCode).c_str());
    }
    http.end();
  } else {
    Serial.println("⚠️  WiFi disconnected — skipping this reading");
    WiFi.reconnect();
  }

  delay(INTERVAL_MS);
}
```

---

## Setup Steps

1. Install Arduino IDE + ESP32 board support
2. Install `ArduinoJson`, `DallasTemperature`, `OneWire` libraries
3. Replace `YOUR_WIFI_SSID`, `YOUR_WIFI_PASSWORD`, and `SERVER_URL` with your values
4. Set `DEVICE_ID` to match the `deviceId` field of your WaterSource in MongoDB (set via Admin panel)
5. Keep `DEVICE_KEY` the same as `DEVICE_API_KEY` in your server `.env`
6. Upload and open Serial Monitor at 115200 baud
7. Calibrate pH and turbidity sensors with reference solutions

## Expected Response

```json
{
  "success": true,
  "message": "Reading ingested successfully",
  "data": {
    "readingId": "...",
    "status": "safe",
    "flags": [],
    "alertsCreated": 0
  }
}
```

## Safety Thresholds (WHO/BIS Standards)

| Parameter | Safe | Warning | Unsafe |
|-----------|------|---------|--------|
| pH | 6.5 – 8.5 | 6.0–6.5 / 8.5–9.0 | <6.0 / >9.0 |
| Turbidity | < 1 NTU | 1–4 NTU | > 4 NTU |
| Temperature | 10–25°C | 5–10 / 25–30°C | <5°C / >30°C |
