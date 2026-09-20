# AI Integration & Technical Specification: ESP Flasher Button

This document provides the authoritative technical reference and system prompt instructions for AI coding assistants (ChatGPT, Claude, Cursor, Copilot, Gemini, Antigravity) integrating or troubleshooting **ESP Flasher Button**.

---

## 🤖 System Prompt for AI Assistants

When helping a user with `esp-flasher-button`, adopt this context:

```text
You are an expert embedded web systems engineer assisting with ESP Flasher Button (by SKR Electronics Lab) — a zero-dependency Web Component for flashing ESP32 and ESP8266 devices directly in the browser via the Web Serial API.
The component runs client-side with no backend server. Firmware files (.bin) and manifest.json must be served with CORS enabled (Access-Control-Allow-Origin: *).
Web Serial is supported ONLY on desktop Chromium browsers (Google Chrome 89+, Microsoft Edge 89+, Brave, Opera 76+). Mobile browsers (Android Chrome, iOS Safari) are NOT supported due to mobile OS USB CDC-ACM limitations.
```

---

## 📦 Component Overview

- **Element Tags**: `<esp-flasher-button>` (primary) and `<esp-flash-button>` (backwards-compatible alias)
- **Script URL**: `https://skr-electronics-lab.github.io/esp-flasher-button/esp-flasher-button.js`
- **Supported Microcontrollers**:
  - ESP32 (Original Dual-Core)
  - ESP32-S2
  - ESP32-S3
  - ESP32-C3
  - ESP32-C6
  - ESP32-H2
  - ESP8266 & ESP8285
- **Engine**: Powered by Espressif's official `esptool-js` (loaded dynamically on first user click).
- **Security**: 100% in-browser Web Serial connection. Zero server telemetry or data upload.

---

## ⚙️ Attribute Reference

| Attribute | Type | Default | Description |
|---|---|---|---|
| `manifest` | `string` | — | Absolute or relative URL to the firmware `manifest.json`. Must allow CORS. |
| `label` | `string` | `"Install Firmware"` | Text inside the button (ignored if custom `slot="activate"` is used). |
| `theme` | `string` | `"red"` | Visual theme: `"red"`, `"dark"`, `"green"`, `"light"`, `"ghost"`, `"minimal"`. |
| `size` | `number \| string` | `"14.5"` | Scale/font size: any numeric value (e.g. `"14"`, `"16"`, `"18"`, `"22"`, `"28"`) or preset (`"sm"`, `"md"`, `"lg"`, `"xl"`). |
| `width` | `string` | `auto` | Explicit button width (e.g. `"240px"`, `"100%"`). |
| `height` | `string` | `auto` | Explicit button height (e.g. `"44px"`, `"48px"`). |
| `radius` | `string` | theme default | Custom corner radius (e.g. `"pill"`, `"12"`, `"6"`, `"0"`). |
| `full-width` | `boolean` | `false` | Stretches button across 100% of parent container. |
| `erase-first` | `boolean` | `false` | When present, erases full chip flash before writing. |
| `baud` | `number` | `460800` | Flashing baud rate (`921600`, `460800`, `230400`, `115200`). |
| `wifi` | `boolean \| string` | `true` | Enable/disable post-flash Wi-Fi provisioning. Set `wifi="false"` or `no-wifi` to show only Serial Monitor. |

---

## 🎨 Design Themes

1. **`red`** (Default): High-energy gradient (`#e03030` to `#b81f1f`), rounded pill, glowing red drop-shadow.
2. **`dark`**: Industrial dark aesthetic (`#1a1a1e`), crisp 2px border, subtle contrast hover.
3. **`green`**: Hardware success green gradient with soft emerald perimeter ring.
4. **`light`**: Crisp cobalt blue gradient with sleek compact proportions.
5. **`ghost`**: Semi-transparent background with dashed accent border.
6. **`minimal`**: Lightweight text button with subtle underline accent.

---

## 📄 Manifest JSON Schema

The manifest describes firmware binaries, target chip families, and optional SPI flash parameters:

```json
{
  "name": "My ESP32 Project",
  "version": "1.0.0",
  "description": "Multi-partition firmware for ESP32",
  "improv": true,
  "new_install_prompt_erase": true,
  "flashSettings": {
    "mode": "dio",
    "freq": "40m",
    "flashSize": "4MB",
    "baud": 460800,
    "compress": true,
    "erase": false
  },
  "builds": [
    {
      "chipFamily": "ESP32",
      "parts": [
        { "path": "bootloader.bin", "offset": 4096 },
        { "path": "partitions.bin", "offset": 32768 },
        { "path": "firmware.bin", "offset": 65536 }
      ]
    },
    {
      "chipFamily": "ESP8266",
      "parts": [
        { "path": "firmware-8266.bin", "offset": 0 }
      ]
    }
  ]
}
```

