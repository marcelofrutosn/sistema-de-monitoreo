#include <esp_adc_cal.h>
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define ADC_PIN 35

// WiFi credentials
const char *networkName = "Marcelo F";
const char *networkPswd = "Paraguay1";

// Backend URL
const char* serverUrl = "https://sistema-de-monitoreo-55c14c44edac.herokuapp.com/api/mediciones"; // IP local del backend
//const char *serverUrl = "http://192.168.100.10:3000/api/mediciones";  // ⚠️ Cambia por tu IP o dominio

bool connected = false;
int vref = 1100;
uint32_t timeStamp = 0;
const char* apiKey = "miclave123";  // si usás API key

void connectToWiFi(const char *ssid, const char *pwd)
{
  Serial.println("Conectando a WiFi...");
  WiFi.disconnect(true);
  WiFi.begin(ssid, pwd);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  connected = true;
  Serial.println("\nWiFi conectado. IP: " + WiFi.localIP().toString());
}

void setup()
{
  Serial.begin(115200);

  // Calibrar ADC
  esp_adc_cal_characteristics_t adc_chars;
  esp_adc_cal_value_t val_type = esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, 1100, &adc_chars);
  if (val_type == ESP_ADC_CAL_VAL_EFUSE_VREF) {
    vref = adc_chars.vref;
  }

  connectToWiFi(networkName, networkPswd);
}

void loop()
{
  if (connected && millis() - timeStamp > 10000) {  // Cada 10 segundos
    timeStamp = millis();

    // Leer voltaje de batería
    uint16_t v = analogRead(ADC_PIN);
    float battery_voltage = ((float)v / 4095.0) * 2.0 * 3.3 * (vref / 1000.0);

    Serial.print("Voltaje de batería: ");
    Serial.println(battery_voltage);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("x-api-key", apiKey); // si tu backend espera API key

      String payload = "{";
      payload += "\"voltaje\":0,";
      payload += "\"corriente\":0,";
      payload += "\"temperatura\":0,";
      payload += "\"bateria\":" + String(battery_voltage);
      payload += "}";

      int httpResponseCode = http.POST(payload);
      Serial.print("Respuesta HTTP: ");
      Serial.println(httpResponseCode);
      http.end();
    }
  }
}
