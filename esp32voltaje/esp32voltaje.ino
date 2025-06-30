#include <esp_adc_cal.h>
#include <Arduino.h>
#include <Wire.h>
#include <INA226_WE.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>

// Pines y configuración
#define ADC_PIN         35
#define ONE_WIRE_BUS    4
#define I2C_ADDRESS     0x40
#define MEASURE_INTERVAL 10000  // 10 segundos

// WiFi
const char* ssid = "Marcelo F";
const char* password = "Paraguay1";

// Backend
//const char* serverUrl = "https://sistema-de-monitoreo-55c14c44edac.herokuapp.com/api/mediciones";
const char* serverUrl = "http://192.168.100.10:3000/api/mediciones";
const char* apiKey = "miclave123";

// Objetos de sensores
INA226_WE ina226 = INA226_WE(I2C_ADDRESS);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ADC
int vref = 1100;

// Control de tiempo
unsigned long lastMeasurement = 0;

void connectToWiFi(const char *ssid, const char *pwd)
{
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

  // Inicializar sensores
  Wire.begin(21, 22);  // Pines I2C para ESP32
  ina226.init();
  ina226.setResistorRange(0.002, 7);
  ina226.waitUntilConversionCompleted();

  sensors.begin();
  Serial.print("Sensores DS18B20 detectados: ");
  Serial.println(sensors.getDeviceCount());

  // Calibrar ADC
  esp_adc_cal_characteristics_t adc_chars;
  esp_adc_cal_value_t val_type = esp_adc_cal_characterize(
      ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, vref, &adc_chars);
  if (val_type == ESP_ADC_CAL_VAL_EFUSE_VREF) {
    vref = adc_chars.vref;
  }

  // Conectar a WiFi
  connectToWiFi(ssid, password);
}

void loop() {
  unsigned long now = millis();
  if (now - lastMeasurement >= MEASURE_INTERVAL) {
    lastMeasurement = now;

    // Leer voltaje de batería por ADC
    uint16_t rawADC = analogRead(ADC_PIN);
    float battery_voltage = ((float)rawADC / 4095.0) * 2.0 * 3.3 * (vref / 1000.0);

    // Leer INA226
    ina226.readAndClearFlags();
    float busVoltage_V = ina226.getBusVoltage_V();
    float shuntVoltage_mV = ina226.getShuntVoltage_mV();
    float current_mA = ina226.getCurrent_mA();
    float loadVoltage_V = busVoltage_V + (shuntVoltage_mV / 1000.0);

    // Leer temperatura
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);

    // Mostrar por serial
    Serial.println("📡 Enviando medición al backend...");
    Serial.printf("Carga: %.2fV | Corriente: %.2fmA | Temp: %.2f°C | Batería: %.2fV\n", loadVoltage_V, current_mA, tempC, battery_voltage);

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
