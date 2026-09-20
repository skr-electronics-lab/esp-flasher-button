#include <Arduino.h>

#ifdef LED_ACTIVE_LOW
  #define BLINK_ON LOW
  #define BLINK_OFF HIGH
#else
  #define BLINK_ON HIGH
  #define BLINK_OFF LOW
#endif

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, BLINK_ON);
  delay(500);
  digitalWrite(LED_BUILTIN, BLINK_OFF);
  delay(500);
}