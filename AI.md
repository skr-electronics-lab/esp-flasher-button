You are helping a user integrate, deploy, or troubleshoot **ESP Flasher Button** — an embeddable web component that lets users flash ESP32/ESP8266 firmware directly from the browser using the Web Serial API.

## What it does
- Renders a `<esp-flasher-button>` (or `<esp-flash-button>`) custom element on any HTML page
- Supports direct GitHub Releases flashing via `github="owner/repo"` (auto-discovering latest releases and `.bin` assets)
- On click, opens a modal that fetches a firmware manifest JSON from a URL or GitHub
- Lets the user select a firmware build, connect an ESP device via USB serial, and flash it
- Shows real-time progress with MD5 verification after write
- Includes a built-in serial monitor for debugging connected devices
- Includes Improv-Wi-Fi provisioning over USB serial
- Smart Baud fallback on noisy cable timeouts

## Key architecture
- **Single-file JS component**: `esp-flasher-button.js` / `esp-flash-button.js` (IIFE)
- **No dependencies** beyond esptool-js (loaded dynamically from unpkg CDN)
- **Shadow DOM** for the trigger button only; the modal and serial monitor are injected into `document.body`
- **CSS variables** for theming — dark theme by default, light theme override via `:root[data-theme="light"]`
- **Hosted** on GitHub Pages at `https://skr-electronics-lab.github.io/esp-flasher-button/`
- **Flash settings are manifest-driven** — flash mode (`qio`/`dio`/...), frequency, size, baud, erase and compression are resolved per-build from `flashSettings` instead of being hardcoded to QIO fast-flashing

## Attributes
| Attribute | Default | Description |
|-----------|---------|-------------|
| `manifest` | — | URL to firmware manifest JSON (required unless `github` is specified) |
| `github` | — | GitHub repository (e.g. `"owner/repo"`). Automatically resolves the latest release, downloads `manifest.json` or synthesizes build entries from attached `.bin` files |
| `label` | "Install Firmware" | Button text |
| `size` | "14.5" | Button font size & overall scale: any number (e.g. `12`, `14`, `16`, `18`, `20`, `22`, `24`, `28`, `32`) or presets (`sm`, `md`, `lg`, `xl`) |
| `width` | auto | Explicit button width (e.g. `"240px"`, `"100%"`, `"320"`) |
| `height` | auto | Explicit button height (e.g. `"44px"`, `"48"`) |
| `radius` | theme default | Custom corner radius (e.g. `"6"`, `"12"`, `"pill"`, `"0"`) |
| `full-width` / `block` | off | Stretches button across 100% of parent width |
| `erase-first` | off | Erase all flash before writing |
| `baud` | 460800 | Flash baud rate |

## Advanced Features
- **GitHub Releases Auto-Resolution**: Use `<esp-flash-button github="owner/repo">` to automatically query GitHub API, fetch the latest tag/release, and flash binaries without hosting a manual `manifest.json`.
- **Post-Flash Quick Actions**: 1-click **Open Serial Monitor** (opens Web Serial at 115200 to view boot logs) and **Configure Wi-Fi** (Improv-Wi-Fi protocol over serial).
- **Smart Baud Auto-Recovery**: If flashing at high speeds (921600 or 460800 baud) fails due to unshielded cables or noise, the flasher provides a 1-click retry button at the safe 115200 speed.

## Theme reference
- **red**: Bold filled pill shape, red gradient
- **dark**: Rectangular with heavy border, dark gradient fill
- **green**: Rounded with green glow border
- **light**: Compact blue gradient, lighter font weight
- **ghost**: Dashed outline, transparent background
- **minimal**: Small underlined text, no border/fill

## Manifest JSON format
```json
{
  "name": "My Firmware",
  "description": "Optional description",
  "version": "1.0.0",
  "flashSettings": {
    "mode": "dio",
    "freq": "40m",
    "baud": 460800,
    "compress": true
  },
  "builds": [
    {
      "chip": "esp32",
      "flashSize": "4MB",
      "firmware": "https://example.com/firmware.bin",
      "address": "0x0"
    }
  ]
}
```

## Flash settings (manifest-driven, configurable)
The component no longer hardcodes flash mode. Firmware authors decide exactly how their firmware is written by adding a `flashSettings` object to the manifest root (applies to all builds) and/or to an individual build (overrides the root). Both nested `flashSettings` and flat legacy keys are accepted.

