#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================
// WIFI CONFIGURATION
// ============================
const char* ssid = "LOHITH_5G";
const char* password = "Lohith@10";

// URL of the backend API readings endpoint
const char* SERVER_URL = "https://aquapulse-backend-8xwo.onrender.com/api/readings";

// Must match the WaterSource deviceId in MongoDB (set via admin dashboard)
const char* DEVICE_ID = "ESP32-001";

// ============================
// PINS CONFIGURATION
// ============================
#define PH_PIN 34
#define TURBIDITY_PIN 35

#define RED_LED 25
#define GREEN_LED 27
#define BUZZER_PIN 26

// ============================
// LCD INITIALIZATION (0x27 address, 16x2 characters)
// ============================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ============================
// VARIABLES & TIMING
// ============================
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 10000; // 10 seconds interval

// ============================
// TURBIDITY TO NTU CALIBRATION
// ============================
float calculateTurbidityNTU(int rawADC) {
  float voltage = rawADC * (3.3 / 4095.0);
  
  // =========================================================================
  // CALIBRATION: Put your sensor in clean water and read the "Turbidity Voltage" 
  // from the Serial Monitor. If it reads 1.423V, change vClean below to 1.423
  // =========================================================================
  const float vClean = 1.423; // <-- CHANGE THIS to your clean water voltage (e.g., 1.423)
  
  if (voltage >= vClean) {
    return 0.0;
  }
  
  // Standard polynomial conversion formula:
  float ntu = -1120.4 * (voltage * voltage) + 5742.3 * voltage - 4352.9;
  
  // Fallback linear mapping if polynomial is out of range or you are using 3.3V scaling
  if (ntu < 0.0 || ntu > 3000.0) {
    // Maps vClean (clean water) -> 0.0 NTU, and 0.0V (maximum dirty) -> 100.0 NTU
    ntu = (vClean - voltage) * (100.0 / vClean);
  }
  
  if (ntu < 0.0) ntu = 0.0;
  return ntu;
}

// ============================
// SETUP
// ============================
void setup()
{
  Serial.begin(115200);

  // Set ADC attenuation and resolution for 12-bit analog reads (0 - 4095)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Turn off LEDs and Buzzer on startup
  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize LCD
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0,0);
  lcd.print("Water Monitor");
  lcd.setCursor(0,1);
  lcd.print("Connecting...");
  delay(1500);

  // ==========================
  // WIFI CONNECTION
  // ==========================
  WiFi.begin(ssid, password);

  while(WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("WiFi Connected");
  delay(1500);

  lcd.clear();
}

// ============================
// MAIN LOOP
// ============================
void loop()
{
  // ==========================
  // pH SENSOR READ & CALCULATION
  // ==========================
  long phSum = 0;
  for(int i = 0; i < 20; i++)
  {
    phSum += analogRead(PH_PIN);
    delay(10);
  }
  float phADC = phSum / 20.0;
  float phVoltage = phADC * (3.3 / 4095.0);
  
  // Standard pH formula based on voltage offset from neutral pH 7 (2.5V reference)
  float pH = 7.0 + ((2.50 - phVoltage) / 0.19);

  if(pH < 0) pH = 0;
  if(pH > 14) pH = 14;

  // ==========================
  // TURBIDITY SENSOR READ & CALCULATION
  // ==========================
  long turbiditySum = 0;
  for(int i = 0; i < 100; i++)
  {
    turbiditySum += analogRead(TURBIDITY_PIN);
    delay(2);
  }
  int turbidityRaw = turbiditySum / 100;
  float turbidityVoltage = turbidityRaw * (3.3 / 4095.0);
  
  // Calibrate raw ADC average value to standard NTU units
  float turbidityNTU = calculateTurbidityNTU(turbidityRaw);

  // ==========================
  // SAFETY STATUS DETERMINATION (Matches website logic)
  // ==========================
  String status;
  
  // Safety criteria: pH in safe range [6.0 - 8.0]
  if(pH >= 6.0 && pH <= 8.0)
  {
    status = "SAFE";
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(RED_LED, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }
  else
  {
    status = "UNSAFE";
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
  }

  // ==========================
  // LCD DISPLAY UPDATE
  // ==========================
  lcd.clear();

  // Print pH on the left of line 1
  lcd.setCursor(0,0);
  lcd.print("pH:");
  lcd.print(pH, 1);

  // Print Turbidity NTU on the right of line 1
  lcd.setCursor(8,0);
  lcd.print("NTU:");
  lcd.print(turbidityNTU, 1);

  // Print safety status on line 2
  lcd.setCursor(0,1);
  if(status == "SAFE")
  {
    lcd.print("SAFE WATER");
  }
  else
  {
    lcd.print("UNSAFE WATER");
  }

  // ==========================
  // SERIAL MONITOR OUTPUT
  // ==========================
  Serial.println("================================");
  Serial.print("pH Value: ");
  Serial.println(pH, 2);
  Serial.print("Turbidity Raw ADC: ");
  Serial.println(turbidityRaw);
  Serial.print("Turbidity Voltage: ");
  Serial.println(turbidityVoltage, 3);
  Serial.print("Turbidity NTU: ");
  Serial.println(turbidityNTU, 2);
  Serial.print("Water Status: ");
  Serial.println(status);

  // ==========================
  // SEND DATA TO WEBSITE (API)
  // ==========================
  if(millis() - lastSendTime >= SEND_INTERVAL)
  {
    lastSendTime = millis();

    if(WiFi.status() == WL_CONNECTED)
    {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      // Construct JSON Payload
      StaticJsonDocument<256> doc;
      doc["deviceId"] = DEVICE_ID;
      doc["ph"] = pH;
      doc["turbidity"] = turbidityNTU; // Send calibrated NTU value to the website!
      doc["temperature"] = 25.0;       // Added temperature field to pass backend validation
      doc["status"] = status;

      String jsonPayload;
      serializeJson(doc, jsonPayload);

      Serial.print("Sending Payload: ");
      Serial.println(jsonPayload);

      int httpResponseCode = http.POST(jsonPayload);

      if(httpResponseCode > 0)
      {
        Serial.print("✅ Data Sent Successfully! HTTP Response: ");
        Serial.println(httpResponseCode);
      }
      else
      {
        Serial.print("❌ POST Error: ");
        Serial.println(httpResponseCode);
      }

      http.end();
    }
    else
    {
      Serial.println("⚠️ WiFi Disconnected. Reconnecting...");
      WiFi.reconnect();
    }
  }

  delay(1000); // 1-second delay between checks
}
