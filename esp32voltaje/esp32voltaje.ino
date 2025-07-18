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

// Relés
#define RELAY_CARGA 13
#define RELAY_MEDICION 33

// Estado de carga
bool cargaActiva = false;

// WiFi
const char* ssid = "Marcelo F";
const char* password = "Paraguay1";

// Backend
const char* serverUrl = "https://sistema-de-monitoreo-55d27fbf8e95.herokuapp.com/api/mediciones";
const char* apiKey = "miclave123";

// Sensores
INA226_WE ina226(I2C_ADDRESS);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
Adafruit_ADS1115 ads;

// Divisor resistivo para batería
const float R1 = 193000.0;
const float R2 = 96000.0;
const float VOLTAGE_FACTOR = (R1 + R2) / R2;

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

void activarCarga() {
  digitalWrite(RELAY_CARGA, LOW);   // NC = carga activa
  cargaActiva = true;
  Serial.println("🔋 Carga activada");
}

void desactivarCarga() {
  digitalWrite(RELAY_CARGA, HIGH);  // NO = carga inactiva
  cargaActiva = false;
  Serial.println("⏸️ Carga desactivada");
}

void configurarMedicionVoltaje() {
  digitalWrite(RELAY_MEDICION, LOW);  // NC = medir voltaje
  Serial.println("⚡ Configurado para medir voltaje");
}

void configurarMedicionCorriente() {
  digitalWrite(RELAY_MEDICION, HIGH); // NO = medir corriente
  Serial.println("⚡ Configurado para medir corriente");
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);  // Pines I2C

  // Configurar relés
  pinMode(RELAY_CARGA, OUTPUT);
  pinMode(RELAY_MEDICION, OUTPUT);
  
  // Estado inicial: cargando y midiendo voltaje
  activarCarga();
  configurarMedicionVoltaje();

  // INA226
  if (!ina226.init()) {
    Serial.println("Error al inicializar INA226");
    while (1);
  }
  ina226.setResistorRange(0.002, 7);
  ina226.waitUntilConversionCompleted();

  // ADS1115
  if (!ads.begin()) {
    Serial.println("Error al inicializar ADS1115");
    while (1);
  }
  ads.setGain(GAIN_ONE);

  // DS18B20
  sensors.begin();
  Serial.print("Sensores DS18B20 detectados: ");
  Serial.println(sensors.getDeviceCount());

  connectToWiFi(ssid, password);
  Serial.println("✅ Sistema iniciado correctamente");
}

void loop() {
  unsigned long now = millis();
  if (now - lastMeasurement >= MEASURE_INTERVAL) {
    lastMeasurement = now;
    realizarMediciones();
  }
}