| Key | Values | Default | Purpose |
|-----|--------|---------|---------|
| `mode` | `keep`, `qio`, `qout`, `dio`, `dout` | `keep` | SPI flash mode. `qio`/`qout` are the fastest; `dio`/`dout` are needed for some modules/boards with limited wiring or older flash chips. |
| `freq` | `keep`, `80m`, `40m`, `26m`, `20m` | `keep` | Flash clock frequency. Lower it (e.g. `26m`) if flashing an old / marginal flash chip. |
| `flashSize` | `detect`, `keep`, `256KB`, `512KB`, `1MB`, `2MB`, `4MB`, `8MB`, `16MB` | `detect` | Override the auto-detected flash size (e.g. force `"1MB"`). |
| `baud` | positive integer | component `baud` attr (460800) | Serial baud for connect + write. Capped at 115200 for ESP8266/ESP8285 to avoid brownout. |
| `erase` | `true` / `false` | manifest/attr/default | Force or default the erase toggle in the UI. When omitted, the user keeps control. |
| `compress` | `true` / `false` | `true` | Hardware compression during transfer. |

Aliases (also accepted, ESP Web Tools style): `flashMode`/`flash_mode`, `flashFreq`/`flash_frequency`, `flashSize`/`flash_size`, `eraseAll`.

Precedence (most specific wins): user UI selection > build.flashSettings > manifest.flashSettings > component attributes (`baud`, `erase-first`) > component defaults.

### Examples
```json
{
  "flashSettings": { "mode": "dio", "freq": "40m" },
  "builds": [
    {
      "chipFamily": "ESP32-S3",
      "flashSettings": { "mode": "qio", "freq": "80m", "baud": 921600 },
      "parts": [ { "path": "firmware.bin", "offset": 0 } ]
    },
    {
      "chipFamily": "ESP8266",
      "flashSettings": { "freq": "26m", "baud": 115200 },
      "parts": [ { "path": "firmware-8266.bin", "offset": 0 } ]
    }
  ]
}
```
- A build that does not declare `mode`/`freq` inherits the root values; a build declaring only `mode` keeps the root `freq`.
- Invalid values silently fall back to the safe default (`mode`→`keep`, `freq`→`keep`, `flashSize`→`detect`).
- The exact resolved settings are shown to the user as a "Flash settings" strip in the confirm dialog, where users can also switch their preferred baud rate.
- Multi-variant firmware: If a manifest declares multiple builds, users see an interactive target variant selector grid.
- Safe Mode Retry: If a flash fails, a one-click "Safe 115.2k Retry" button recovers without manual re-configuration.

## Serial monitor
- Opens from the success panel after a successful flash or from the confirmation step
- Shows real-time RX/TX output in a modal overlay with auto-scroll lock
- Supports baud rate selection (including `74880` for ESP Boot ROM), line timestamps (`TS`), DTR/RTS signals, line ending config
- Uses the same Web Serial port as the flash session (with clean disconnect/reconnect)

## Deployment (GitHub Pages)
- Hosted directly from the `main` branch of `https://github.com/skr-electronics-lab/esp-flasher-button`
- Live site & demo: `https://skr-electronics-lab.github.io/esp-flasher-button/`
- Component script: `https://skr-electronics-lab.github.io/esp-flasher-button/esp-flasher-button.js`

## Common issues
1. **Serial monitor shows no CSS / only text**: Ensure the style element's CSS variables are on `:root` or the overlay elements. The `@import` for Google Fonts must be the very first rule in the `<style>` element.
2. **Cancel button doesn't close**: The `_closeModal()` function must set `_abortFlash = true` and `_isFlashing = false` before cleanup.
3. **Buttons all look the same**: The shadow DOM CSS (SHADOW_CSS constant) defines per-theme classes (`.btn-red`, `.btn-dark`, etc.). If the `theme` attribute is not being read, check that `observedAttributes` includes `'theme'` and that `_theme` getter correctly calls `getAttribute('theme')`.
4. **CORS errors loading manifest**: The manifest server must send `Access-Control-Allow-Origin: *` headers.
5. **Web Serial not detected**: User must use Chrome or Edge 89+ on desktop with HTTPS.
6. **Firmware flashes but device won't boot**: The bootloader header was written with a flash mode/freq the chip can't run (e.g. QIO on a DIO-only board). Set `flashSettings.mode`/`freq` in the manifest (e.g. `"dio"`, `"40m"`) instead of relying on `keep`.
7. **Flashing a build that overrides baud**: When a build's `flashSettings.baud` differs from the chip-detection baud, the component auto-reconnects at the new baud before writing. ESP8266/ESP8285 are always capped to 115200.

## Hosting
- Host `esp-flash-button.js` on any static server or CDN
- Include with `<script type="module" src="https://your-cdn.com/esp-flash-button.js"></script>`
- Add `<esp-flash-button manifest="https://your-site.com/manifest.json"></esp-flash-button>` wherever you want the button
