<div align="center">

# ⚡ ESP Flasher Button

**The ultra-modern, zero-dependency Web Component for flashing ESP32 & ESP8266 firmware directly from your browser.**

[![GitHub stars](https://img.shields.io/github/stars/skr-electronics-lab/esp-flasher-button?style=for-the-badge&color=e03030)](https://github.com/skr-electronics-lab/esp-flasher-button/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://github.com/skr-electronics-lab/esp-flasher-button/blob/main/LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Live_Demo-GitHub_Pages-22c55e?style=for-the-badge&logo=github)](https://skr-electronics-lab.github.io/esp-flasher-button/)
[![Web Serial API](https://img.shields.io/badge/Web_Serial_API-Native-8b5cf6?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)

<br/>

[**🌐 View Live Demo & Interactive Sizing Playground**](https://skr-electronics-lab.github.io/esp-flasher-button/)

<br/>

</div>

---

## 🌟 Overview

**`ESP Flasher Button`** is a self-contained, drop-in Web Component that lets users flash firmware binaries to **ESP32, ESP32-S2, ESP32-S3, ESP32-C3, ESP32-C6, ESP8266, and ESP8285** microcontrollers straight from a webpage using Web Serial.

No command line, no Python, no esptool installation, and no drivers required.

```html
<script type="module" src="https://skr-electronics-lab.github.io/esp-flasher-button/esp-flasher-button.js"></script>

<!-- Flash directly from any GitHub repository's latest release! -->
<esp-flasher-button github="skr-electronics-lab/flyradar32" label="Install FlyRadar32"></esp-flasher-button>
```

---

## ✨ Features

- 🚀 **GitHub Releases Auto-Resolver**: Pass `github="owner/repo"` to automatically query the GitHub API, locate the latest release tag, and flash attached `.bin` files without hosting a manual `manifest.json`.
- ⚡ **1-Click Serial Monitor**: Built-in full-featured Web Serial Terminal with baud rate switching (115200 to 921600), timestamping, line ending controls (`LF`, `CRLF`, `CR`), and RTS/DTR hardware reset buttons.
- 📶 **Improv-Wi-Fi Provisioning**: Send local Wi-Fi credentials to the ESP device directly over USB Serial right after flashing—no captive portals or hardcoded passwords needed.
- 🔄 **Smart Baud Auto-Recovery**: Detects cable noise or slip packet timeouts at high speeds (921600 / 460800 baud) and offers 1-click fallback to 115200 safe baud.
- 🎛️ **Clean Confirmation View**: Technical flash parameters (`Mode`, `Freq`, `Size`, `Compression`) are tucked neatly into a collapsed `<details>` drawer showing a compact summary line, keeping the view clean.
- 📐 **Arbitrary Sizing System**: Supports exact numeric font sizes (`size="14"`, `size="18"`, `size="22"`), explicit widths (`width="240px"`, `width="100%"`), custom heights (`height="48px"`), and custom border radius (`radius="pill"`, `radius="10"`).
- 🎨 **6 Curated Design Themes**: `red`, `dark`, `green`, `light`, `ghost`, and `minimal` with automatic dark/light theme support.
- 📦 **Zero Dependencies / Single File**: Pure vanilla ES6 Custom Element (~150 KB self-contained). Only loads Espressif's `esptool-js` dynamically on demand.

---

## 🚀 Quick Start

### Option A: Flash directly from GitHub Releases (Zero-Config)

If your firmware binaries (`factory.bin`, `app.bin`, `bootloader.bin`, etc.) are hosted on GitHub Releases, you don't even need a manifest:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script type="module" src="https://skr-electronics-lab.github.io/esp-flasher-button/esp-flasher-button.js"></script>
</head>
<body>

  <esp-flasher-button 
    github="skr-electronics-lab/flyradar32" 
    label="Install FlyRadar32"
    theme="red"
    size="16">
  </esp-flasher-button>

</body>
</html>
```

### Option B: Using a `manifest.json`

Point the button to your hosted firmware manifest:

```html
<esp-flasher-button 
  manifest="https://yoursite.com/firmware/manifest.json" 
  label="Flash Custom Firmware"
  theme="dark">
</esp-flasher-button>
```

### Option C: Custom Trigger Button (Slot Support)

Wrap any custom HTML button, link, or card using `slot="activate"`:

```html
<esp-flasher-button github="skr-electronics-lab/flyradar32">
  <button slot="activate" class="my-custom-tailwind-btn">
    ⚡ Flash FlyRadar32 Firmware
  </button>
</esp-flasher-button>
```

---

## ⚙️ Component Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `github` | — | GitHub repository in `"owner/repo"` format. Auto-fetches latest release assets. |
| `manifest` | — | URL to firmware `manifest.json` (required unless `github` is used). |
| `label` | `"Install Firmware"` | Text displayed inside the button. |
| `theme` | `"red"` | `"red"`, `"dark"`, `"green"`, `"light"`, `"ghost"`, or `"minimal"`. |
| `size` | `"14.5"` | Button scale: any number (e.g. `"12"`, `"14"`, `"16"`, `"18"`, `"20"`, `"24"`) or preset (`"sm"`, `"md"`, `"lg"`, `"xl"`). |
| `width` | `auto` | Explicit button width (e.g. `"240px"`, `"100%"`, `"320"`). |
| `height` | `auto` | Explicit button height (e.g. `"44px"`, `"48"`). |
| `radius` | theme default | Corner radius (e.g. `"6"`, `"12"`, `"pill"`, `"0"`). |
| `full-width` / `block` | off | Stretches button across 100% of parent container width. |
| `erase-first` | off | Forces full flash erasure before writing. |
| `baud` | `460800` | Target flashing baud rate (`921600`, `460800`, `230400`, `115200`). |

---

## 📄 Manifest JSON Format

When using `manifest="path/to/manifest.json"`, you have full granular control over flashing parameters:

```json
{
  "name": "FlyRadar32 ADS-B Receiver",
  "version": "v1.2.0",
  "description": "ESP32 aircraft radar with 1.8-inch ST7735 display and Web UI",
  "flashSettings": {
    "mode": "dio",
    "freq": "80m",
    "flashSize": "4MB",
    "baud": 460800,
    "compress": true,
    "erase": false
  },
  "builds": [
    {
      "chipFamily": "ESP32",
      "parts": [
        { "path": "firmware/flyradar32-factory.bin", "offset": 0 }
      ]
    },
    {
      "chipFamily": "ESP32",
      "parts": [
        { "path": "firmware/bootloader.bin", "offset": 4096 },
        { "path": "firmware/partitions.bin", "offset": 32768 },
        { "path": "firmware/app.bin", "offset": 65536 },
        { "path": "firmware/littlefs.bin", "offset": 2686976 }
      ]
    }
  ]
}
```

### Supported Flash Modes & Frequencies
- **`mode`**: `"qio"`, `"qout"`, `"dio"`, `"dout"`, `"keep"`
- **`freq`**: `"80m"`, `"40m"`, `"26m"`, `"20m"`, `"keep"`
- **`flashSize`**: `"detect"`, `"256KB"`, `"512KB"`, `"1MB"`, `"2MB"`, `"4MB"`, `"8MB"`, `"16MB"`
- **`compress`**: `true` (hardware flash compression enabled)

---

## 📟 Built-In Web Serial Monitor

Users can open the serial monitor directly from the top header terminal button `>_` or via the **[⚡ Open Serial Monitor]** action on the flash completion screen.

### Monitor Highlights:
- **Instant Baud Switching**: 9600, 19200, 38400, 57600, 74880, 115200 (default), 230400, 460800, 921600.
- **Configurable Line Endings**: `LF`, `CRLF`, `CR`, or None.
- **Microsecond Timestamps**: Toggle line timestamps with the `TS` button.
- **Hardware Reset & Boot Controls**:
  - `RST`: Pulses RTS low to reset the microcontroller.
  - `DTR`: Toggles GPIO0 / DTR for manual bootloader entry.
- **Send & History**: Type commands and press `Enter` to transmit.

---

## 📶 Improv-Wi-Fi Provisioning Protocol

`ESP Flasher Button` includes native support for the open **Improv-Wi-Fi** serial protocol:

1. When flash finishes, users click **[📶 Configure Wi-Fi]**.
2. An inline card prompts for network SSID and Password.
3. The component transmits standard Improv RPC frames (`0x01` Send Wi-Fi Settings) over the active Web Serial connection.
4. If your ESP32 firmware supports Improv (e.g. ESPHome, or using the [Improv-WiFi Arduino library](https://github.com/improv-wifi/sdk-cpp)), it connects and sends back its local IP address.

---

## 🌐 Browser Compatibility

The Web Serial API requires a Chromium-based browser with secure context (`HTTPS` or `http://localhost`):

| Browser | Desktop | Android | iOS / iPadOS |
|---------|:-------:|:-------:|:------------:|
| **Google Chrome** | ✅ Supported | ✅ Supported | ❌ (WebKit restriction) |
| **Microsoft Edge** | ✅ Supported | ✅ Supported | ❌ (WebKit restriction) |
| **Brave** | ✅ Supported | ✅ Supported | ❌ (WebKit restriction) |
| **Opera** | ✅ Supported | ✅ Supported | ❌ (WebKit restriction) |
| **Mozilla Firefox** | ⚠️ [No Web Serial](https://bugzilla.mozilla.org/show_bug.cgi?id=1602447) | ❌ | ❌ |
| **Apple Safari** | ❌ [No Web Serial](https://webkit.org/status/) | ❌ | ❌ |

---

## 👨‍💻 Author & Credits

Developed with precision by **SK Raihan (SKR Electronics Lab)**.

- 📺 **YouTube**: [@skr_electronics_lab](https://youtube.com/@skr_electronics_lab)
- 🐦 **Twitter (X)**: [@skrelectronics](https://twitter.com/skrelectronics)
- 📸 **Instagram**: [@skr_electronics_lab](https://instagram.com/skr_electronics_lab)
- ✉️ **Contact**: `skrelectronicslab@gmail.com`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Feel free to use it in your open-source projects, personal maker builds, or commercial products!
