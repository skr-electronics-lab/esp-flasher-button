<div align="center">

# ESP Flasher Button

**A zero-dependency Web Component for flashing ESP32 & ESP8266 firmware directly from the browser.**

[![GitHub stars](https://img.shields.io/github/stars/skr-electronics-lab/esp-flasher-button?style=for-the-badge&color=e03030)](https://github.com/skr-electronics-lab/esp-flasher-button/stargazers)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-orange.svg?style=for-the-badge)](https://github.com/skr-electronics-lab/esp-flasher-button/blob/main/LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Live_Demo-GitHub_Pages-22c55e?style=for-the-badge&logo=github)](https://skr-electronics-lab.github.io/esp-flasher-button/)
[![Web Serial API](https://img.shields.io/badge/Web_Serial_API-Native-8b5cf6?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
[![Support on Ko-fi](https://img.shields.io/badge/Support_on-Ko--fi-ff5e5b?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/skrelectronicslab)

<br/>

<a href="https://ko-fi.com/skrelectronicslab" target="_blank" rel="noopener">
  <img src="https://storage.ko-fi.com/cdn/kofi3.png?v=3" height="38" style="border:0px;height:38px;" alt="Support on Ko-fi" />
</a>

<br/><br/>

[**Open Live Demo & Interactive Generator**](https://skr-electronics-lab.github.io/esp-flasher-button/)

<br/>

</div>

---

## Overview

**`ESP Flasher Button`** is a self-contained, drop-in Web Component that lets users flash firmware binaries directly to **ESP32, ESP32-S2, ESP32-S3, ESP32-C3, ESP32-C6, ESP8266, and ESP8285** microcontrollers straight from any webpage using the browser's native Web Serial API.

No command-line tools, no Python, no esptool installation, and no drivers required.

```html
<script type="module" src="https://skr-electronics-lab.github.io/esp-flasher-button/esp-flasher-button.js"></script>

<!-- Add a one-click firmware flasher button to any website -->
<esp-flasher-button 
  manifest="https://yoursite.com/firmware/manifest.json" 
  label="Install Firmware"
  theme="red"
  size="18">
</esp-flasher-button>
```

---

## Features

- **Real Built-In Web Serial Monitor** — Full hardware serial console with live UART streaming, baud switching (115200 to 921600), microsecond timestamps, line ending controls (`CRLF`, `LF`, `CR`), and real RTS/DTR hardware reset buttons.
- **Improv-Wi-Fi Provisioning** — Configure Wi-Fi credentials on the ESP device over USB Serial right after flashing. No captive portals or hardcoded passwords.
- **Smart Baud Auto-Recovery** — Detects slip packet timeouts at high speeds (921600 / 460800 baud) and provides a one-click fallback to 115200 safe baud.
- **Clean Confirmation View** — Flash parameters (`Mode`, `Freq`, `Size`, `Compression`) are tucked into a collapsible drawer, keeping the UI accessible to beginners.
- **Granular Sizing System** — Supports exact numeric sizing (`size="14"`, `size="18"`, `size="22"`), explicit widths (`width="260px"`, `width="100%"`), custom heights, and custom border radius.
- **6 Curated Design Themes** — `red`, `dark`, `green`, `light`, `ghost`, and `minimal` with automatic dark/light theme support.
- **Zero Build Dependencies** — Single vanilla ES6 custom element. Only loads Espressif's `esptool-js` dynamically on first use.
- **100% Local & Private** — All flashing happens directly in the user's browser over Web Serial. Zero telemetry, zero server uploads, zero tracking.

---

## Quick Start

### 1. Include the Script

```html
<script type="module" src="https://skr-electronics-lab.github.io/esp-flasher-button/esp-flasher-button.js"></script>
```

*(Both `<esp-flasher-button>` and `<esp-flash-button>` element tags are supported.)*

### 2. Add the Custom Element

```html
<esp-flasher-button 
  manifest="https://yoursite.com/firmware/manifest.json" 
  label="Install Firmware" 
  theme="red" 
  size="18">
</esp-flasher-button>
```

### 3. Slotted Custom Button (Optional)

Wrap any custom HTML button, link, or card using `slot="activate"` to keep your existing design system:

```html
<esp-flasher-button manifest="https://yoursite.com/firmware/manifest.json">
  <button slot="activate" class="my-custom-btn">
    Flash Firmware Now
  </button>
</esp-flasher-button>
```

---

## Component Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `manifest` | — | Absolute or relative URL to the firmware `manifest.json`. Must allow CORS. |
| `label` | `"Install Firmware"` | Text displayed inside the default button. |
| `theme` | `"red"` | Button visual style: `"red"`, `"dark"`, `"green"`, `"light"`, `"ghost"`, or `"minimal"`. |
| `size` | `"14.5"` | Scale & font size: any number (e.g. `"12"`, `"14"`, `"16"`, `"18"`, `"22"`, `"26"`) or preset (`"sm"`, `"md"`, `"lg"`, `"xl"`). |
| `width` | `auto` | Explicit button width (e.g. `"240px"`, `"100%"`). |
| `height` | `auto` | Explicit button height (e.g. `"44px"`, `"48px"`). |
| `radius` | theme default | Corner radius (e.g. `"pill"`, `"12"`, `"6"`, `"0"`). |
| `full-width` | off | Stretches button across 100% of parent width. |
| `erase-first` | off | Erases entire flash before writing. |
| `baud` | `460800` | Flash baud rate (`921600`, `460800`, `230400`, `115200`). |

---

## Manifest JSON Format

Your `manifest.json` describes the firmware files and flash settings. Ensure your web server serves this file and all `.bin` files with CORS headers (`Access-Control-Allow-Origin: *`):

```json
{
  "name": "My ESP32 Project",
  "version": "1.0.0",
  "description": "Firmware installation for ESP32 microcontroller",
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
        { "path": "firmware.bin", "offset": 0 }
      ]
    },
    {
      "chipFamily": "ESP32-S3",
      "parts": [
        { "path": "bootloader.bin", "offset": 4096 },
        { "path": "partitions.bin", "offset": 32768 },
        { "path": "app.bin", "offset": 65536 }
      ]
    }
  ]
}
```

### Supported Flash Modes & Frequencies
- **`mode`**: `"dio"`, `"qio"`, `"dout"`, `"qout"`, `"keep"`
- **`freq`**: `"40m"`, `"80m"`, `"26m"`, `"20m"`, `"keep"`
- **`flashSize`**: `"detect"`, `"256KB"`, `"512KB"`, `"1MB"`, `"2MB"`, `"4MB"`, `"8MB"`, `"16MB"`
- **`compress`**: `true` (hardware flash compression enabled)

---

## Built-In Web Serial Monitor

Users can open the built-in serial monitor from the terminal button `>_` in the modal header or from the flash completion screen:

- **Instant Baud Switching** — 9600, 19200, 38400, 57600, 74880 (ESP Boot ROM), 115200 (default), 230400, 460800, 921600.
- **Configurable Line Endings** — `CRLF`, `LF`, `CR`, or None.
- **Microsecond Timestamps** — Toggle line timestamps with the `TS` button.
- **Hardware Reset & Boot Controls** — `RST` pulses RTS low to reboot; `DTR` toggles GPIO0 for bootloader entry.
- **Send & History** — Type commands and press `Enter` to transmit.

---

## Improv-Wi-Fi Provisioning Protocol

`ESP Flasher Button` includes native support for the open **Improv-Wi-Fi** serial protocol:

1. When flashing finishes, users click **Configure Wi-Fi**.
2. An inline card prompts for network SSID and Password.
3. The component transmits standard Improv RPC frames (`0x01` Send Wi-Fi Settings) over the active Web Serial connection.
4. If your ESP32 firmware supports Improv (e.g. ESPHome, or using the [Improv-WiFi SDK](https://github.com/improv-wifi/sdk-cpp)), it connects and sends back its local IP address.

---

## Browser Compatibility

The Web Serial API requires a Chromium-based desktop browser running in a secure context (`HTTPS` or `http://localhost`):

| Browser | Desktop (Windows / macOS / Linux / ChromeOS) | Android Chrome | iOS / iPadOS Safari |
|:---|:---:|:---:|:---:|
| **Google Chrome** | Supported (Chrome 89+) | Not Supported | Not Supported |
| **Microsoft Edge** | Supported (Edge 89+) | Not Supported | Not Supported |
| **Brave** | Supported | Not Supported | Not Supported |
| **Opera** | Supported (Opera 76+) | Not Supported | Not Supported |
| **Mozilla Firefox** | [No Web Serial API](https://bugzilla.mozilla.org/show_bug.cgi?id=1602447) | Not Supported | Not Supported |
| **Apple Safari** | [No Web Serial API](https://webkit.org/status/) | Not Supported | Not Supported |

> **Note on Mobile Devices:** Android Chrome does not support the Web Serial API (Android OS does not grant browsers direct USB CDC-ACM serial port enumeration access). iOS and iPadOS require Apple WebKit, which lacks Web Serial. Flashing must be done from a desktop or laptop computer using a USB data cable.

---

## CORS Configuration for Firmware Files

Your server must send `Access-Control-Allow-Origin: *` for both your `manifest.json` and all `.bin` binary files.

### GitHub Pages (Recommended)
Hosting on GitHub Pages automatically adds the required CORS headers.

### Apache (`.htaccess`)
```apache
Header set Access-Control-Allow-Origin "*"
```

### Nginx
```nginx
add_header Access-Control-Allow-Origin *;
```

### Cloudflare Pages (`_headers`)
```
/*
  Access-Control-Allow-Origin: *
```

---

## Author & Credits

Developed by **SK Raihan (SKR Electronics Lab)**.

- Ko-fi: [Support on Ko-fi](https://ko-fi.com/skrelectronicslab)
- YouTube: [@skr_electronics_lab](https://youtube.com/@skr_electronics_lab)
- Twitter (X): [@skrelectronics](https://twitter.com/skrelectronics)
- Instagram: [@skr_electronics_lab](https://instagram.com/skr_electronics_lab)
- Contact: `skrelectronicslab@gmail.com`

---

## License

This project is licensed under the [Apache License 2.0](LICENSE).

Copyright 2026 SK Raihan (SKR Electronics Lab). You are free to use, modify, and distribute this project — including in commercial products — as long as you retain the license notice and give appropriate attribution.
