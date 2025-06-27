#include <Wire.h>
#include <INA226_WE.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define I2C_ADDRESS 0x40
#define ONE_WIRE_BUS 4
#define MEASURE_INTERVAL 10000  // 10 segundos

// WiFi
const char* ssid = "Marcelo F";
const char* password = "Paraguay1";

// Backend
const char* serverUrl = "https://sistema-de-monitoreo-55c14c44edac.herokuapp.com/api/mediciones"; // IP local del backend
const char* apiKey = "miclave123";  // si usás API key

INA226_WE ina226 = INA226_WE(I2C_ADDRESS);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

unsigned long lastMeasurement = 0;

void setup() {
  Serial.begin(9600);

  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("¡Conectado!");

  Wire.begin(21, 22); // I2C para INA226
  ina226.init();
  ina226.setResistorRange(0.002, 7);
  ina226.waitUntilConversionCompleted();

  sensors.begin();
  Serial.print("Sensores DS18B20 detectados: ");
  Serial.println(sensors.getDeviceCount());
}

void loop() {
  unsigned long now = millis();
  if (now - lastMeasurement >= MEASURE_INTERVAL) {
    lastMeasurement = now;

    // Lectura sensores
    ina226.readAndClearFlags();
    float busVoltage_V = ina226.getBusVoltage_V();
    float shuntVoltage_mV = ina226.getShuntVoltage_mV();
    float current_mA = ina226.getCurrent_mA();
    float loadVoltage_V = busVoltage_V + (shuntVoltage_mV / 1000.0);

    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);

    // Mostrar por serial
    Serial.println("POST a backend...");
    Serial.printf("V: %.2fV | I: %.2fmA | T: %.2f°C\n", loadVoltage_V, current_mA, tempC);

    // Enviar HTTP POST
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", apiKey); // si tu backend espera API key

      String payload = "{";
      payload += "\"voltaje\":" + String(loadVoltage_V, 2) + ",";
      payload += "\"corriente\":" + String(current_mA, 2) + ",";
      payload += "\"temperatura\":" + String(tempC, 2);
      payload += "}";

      int httpResponseCode = http.POST(payload);
      Serial.print("Código respuesta: ");
      Serial.println(httpResponseCode);

      http.end();
    } else {
      Serial.println("⚠️ WiFi desconectado");
    }

    Serial.println();
  }
}
