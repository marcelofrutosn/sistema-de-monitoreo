#include <Arduino.h>
#include <Wire.h>
#include <INA226_WE.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_ADS1X15.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Pines y configuración
#define ONE_WIRE_BUS 4
#define I2C_ADDRESS  0x40
#define MEASURE_INTERVAL 10000  // 10 segundos

// WiFi
const char* ssid = "Marcelo F";
const char* password = "Paraguay1";

// Backend
const char* serverUrl = "https://sistema-de-monitoreo-55d27fbf8e95.herokuapp.com/api/mediciones";
//const char* serverUrl = "http://192.168.100.10:3000/api/mediciones";
const char* apiKey = "miclave123";

// Objetos de sensores
INA226_WE ina226(I2C_ADDRESS);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
Adafruit_ADS1115 ads;

// Divisor resistivo ultra bajo consumo
const float R1 = 193000.0;  // 193kΩ
const float R2 = 96000.0;   // 96kΩ
const float VOLTAGE_FACTOR = (R1 + R2) / R2;  // ≈3.01

// Control de tiempo
unsigned long lastMeasurement = 0;

void connectToWiFi(const char* ssid, const char* pwd) {
  Serial.println("Conectando a WiFi...");
  WiFi.disconnect(true);
  WiFi.begin(ssid, pwd);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi conectado. IP: " + WiFi.localIP().toString());
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);  // Pines I2C ESP32

  // INA226
  ina226.init();
  ina226.setResistorRange(0.002, 7);
  ina226.waitUntilConversionCompleted();

  // ADS1115
  if (!ads.begin()) {
    Serial.println("Error al inicializar ADS1115");
    while (1);
  }
  ads.setGain(GAIN_ONE); // ±4.096V, resolución 0.125mV

  // DS18B20
  sensors.begin();
  Serial.print("Sensores DS18B20 detectados: ");
  Serial.println(sensors.getDeviceCount());

  connectToWiFi(ssid, password);
}

void loop() {
  unsigned long now = millis();
  if (now - lastMeasurement >= MEASURE_INTERVAL) {
    lastMeasurement = now;

    // Leer voltaje de batería con ADS1115
    float battery_voltage = readBatteryVoltage();
    float battery_percent = calculateChargePercent(battery_voltage);
    String battery_status = getBatteryStatus(battery_voltage);

    // Leer INA226
    ina226.readAndClearFlags();
    float busVoltage_V = ina226.getBusVoltage_V();
    float shuntVoltage_mV = ina226.getShuntVoltage_mV();
    float current_mA = ina226.getCurrent_mA();
    float loadVoltage_V = busVoltage_V + (shuntVoltage_mV / 1000.0);

    // Leer temperatura
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);

    // Mostrar en serial
    Serial.println("📡 Enviando medición al backend...");
    Serial.printf("Carga: %.2fV | Corriente: %.2fmA | Temp: %.2f°C | Batería: %.2fV (%.1f%%) - %s\n",
      loadVoltage_V, current_mA, tempC, battery_voltage, battery_percent, battery_status.c_str());

    // Enviar HTTP POST
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", apiKey);

      String payload = "{";
      payload += "\"voltaje\":" + String(loadVoltage_V, 2) + ",";
      payload += "\"corriente\":" + String(current_mA, 2) + ",";
      payload += "\"temperatura\":" + String(tempC, 2) + ",";
      payload += "\"bateria\":" + String(battery_voltage, 2);
      payload += "}";

      int httpResponseCode = http.POST(payload);
      Serial.print("Respuesta HTTP: ");
      Serial.println(httpResponseCode);
      http.end();
    } else {
      Serial.println("⚠️ WiFi desconectado");
    }

    Serial.println();
  }
}

// Promedio de múltiples lecturas
float readBatteryVoltage() {
  float sum = 0;
  for (int i = 0; i < 10; i++) {
    int16_t adc = ads.readADC_SingleEnded(0);
    float measured = ads.computeVolts(adc);
    sum += measured * VOLTAGE_FACTOR;
  }
  return sum / 10.0;
}

// Estimación curva Li-ion
float calculateChargePercent(float voltage) {
  if (voltage >= 4.2) return 100.0;
  if (voltage >= 4.0) return 80.0 + (voltage - 4.0) * 100.0;
  if (voltage >= 3.8) return 50.0 + (voltage - 3.8) * 150.0;
  if (voltage >= 3.6) return 20.0 + (voltage - 3.6) * 150.0;
  if (voltage >= 3.4) return 5.0 + (voltage - 3.4) * 75.0;
  if (voltage >= 3.0) return (voltage - 3.0) * 12.5;
  return 0.0;
}

// Estado descriptivo
String getBatteryStatus(float voltage) {
  if (voltage > 4.1) return "Completamente cargada ⚡";
  if (voltage > 3.9) return "Carga alta 🟢";
  if (voltage > 3.7) return "Carga media 🟡";
  if (voltage > 3.4) return "Carga baja 🟠";
  if (voltage > 3.0) return "Crítica - Cargar urgente 🔴";
  return "Descargada ❌";
}