void realizarMediciones() {
  Serial.println("\n🔍 Iniciando rutina de medición...");

  float loadVoltage_V = 0.0;
  float current_mA = 0.0;
  float tempC = 0.0;

  // Leer batería
  float battery_voltage = readBatteryVoltage();
  float battery_percent = calculateChargePercent(battery_voltage);
  String battery_status = getBatteryStatus(battery_voltage);

  // Control de carga con histéresis
  if (!cargaActiva && battery_voltage < 3.3) {
    activarCarga();
  } else if (cargaActiva && battery_voltage >= 4.0) {
    desactivarCarga();
  }

  // Solo medir si la batería es suficiente
  if (battery_voltage >= 3.3) {
    Serial.println("⚡ Batería suficiente, iniciando medición de panel...");

    // Paso 1: Desconectar carga para medir voltaje sin carga
    desactivarCarga();
    configurarMedicionVoltaje();
    delay(1000);  // Tiempo de estabilización más largo
    
    // Limpiar y medir voltaje
    ina226.readAndClearFlags();
    delay(100);
    float busVoltage_V = ina226.getBusVoltage_V();
    float shuntVoltage_mV = ina226.getShuntVoltage_mV();
    loadVoltage_V = busVoltage_V + (shuntVoltage_mV / 1000.0);
    
    Serial.printf("📊 Voltaje medido: %.3fV (Bus: %.3fV, Shunt: %.3fmV)\n", 
                  loadVoltage_V, busVoltage_V, shuntVoltage_mV);

    // Paso 2: Configurar para medir corriente
    configurarMedicionCorriente();
    delay(3000);  // Tiempo de estabilización para corriente
    
    // Limpiar y medir corriente
    ina226.readAndClearFlags();
    delay(100);
    current_mA = ina226.getCurrent_mA();
    
    Serial.printf("📊 Corriente medida: %.3fmA\n", current_mA);

    // Paso 3: Restaurar estado según nivel de batería
    configurarMedicionVoltaje();
    if (battery_voltage < 4.0) {
      activarCarga();
    }

    // Leer temperatura
    sensors.requestTemperatures();
    tempC = sensors.getTempCByIndex(0);
    
    Serial.printf("🌡️ Temperatura: %.2f°C\n", tempC);
  } else {
    Serial.println("⚠️ Batería baja: solo se reporta nivel de batería.");
  }

  // Mostrar resultados
  Serial.println("\n📈 RESUMEN DE MEDICIONES:");
  Serial.printf("  Panel: %.2fV | %.2fmA | %.2fW\n", 
                loadVoltage_V, current_mA, (loadVoltage_V * current_mA / 1000.0));
  Serial.printf("  Temperatura: %.2f°C\n", tempC);
  Serial.printf("  Batería: %.2fV (%.1f%%) - %s\n", 
                battery_voltage, battery_percent, battery_status.c_str());
  Serial.printf("  Estado carga: %s\n", cargaActiva ? "ACTIVA" : "INACTIVA");

  // Enviar HTTP POST
  if (WiFi.status() == WL_CONNECTED) {
    enviarDatos(loadVoltage_V, current_mA, tempC, battery_voltage);
  } else {
    Serial.println("⚠️ WiFi desconectado, reintentando...");
    connectToWiFi(ssid, password);
  }

  Serial.println("✅ Medición completa.\n");
}

void enviarDatos(float voltaje, float corriente, float temperatura, float bateria) {
  Serial.println("📡 Enviando datos al backend...");
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);
  http.setTimeout(10000);  // 10 segundos timeout

  String payload = "{";
  payload += "\"voltaje\":" + String(voltaje, 3) + ",";
  payload += "\"corriente\":" + String(corriente, 3) + ",";
  payload += "\"temperatura\":" + String(temperatura, 2) + ",";
  payload += "\"bateria\":" + String(bateria, 3) + ",";
  payload += "\"potencia\":" + String((voltaje * corriente / 1000.0), 3) + ",";
  payload += "\"timestamp\":" + String(millis());
  payload += "}";

  Serial.println("📤 Payload: " + payload);

  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Respuesta HTTP: %d\n", httpResponseCode);
    if (httpResponseCode != 200) {
      Serial.println("⚠️ Respuesta: " + response);
    }
  } else {
    Serial.printf("❌ Error HTTP: %d\n", httpResponseCode);
  }
  
  http.end();
}

float readBatteryVoltage() {
  float sum = 0;
  const int samples = 10;
  
  for (int i = 0; i < samples; i++) {
    int16_t adc = ads.readADC_SingleEnded(0);
    float measured = ads.computeVolts(adc);
    sum += measured * VOLTAGE_FACTOR;
    delay(10);  // Pequeña pausa entre muestras
  }
  
  return sum / samples;
}

float calculateChargePercent(float voltage) {
  // Curva más precisa para Li-ion
  if (voltage >= 4.2) return 100.0;
  if (voltage >= 4.0) return 80.0 + (voltage - 4.0) * 100.0;
  if (voltage >= 3.8) return 50.0 + (voltage - 3.8) * 150.0;
  if (voltage >= 3.6) return 20.0 + (voltage - 3.6) * 150.0;
  if (voltage >= 3.4) return 5.0 + (voltage - 3.4) * 75.0;
  if (voltage >= 3.0) return (voltage - 3.0) * 12.5;
  return 0.0;
}

String getBatteryStatus(float voltage) {
  if (voltage > 4.1) return "Completamente cargada ⚡";
  if (voltage > 3.9) return "Carga alta 🟢";
  if (voltage > 3.7) return "Carga media 🟡";
  if (voltage > 3.4) return "Carga baja 🟠";
  if (voltage > 3.0) return "Crítica - Cargar urgente 🔴";
  return "Descargada ❌";
}