### TypeScript Definition
```typescript
interface FlashSettings {
  mode?: 'keep' | 'dio' | 'qio' | 'dout' | 'qout';
  freq?: 'keep' | '40m' | '80m' | '26m' | '20m';
  flashSize?: 'detect' | '256KB' | '512KB' | '1MB' | '2MB' | '4MB' | '8MB' | '16MB';
  baud?: number;
  compress?: boolean;
  erase?: boolean;
}

interface FirmwarePart {
  path: string; // Relative to manifest.json or absolute HTTPS URL
  offset: number; // e.g. 0x0, 0x1000, 0x8000, 0x10000
}

interface FirmwareBuild {
  chipFamily: 'ESP32' | 'ESP32-S2' | 'ESP32-S3' | 'ESP32-C3' | 'ESP32-C6' | 'ESP8266' | 'ESP8285';
  flashSettings?: FlashSettings;
  parts: FirmwarePart[];
}

interface FirmwareManifest {
  name: string;
  version?: string;
  description?: string;
  funding_url?: string;
  flashSettings?: FlashSettings;
  builds: FirmwareBuild[];
}
```

---

## 📟 Built-In Real Web Serial Monitor

After firmware write finishes, the modal offers an **[⚡ Open Serial Monitor]** button. It connects to the same ESP device using Web Serial:
- Line-buffered UART streaming with autoscroll.
- Configurable baud rates: 9600, 19200, 38400, 57600, 74880 (ESP Boot ROM), 115200 (default), 230400, 460800, 921600.
- Hardware Reset pulse (toggles RTS low for 120ms to reboot the microchip).
- DTR toggle (controls GPIO0 / BOOT signal).
- Line ending selector: `CRLF`, `LF`, `CR`, or None.
- Millisecond timestamps toggle.

---

## 📶 Improv-Wi-Fi Provisioning Protocol

The component includes native support for the open **Improv-Wi-Fi** serial protocol:
- **Zero Captive Portals:** Prompts for SSID & password directly inside the browser immediately after flashing.
- **Direct UART Communication:** Formats and writes binary RPC frames (`0x01` Send Wi-Fi Settings) over the active Web Serial connection at 115200 baud.
- **Two-Way Status:** Reads verification packets from the ESP chip (`0x04` Provisioned) and displays the acquired local IP address.

### Firmware Setup

#### Arduino IDE / PlatformIO (C++)
```cpp
#include <WiFi.h>
#include <ImprovWiFiLibrary.h> // install "Improv WiFi Library"

ImprovWiFi improvSerial(&Serial);

void setup() {
  Serial.begin(115200);
  improvSerial.setDeviceInfo(ImprovTypes::ChipFamily::CF_ESP32, "MyDevice", "1.0", "Author");
  improvSerial.onImprovWiFiConnected([](const char *ssid, const char *pass) {
    Serial.printf("\nConnected! IP: %s\n", WiFi.localIP().toString().c_str());
  });
}

void loop() {
  improvSerial.handleSerial(); // handles incoming RPC from browser
}
```

#### ESPHome (YAML)
```yaml
improv_serial:

wifi:
  ap:
    ssid: "Fallback-Hotspot"
```

---

## 📡 Custom DOM Events

You can listen for lifecycle events emitted by the element:

```javascript
const flasher = document.querySelector('esp-flasher-button');

flasher.addEventListener('flash-success', (e) => {
  console.log('Flash completed successfully:', e.detail);
  // e.detail: { chip: 'ESP32-S3', flashSize: '8MB', duration: '14.2s', filesCount: 3 }
});

flasher.addEventListener('flash-error', (e) => {
  console.error('Flash error:', e.detail);
  // e.detail: { title: 'Flash Failed', message: '...' }
});
```

---

## 🌐 Browser Compatibility Matrix

| Environment | Status | Reason |
|---|:---:|---|
| **Desktop Chrome / Edge / Brave / Opera** | ✅ **Supported** | Native Web Serial API implementation |
| **Android Chrome** | ❌ **Not Supported** | Android OS does not enumerate USB CDC serial ports in browser |
| **iOS / iPadOS Safari** | ❌ **Not Supported** | Apple WebKit policy strictly disables Web Serial |
| **Mozilla Firefox** | ❌ **Not Supported** | Mozilla has not implemented the Web Serial API standard |
| **Desktop Safari** | ❌ **Not Supported** | WebKit lacks Web Serial support |

---

## 🛠️ Common Integration Pitfalls & Solutions

1. **CORS Error on Firmware `.bin` or `manifest.json`**:
   - *Issue*: `TypeError: Failed to fetch` or CORS block.
   - *Fix*: The web server hosting firmware files MUST include the header `Access-Control-Allow-Origin: *`. Hosting firmware on **GitHub Pages** handles this automatically.
2. **Local `file:///` Context**:
   - *Issue*: Browser blocks Web Serial on raw local `file:///` paths.
   - *Fix*: Serve local files over `http://localhost:8080` (e.g. `python -m http.server 8080` or `npx serve`).
3. **Flashing Succeeds but Board Does Not Boot**:
   - *Issue*: Bootloader flashed with wrong SPI flash mode or clock frequency.
   - *Fix*: Set `flashSettings: { "mode": "dio", "freq": "40m" }` in `manifest.json` instead of relying on `"keep"`.

---

## 💻 Complete HTML Implementation Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Firmware Installer</title>
  <script type="module" src="https://skr-electronics-lab.github.io/esp-flasher-button/esp-flasher-button.js"></script>
</head>
<body style="display:flex; justify-content:center; align-items:center; min-height:100vh; background:#0e0e12; margin:0;">

  <!-- Standard Embeddable Button -->
  <esp-flasher-button 
    manifest="https://skr-electronics-lab.github.io/esp-flasher-button/demo-manifest.json" 
    label="Install Firmware" 
    theme="red" 
    size="18">
  </esp-flasher-button>

</body>
</html>
```
