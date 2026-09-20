/**
 * ESP Flash Button — by SKR Electronics Lab
 * A superior embeddable ESP flashing web component powered by esptool-js
 * Hosted at: https://esp-flash-button.pages.dev
 *
 * Usage:
 *   <script type="module" src="https://esp-flash-button.pages.dev/esp-flash-button.js"></script>
 *   <esp-flash-button manifest="https://yoursite.com/firmware/manifest.json"></esp-flash-button>
 *
 * Attributes:
 *   manifest      — URL to firmware manifest JSON (required)
 *   label         — Button label text (default: "Install Firmware")
 *   erase-first   — Erase flash before writing (default: off)
 *   baud          — Flash baud rate (default: 460800)
 *   theme         — Button theme: "red" | "dark" | "green" | "light" | "ghost" | "minimal" (default: "red")
 *
 * Manifest flash settings (per-firmware control over how flashing happens):
 *   Both a nested "flashSettings" object and flat keys are supported, on the
 *   manifest root (applies to all builds) and on each build (overrides root).
 *
 *   flashSettings keys:
 *     mode       — "keep" (default) | "qio" | "qout" | "dio" | "dout"
 *     freq       — "keep" (default) | "80m" | "40m" | "26m" | "20m"
 *     flashSize  — "detect" (default) | "256KB" | "512KB" | "1MB" | "2MB" | "4MB" | "8MB" | "16MB" | "keep"
 *     baud       — optional serial baud override for this firmware
 *     erase      — true | false | (omit) — force / default the erase toggle
 *     compress   — true (default) | false — hardware compression during write
 *
 *   Precedence (most specific wins):
 *     build.flashSettings > manifest.flashSettings > component attributes > defaults
 *
 * Powered by esptool-js (Espressif). No affiliation with or credit to ESP Web Tools.
 */

(function () {
  'use strict';

  // ── Constants ───────────────────────────────────────────────────
  const ESPTOOL_URL   = 'https://unpkg.com/esptool-js@0.4.6/bundle.js';
  const COMPONENT_TAG = 'esp-flash-button';
  const CREDIT_URL    = 'https://esp-flash-button.pages.dev';

  // ── Manifest flash settings: allowed values & canonical keys ───
  const FLASH_MODE_VALUES = ['keep', 'qio', 'qout', 'dio', 'dout'];
  const FLASH_FREQ_VALUES = ['keep', '80m', '40m', '26m', '20m'];
  const FLASH_SIZE_VALUES = ['detect', 'keep', '256KB', '512KB', '1MB', '2MB', '4MB', '8MB', '16MB'];
  const FLASH_SETTINGS_KEYS = ['mode', 'freq', 'flashSize', 'baud', 'erase', 'compress'];

  // ── MD5 Implementation (RFC 1321, Paul Johnston / blueimp) ─────
  function safeAdd(x, y) {
    var lsw = (x & 0xffff) + (y & 0xffff);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
  function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
  function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
  function binlMD5(x, len) {
    x[len >> 5] |= 0x80 << (len % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    var olda, oldb, oldc, oldd;
    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (var i = 0; i < x.length; i += 16) {
      olda = a; oldb = b; oldc = c; oldd = d;
      a = md5ff(a, b, c, d, x[i], 7, -680876936); d = md5ff(d, a, b, c, x[i+1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i+2], 17, 606105819); b = md5ff(b, c, d, a, x[i+3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i+4], 7, -176418897); d = md5ff(d, a, b, c, x[i+5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i+6], 17, -1473231341); b = md5ff(b, c, d, a, x[i+7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i+8], 7, 1770035416); d = md5ff(d, a, b, c, x[i+9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i+10], 17, -42063); b = md5ff(b, c, d, a, x[i+11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i+12], 7, 1804603682); d = md5ff(d, a, b, c, x[i+13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i+14], 17, -1502002290); b = md5ff(b, c, d, a, x[i+15], 22, 1236535329);
      a = md5gg(a, b, c, d, x[i+1], 5, -165796510); d = md5gg(d, a, b, c, x[i+6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[i+11], 14, 643717713); b = md5gg(b, c, d, a, x[i], 20, -373897302);
      a = md5gg(a, b, c, d, x[i+5], 5, -701558691); d = md5gg(d, a, b, c, x[i+10], 9, 38016083);
      c = md5gg(c, d, a, b, x[i+15], 14, -660478335); b = md5gg(b, c, d, a, x[i+4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i+9], 5, 568446438); d = md5gg(d, a, b, c, x[i+14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[i+3], 14, -187363961); b = md5gg(b, c, d, a, x[i+8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[i+13], 5, -1444681467); d = md5gg(d, a, b, c, x[i+2], 9, -51403784);
      c = md5gg(c, d, a, b, x[i+7], 14, 1735328473); b = md5gg(b, c, d, a, x[i+12], 20, -1926607734);
      a = md5hh(a, b, c, d, x[i+5], 4, -378558); d = md5hh(d, a, b, c, x[i+8], 11, -2022574463);
      c = md5hh(c, d, a, b, x[i+11], 16, 1839030562); b = md5hh(b, c, d, a, x[i+14], 23, -35309556);
      a = md5hh(a, b, c, d, x[i+1], 4, -1530992060); d = md5hh(d, a, b, c, x[i+4], 11, 1272893353);
      c = md5hh(c, d, a, b, x[i+7], 16, -155497632); b = md5hh(b, c, d, a, x[i+10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[i+13], 4, 681279174); d = md5hh(d, a, b, c, x[i], 11, -358537222);
      c = md5hh(c, d, a, b, x[i+3], 16, -722521979); b = md5hh(b, c, d, a, x[i+6], 23, 76029189);
      a = md5hh(a, b, c, d, x[i+9], 4, -640364487); d = md5hh(d, a, b, c, x[i+12], 11, -421815835);
      c = md5hh(c, d, a, b, x[i+15], 16, 530742520); b = md5hh(b, c, d, a, x[i+2], 23, -995338651);
      a = md5ii(a, b, c, d, x[i], 6, -198630844); d = md5ii(d, a, b, c, x[i+7], 10, 1126891415);
      c = md5ii(c, d, a, b, x[i+14], 15, -1416354905); b = md5ii(b, c, d, a, x[i+5], 21, -57434055);
      a = md5ii(a, b, c, d, x[i+12], 6, 1700485571); d = md5ii(d, a, b, c, x[i+3], 10, -1894986606);
      c = md5ii(c, d, a, b, x[i+10], 15, -1051523); b = md5ii(b, c, d, a, x[i+1], 21, -2054922799);
      a = md5ii(a, b, c, d, x[i+8], 6, 1873313359); d = md5ii(d, a, b, c, x[i+15], 10, -30611744);
      c = md5ii(c, d, a, b, x[i+6], 15, -1560198380); b = md5ii(b, c, d, a, x[i+13], 21, 1309151649);
      a = md5ii(a, b, c, d, x[i+4], 6, -145523070); d = md5ii(d, a, b, c, x[i+11], 10, -1120210379);
      c = md5ii(c, d, a, b, x[i+2], 15, 718787259); b = md5ii(b, c, d, a, x[i+9], 21, -343485551);
      a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd);
    }
    return [a, b, c, d];
  }
  function md5(buf) {
    var data = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer || buf);
    var n = data.length, words = [];
    for (var i = 0; i < n; i += 4) {
      words.push((data[i] | (data[i+1] << 8) | (data[i+2] << 16) | (data[i+3] << 24)) >>> 0);
    }
    var bitLen = n * 8;
    var needLen = (((bitLen + 64) >>> 9) << 4) + 15;
    while (words.length <= needLen) words.push(0);
    words[bitLen >>> 5] = ((words[bitLen >>> 5] >>> 0) | (0x80 << (bitLen % 32))) >>> 0;
    words[(((bitLen + 64) >>> 9) << 4) + 14] = bitLen >>> 0;
    var hash = binlMD5(words, bitLen);
    var hex = '';
    for (i = 0; i < 4; i++) {
      var w = hash[i] >>> 0;
      for (var j = 0; j < 4; j++) {
        hex += ((w >>> (j * 8)) & 0xFF).toString(16).padStart(2, '0');
      }
    }
    return hex;
  }

  // ── esptool-js lazy loader ──────────────────────────────────────
  let _espModule = null;
  async function getEspModule() {
    if (_espModule) return _espModule;
    _espModule = await import(ESPTOOL_URL);
    return _espModule;
  }

  // ── Utility: buf to binary string (for esptool writeFlash) ─────
  function bufStr(buf) {
    const bytes = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer || buf);
    const CHUNK = 8192;
    const parts = [];
    for (let i = 0; i < bytes.length; i += CHUNK) {
      parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
    }
    return parts.join('');
  }

  // ── Flash size helpers ─────────────────────────────────────────
  function kbToFlashSizeStr(kb) {
    if (kb >= 16384) return '16MB';
    if (kb >= 8192)  return '8MB';
    if (kb >= 4096)  return '4MB';
    if (kb >= 2048)  return '2MB';
    return '2MB';
  }

  // ── SVG Icons ──────────────────────────────────────────────────
  const ICONS = {
    bolt:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    chip:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M7 9H5M7 12H5M7 15H5M17 9h2M17 12h2M17 15h2M9 7V5M12 7V5M15 7V5M9 17v2M12 17v2M15 17v2"/></svg>`,
    check:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    close:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>`,
    link:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    copy:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    micro:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>`,
    terminal:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    send:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    trash:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    plug:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 13H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><rect x="6" y="12" width="12" height="6" rx="2"/></svg>`,
    wifi:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    github:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`,
  };

  // ── Shadow DOM button CSS (theme system) ───────────────────────
  const SHADOW_CSS = `
    :host {
      display: inline-block;
      vertical-align: middle;
      font-size: var(--efb-btn-font-size, 14px);
    }
    :host([full-width]), :host([fullwidth]), :host([block]) {
      display: block;
      width: 100%;
    }
    *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Unsupported notice ── */
    .not-supported {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 16px; border-radius: 9px;
      background: rgba(255,165,0,0.12); border: 1px solid rgba(255,165,0,0.35);
      color: #ffaa00; font-size: 13px; font-family: system-ui, sans-serif;
    }
    .not-supported svg { width: 16px; height: 16px; flex-shrink: 0; }

    /* ── Spinner & Ripple ── */
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes ripple { to { transform: scale(4); opacity: 0; } }

    .btn-spinner {
      display: none; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%; animation: spin 0.75s linear infinite;
      flex-shrink: 0;
    }
    .loading .btn-spinner { display: block; }
    .loading .btn-icon { display: none; }
    .btn-ripple {
      position: absolute; border-radius: 50%; background: rgba(255,255,255,0.25);
      transform: scale(0); animation: ripple 0.55s linear; pointer-events: none;
    }

    /* ── Base button structure ── */
    .btn-root {
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; position: relative; overflow: hidden;
      letter-spacing: 0.01em; user-select: none;
      font-size: var(--efb-btn-font-size, 14.5px);
      padding: var(--efb-btn-padding, 12px 26px);
      gap: var(--efb-btn-gap, 9px);
      border-radius: var(--efb-btn-radius, 10px);
      width: var(--efb-btn-width, auto);
      min-height: var(--efb-btn-height, auto);
      box-sizing: border-box;
      line-height: 1.25;
      font-weight: 600;
      transition: transform 0.15s cubic-bezier(0.16,1,0.3,1),
                  box-shadow 0.15s cubic-bezier(0.16,1,0.3,1),
                  background 0.15s, border-color 0.15s;
    }
    .btn-root:active:not(:disabled) { transform: scale(0.98); }
    .btn-root:focus-visible {
      outline: 2px solid var(--efb-accent, #e03030);
      outline-offset: 3px;
    }
    .btn-icon {
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .btn-root svg {
      width: var(--efb-btn-icon-size, 17px);
      height: var(--efb-btn-icon-size, 17px);
      flex-shrink: 0;
      display: block;
      transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    .btn-root:hover:not(:disabled) svg {
      transform: scale(1.08);
    }
    .btn-root .btn-spinner {
      width: var(--efb-btn-icon-size, 16px);
      height: var(--efb-btn-icon-size, 16px);
    }
    .btn-full-width {
      width: 100% !important;
      justify-content: center !important;
    }

    /* ── Legacy size class fallbacks ── */
    .btn-size-sm {
      padding: 8px 16px;
      font-size: 12.5px;
      gap: 7px;
      border-radius: 7px;
    }
    .btn-size-md {
      padding: 13px 28px;
      font-size: 14.5px;
      gap: 9px;
      border-radius: 9px;
    }
    .btn-size-lg {
      padding: 16px 36px;
      font-size: 16px;
      font-weight: 700;
      gap: 11px;
      border-radius: 12px;
      min-height: 52px;
    }
    .btn-size-xl {
      padding: 19px 46px;
      font-size: 18px;
      font-weight: 700;
      gap: 13px;
      border-radius: 14px;
      min-height: 60px;
    }

    /* ── Theme: red (default) — bold filled pill ── */
    .btn-red {
      border-radius: var(--efb-btn-radius-pill, 100px); border: none;
      font-family: 'Inter', system-ui, sans-serif; font-weight: 700;
      color: #fff; background: linear-gradient(135deg, #e03030, #b81f1f);
      box-shadow: 0 4px 16px rgba(224,48,48,0.38), 0 1px 3px rgba(0,0,0,0.4);
    }
    .btn-red:hover:not(:disabled) {
      transform: translateY(-1.5px);
      box-shadow: 0 6px 24px rgba(224,48,48,0.55), 0 2px 6px rgba(0,0,0,0.4);
      background: linear-gradient(135deg, #f03535, #cc2222);
    }

    /* ── Theme: dark — rectangular with heavy border ── */
    .btn-dark {
      border-radius: var(--efb-btn-radius, 8px); border: 2px solid #2a2a2e;
      font-family: 'Inter', system-ui, sans-serif; font-weight: 600;
      color: #e0e0e0; background: linear-gradient(135deg, #1a1a1e, #111114);
      box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4);
    }
    .btn-dark:hover:not(:disabled) {
      transform: translateY(-1.5px); border-color: #5a5a62;
      box-shadow: 0 6px 24px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.4);
      background: linear-gradient(135deg, #222228, #18181c);
    }

    /* ── Theme: green — rounded with glow ── */
    .btn-green {
      border-radius: var(--efb-btn-radius, 12px); border: none;
      font-family: 'Inter', system-ui, sans-serif; font-weight: 600;
      color: #fff; background: linear-gradient(135deg, #1a8c4e, #15703e);
      box-shadow: 0 4px 16px rgba(26,140,78,0.35), 0 0 0 1px rgba(61,214,140,0.2);
    }
    .btn-green:hover:not(:disabled) {
      transform: translateY(-1.5px);
      box-shadow: 0 6px 24px rgba(26,140,78,0.55), 0 0 0 2px rgba(61,214,140,0.25);
      background: linear-gradient(135deg, #1eaa5c, #17864a);
    }

    /* ── Theme: light (blue) — modern vibrant blue gradient ── */
    .btn-light {
      border-radius: var(--efb-btn-radius, 10px); border: 1px solid rgba(59,130,246,0.4);
      font-family: 'Inter', system-ui, sans-serif; font-weight: 600;
      color: #fff; background: linear-gradient(135deg, #2563eb, #1d4ed8);
      box-shadow: 0 4px 16px rgba(37,99,235,0.35), 0 1px 2px rgba(0,0,0,0.08);
    }
    .btn-light:hover:not(:disabled) {
      transform: translateY(-1.5px);
      box-shadow: 0 6px 24px rgba(37,99,235,0.5), 0 2px 5px rgba(0,0,0,0.12);
      background: linear-gradient(135deg, #3b82f6, #1e40af);
    }

    /* ── Theme: ghost — transparent with dashed outline ── */
    .btn-ghost {
      border-radius: var(--efb-btn-radius, 9px); border: 1.5px dashed rgba(224,48,48,0.5);
      font-family: 'Inter', system-ui, sans-serif; font-weight: 600;
      color: #e03030; background: transparent;
    }
    .btn-ghost:hover:not(:disabled) {
      transform: translateY(-1.5px); border-style: solid; border-color: rgba(224,48,48,0.85);
      background: rgba(224,48,48,0.08);
      box-shadow: 0 4px 16px rgba(224,48,48,0.2);
    }
    .btn-ghost .btn-spinner { border-top-color: #e03030; }

    /* ── Theme: minimal — small underlined text ── */
    .btn-minimal {
      padding: 6px 12px !important; border-radius: 4px; border: none;
      font-family: 'Inter', system-ui, sans-serif; font-size: 13px !important; font-weight: 500;
      color: #888; background: transparent;
      text-decoration: underline; text-underline-offset: 3px; text-decoration-color: #333;
    }
    .btn-minimal:hover:not(:disabled) { color: #e03030; background: transparent; text-decoration-color: #e03030; }
    .btn-minimal .btn-spinner { border-top-color: #e03030; width: 11px !important; height: 11px !important; }
    .btn-minimal svg { width: 13px !important; height: 13px !important; }

    /* ── Shared disabled state ── */
    .btn-root:disabled {
      opacity: 0.45; cursor: not-allowed; transform: none !important; box-shadow: none !important;
    }
  `;

  // ── The custom element class ───────────────────────────────────
  class EspFlashButton extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._manifest = null;
      this._selectedBuild = null;
      this._port = null;
      this._transport = null;
      this._ESPLoader = null;
      this._Transport = null;
      this._abortFlash = false;
      this._isFlashing = false;
      this._logLines = [];
      this._chipDetected = null;
      this._macDetected = null;
      this._flashSizeDetected = null;
      this._flashStartTime = null;
      this._flashDuration = null;
      this._slotHandler = null;
      this._overlay = null;
      this._modal = null;
      this._footerBtns = null;
      this._styleEl = null;
      this._defaultBtn = null;
      // Serial monitor state
      this._serialMonitorOpen = false;
      this._serialReader = null;
      this._smReader = null;
      this._serialReading = false;
      this._smShowTimestamp = false;
      this._userBaud = null;
      this._onKeyDown = null;
      this._onSmKeyDown = null;
    }

    static get observedAttributes() {
      return ['manifest', 'github', 'label', 'erase-first', 'baud', 'theme', 'size', 'width', 'height', 'radius', 'full-width', 'fullwidth', 'block'];
    }

    attributeChangedCallback() { if (this.isConnected) this._render(); }
    connectedCallback()       { this._render(); this._setupSlotListener(); }
    disconnectedCallback()    { this._abortFlash = true; this._closeModalNow(); }

    get _manifestUrl() { return this.getAttribute('manifest') || ''; }
    get _githubRepo() {
      const g = (this.getAttribute('github') || '').trim();
      if (g) return g.replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');
      const m = (this.getAttribute('manifest') || '').trim();
      if (m.startsWith('github:')) return m.replace(/^github:/i, '').trim();
      if (m.includes('github.com/') && !m.endsWith('.json')) {
        const parts = m.split('github.com/')[1].split('/');
        if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
      }
      return '';
    }
    get _label()       { return this.getAttribute('label') || 'Install Firmware'; }
    get _eraseFirst()  { return this.hasAttribute('erase-first'); }
    get _baud()        { return parseInt(this.getAttribute('baud') || '460800', 10); }
    get _theme()       {
      const t = this.getAttribute('theme') || 'red';
      return ['red','dark','green','light','ghost','minimal'].includes(t) ? t : 'red';
    }

    _parseButtonSizing() {
      const rawSize = (this.getAttribute('size') || '').trim().toLowerCase();
      const rawWidth = (this.getAttribute('width') || '').trim();
      const rawHeight = (this.getAttribute('height') || '').trim();
      const rawRadius = (this.getAttribute('radius') || '').trim().toLowerCase();
      const isFullWidth = this.hasAttribute('full-width') || this.hasAttribute('fullwidth') || this.hasAttribute('block');

      // Default base font size is 14.5px
      let basePx = 14.5;
      let explicitHeight = null;

      if (rawSize === 'sm') {
        basePx = 12.5;
      } else if (rawSize === 'md' || rawSize === 'default') {
        basePx = 14.5;
      } else if (rawSize === 'lg') {
        basePx = 17;
      } else if (rawSize === 'xl') {
        basePx = 20;
      } else if (rawSize) {
        // Numeric support: any number e.g. "12", "14", "16", "18", "20", "22", "24", "28", "32", "18px", "1.2rem", etc.
        const num = parseFloat(rawSize);
        if (Number.isFinite(num) && num > 0) {
          if (rawSize.endsWith('rem')) {
            basePx = num * 16;
          } else if (rawSize.endsWith('em')) {
            basePx = num * 14.5;
          } else if (num >= 36) {
            // Value like size="44", "48", "56" is target button height
            explicitHeight = `${num}px`;
            basePx = Math.max(12, Math.round(num * 0.32));
          } else {
            basePx = num; // pure number or px font size
          }
        }
      }

      if (rawHeight) {
        explicitHeight = rawHeight.includes('%') || rawHeight.includes('px') || rawHeight.includes('rem') ? rawHeight : `${rawHeight}px`;
      }

      // Clamp to reasonable bounds (10px to 64px)
      basePx = Math.max(10, Math.min(64, basePx));

      const padV = Math.round(basePx * 0.8);
      const padH = Math.round(basePx * 1.9);
      const gap = Math.round(basePx * 0.58);
      const iconSize = Math.round(basePx * 1.14);
      let radius = Math.round(basePx * 0.58);

      if (rawRadius) {
        if (rawRadius === 'pill' || rawRadius === 'full') radius = 9999;
        else if (rawRadius === 'none' || rawRadius === '0') radius = 0;
        else radius = parseFloat(rawRadius) || radius;
      }

      return { basePx, padV, padH, gap, iconSize, radius, isFullWidth, rawWidth, explicitHeight, rawRadius };
    }

    // ── Render shadow DOM (just the trigger button) ──────────────
    _render() {
      const shadow = this._shadow;
      shadow.innerHTML = '';

      const style = document.createElement('style');
      style.textContent = SHADOW_CSS;
      shadow.appendChild(style);

      // Check Web Serial support
      if (!('serial' in navigator)) {
        const msg = document.createElement('span');
        msg.className = 'not-supported';
        msg.innerHTML = `${ICONS.warning} <span>Web Serial not supported — use Chrome or Edge 89+ on desktop</span>`;
        shadow.appendChild(msg);
        return;
      }
      if (!window.isSecureContext) {
        const msg = document.createElement('span');
        msg.className = 'not-supported';
        msg.innerHTML = `${ICONS.warning} <span>HTTPS is required for Web Serial. Serve over https://</span>`;
        shadow.appendChild(msg);
        return;
      }

      // Check if slot content was provided
      const slotEl = this.querySelector('[slot="activate"]');
      if (slotEl) {
        const wrapper = document.createElement('span');
        wrapper.style.cssText = 'display:contents;';
        shadow.appendChild(wrapper);
        const slot = document.createElement('slot');
        slot.name = 'activate';
        wrapper.appendChild(slot);
      } else {
        const { basePx, padV, padH, gap, iconSize, radius, isFullWidth, rawWidth, explicitHeight, rawRadius } = this._parseButtonSizing();

        const btn = document.createElement('button');
        btn.className = `btn-root btn-${this._theme}` +
          (isFullWidth ? ' btn-full-width' : '') +
          (this._isFlashing ? ' loading' : '');
        btn.disabled = this._isFlashing;

        btn.style.setProperty('--efb-btn-font-size', `${basePx}px`);
        btn.style.setProperty('--efb-btn-padding', `${padV}px ${padH}px`);
        btn.style.setProperty('--efb-btn-gap', `${gap}px`);
        btn.style.setProperty('--efb-btn-icon-size', `${iconSize}px`);
        btn.style.setProperty('--efb-btn-radius', `${radius}px`);
        if (rawRadius) {
          btn.style.setProperty('--efb-btn-radius-pill', `${radius}px`);
        }
        if (explicitHeight) {
          btn.style.setProperty('--efb-btn-height', explicitHeight);
        }
        if (rawWidth) {
          btn.style.setProperty('--efb-btn-width', rawWidth.includes('%') || rawWidth.includes('px') || rawWidth.includes('rem') ? rawWidth : `${rawWidth}px`);
        }

        // Apply host dimensions
        this.style.setProperty('--efb-btn-font-size', `${basePx}px`);
        if (isFullWidth) {
          this.style.display = 'block';
          this.style.width = '100%';
        } else if (rawWidth) {
          this.style.width = rawWidth.includes('%') || rawWidth.includes('px') || rawWidth.includes('rem') ? rawWidth : `${rawWidth}px`;
        }

        btn.innerHTML = `
          <span class="btn-icon">${ICONS.bolt}</span>
          <span class="btn-spinner"></span>
          <span class="btn-label">${this._esc(this._label)}</span>
        `;
        btn.addEventListener('click', (e) => {
          const r = document.createElement('span');
          r.className = 'btn-ripple';
          const rect = btn.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
          btn.appendChild(r);
          r.addEventListener('animationend', () => r.remove());
          this._onButtonClick();
        });
        this._defaultBtn = btn;
        shadow.appendChild(btn);
      }
    }

    _setupSlotListener() {
      const slotEl = this.querySelector('[slot="activate"]');
      if (this._slotHandler && slotEl) slotEl.removeEventListener('click', this._slotHandler);
      if (slotEl) {
        this._slotHandler = () => this._onButtonClick();
        slotEl.addEventListener('click', this._slotHandler);
      }
    }

    async _onButtonClick() {
      if (!this._manifestUrl && !this._githubRepo) { alert('ESP Flash Button: no "manifest" or "github" attribute set.'); return; }
      if (this._isFlashing || this._modal) return;
      await this._openModal();
    }

    // ── Open modal ───────────────────────────────────────────────
    async _openModal() {
      if (this._modal) { this._closeModal(); }
      if (this._modal) return;

      if (!this._ESPLoader) {
        try {
          const mod = await getEspModule();
          this._ESPLoader = mod.ESPLoader;
          this._Transport = mod.Transport;
        } catch (e) {
          alert('Failed to load esptool-js: ' + e.message);
          return;
        }
      }

      // Inject global styles
      const styleEl = document.createElement('style');
      styleEl.textContent = this._getModalCSS();
      document.head.appendChild(styleEl);
      this._styleEl = styleEl;

      const overlay = document.createElement('div');
      overlay.className = '__efb-overlay';
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && !this._serialMonitorOpen) this._closeModal();
      });

      const modal = document.createElement('div');
      modal.className = '__efb-modal';
      if (this._theme === 'light') { overlay.dataset.theme = 'light'; modal.dataset.theme = 'light'; }
      this._modal = modal;

      // Header
      const header = document.createElement('div');
      header.className = '__efb-header';
      header.innerHTML = `
        <div class="__efb-hicon">${ICONS.bolt}</div>
        <div class="__efb-htitles">
          <div class="__efb-htitle" id="__efb-htitle">Loading firmware…</div>
          <div class="__efb-hsub" id="__efb-hsub">Connecting to esptool-js</div>
        </div>
        <div class="__efb-hactions">
          <button class="__efb-hbtn __efb-hserial" id="__efb-hserial" title="Open Serial Monitor">${ICONS.terminal}</button>
          <button class="__efb-hclose" id="__efb-hclose" title="Close">${ICONS.close}</button>
        </div>
      `;
      header.querySelector('#__efb-hclose').addEventListener('click', () => this._closeModal());
      const hserial = header.querySelector('#__efb-hserial');
      if (hserial) {
        hserial.addEventListener('click', async () => {
          if (this._transport) {
            await this._transport.disconnect().catch(() => {});
            this._transport = null;
          }
          await this._openSerialMonitor();
        });
      }
      modal.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.className = '__efb-body';
      body.id = '__efb-body';
      modal.appendChild(body);

      // Footer — fixed layout: credit on left, buttons on right
      const footer = document.createElement('div');
      footer.className = '__efb-footer';
      footer.innerHTML = `
        <span class="__efb-credit">Powered by <a href="${CREDIT_URL}" target="_blank" rel="noopener">esp-flash-button</a></span>
        <div id="__efb-fbtnrow" class="__efb-btnrow"></div>
      `;
      this._footerBtns = footer.querySelector('#__efb-fbtnrow');
      modal.appendChild(footer);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      this._overlay = overlay;

      // Add ripple effect to all modal buttons
      modal.addEventListener('click', (e) => {
        const btn = e.target.closest('.__efb-btn');
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = '__efb-btn-ripple';
        ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });

      this._onKeyDown = (e) => {
        if (e.key === 'Escape' && !this._serialMonitorOpen && !this._isFlashing) {
          this._closeModal();
        }
      };
      window.addEventListener('keydown', this._onKeyDown);

      await this._loadManifest();
    }

    // ── Modal CSS (with light/dark theme via CSS vars) ────────────
    _getModalCSS() {
      return `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes __efb_fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes __efb_slideUp { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes __efb_spin    { to{transform:rotate(360deg)} }
        @keyframes __efb_pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes __efb_circle  { to{stroke-dashoffset:0} }
        @keyframes __efb_path    { to{stroke-dashoffset:0} }
        @keyframes __efb_confetti {
          0%{transform:translate(0,0) scale(0.6) rotate(0deg);opacity:1}
          100%{transform:translate(var(--ex),var(--ey)) scale(0) rotate(720deg);opacity:0}
        }

        /* ══════ Dark theme (default) ══════ */
        .__efb-overlay {
          position:fixed; inset:0; z-index:2147483646;
          display:flex; align-items:center; justify-content:center;
          font-family:'Inter',system-ui,sans-serif;
          animation:__efb_fadeIn 0.18s ease;
          padding:16px;
        }
        :root, .__efb-overlay, .__efb-sm-overlay, .__efb-sm-modal, .__efb-modal {
          --efb-overlay: rgba(0,0,0,0.78);
          --efb-modal-bg: #111214;
          --efb-text: #f0f0f0;
          --efb-text2: #888;
          --efb-text3: #484850;
          --efb-text4: #404048;
          --efb-text5: #555;
          --efb-border: #1a1a1e;
          --efb-border2: #222226;
          --efb-border3: #181820;
          --efb-border4: #1c1c22;
          --efb-surface: #14141a;
          --efb-surface2: #18181e;
          --efb-surface3: #1c1c22;
          --efb-surface4: #16161a;
          --efb-surface5: #0e0e12;
          --efb-accent: #e03030;
          --efb-accent-dark: #b81f1f;
          --efb-accent-hover: #ff4a40;
          --efb-accent-dark2: #a01a1a;
          --efb-accent-bg: rgba(224,48,48,.07);
          --efb-accent-border: rgba(224,48,48,.45);
          --efb-accent-shadow: rgba(224,48,48,.3);
          --efb-accent-shadow2: rgba(224,48,48,.4);
          --efb-green: #3dd68c;
          --efb-green-bg: rgba(61,214,140,.1);
          --efb-green-border: rgba(61,214,140,.22);
          --efb-green-glow: rgba(61,214,140,.5);
          --efb-amber: #f59e0b;
          --efb-amber-glow: rgba(245,158,11,.4);
          --efb-error: #e05050;
          --efb-error-border: rgba(224,48,48,.18);
          --efb-error-bg: rgba(224,48,48,.04);
          --efb-ghost-bg: #1c1c22;
          --efb-ghost-border: #282830;
          --efb-ghost-hover-bg: #242430;
          --efb-ghost-hover-text: #bbb;
          --efb-ghost-hover-border: #33333c;
          --efb-ghost-text: #888;
          --efb-ghost-cp-text: #555;
          --efb-ghost-cp-border: #242428;
          --efb-ghost-cp-hover-text: #888;
          --efb-ghost-cp-hover-border: #32323a;
          --efb-ghost-cp-hover-bg: #1a1a1e;
          --efb-log-bg: #0c0c10;
          --efb-log-border: #181820;
          --efb-log-scroll: #222230;
          --efb-pill-bg: #18181e;
          --efb-pill-border: #242430;
          --efb-pill-pl: #404048;
          --efb-pill-pv: #c0c0cc;
          --efb-prog-bg: #0e0e12;
          --efb-prog-border: #181820;
          --efb-prog-txt: #666;
          --efb-prog-track: #181820;
          --efb-prog-fill: linear-gradient(90deg,#e03030,#ff6b6b);
          --efb-prog-fill-done: #3dd68c;
          --efb-success-bg: #0c0c10;
          --efb-success-border: #181820;
          --efb-succ-title: #3dd68c;
          --efb-succ-sub: #484850;
          --efb-succ-meta: #555;
          --efb-succ-meta-span: #7a7a8a;
          --efb-succ-meta-dot: #333;
          --efb-succ-md5-border: #181820;
          --efb-succ-md5-title: #444;
          --efb-succ-md5-file: #555;
          --efb-succ-md5-addr: #444;
          --efb-succ-md5-hash: #3dd68c;
          --efb-scrollbar: #2a2a32;
          --efb-check-bg: #1e1e26;
          --efb-check-border: #2e2e38;
          --efb-checklabel: #888;
          --efb-fwcard-bg: #16161a;
          --efb-fwcard-border: #202024;
          --efb-fwicon-bg: linear-gradient(135deg,#0d1a0d,#122112);
          --efb-fwicon-border: #1a3a1a;
          --efb-fwicon-color: #3dd68c;
          --efb-fwcredit-border: #1a1a1e;
          --efb-fwcredit-text: #2e2e36;
          --efb-fwcredit-link: #363640;
          --efb-fwcredit-hover: #50505e;
          --efb-fwname: #f0f0f0;
          --efb-fwmeta: #484850;
          --efb-errtext: #c08080;
          --efb-errhint-text: #555;
          --efb-errhint-prefix: #883030;
          --efb-vlabel: #404048;
          --efb-vchip-bg: #16161a;
          --efb-vchip-border: #222228;
          --efb-vchip-text: #666;
          --efb-vchip-hover-border: #32323a;
          --efb-vchip-hover-text: #aaa;
          --efb-sm-overlay: rgba(0,0,0,0.82);
          --efb-sm-bg: #0e0e12;
          --efb-sm-border: #1e1e24;
          --efb-sm-shadow: rgba(0,0,0,.9);
          --efb-sm-header-border: #181820;
          --efb-sm-toolbar-border: #141418;
          --efb-sm-label: #404048;
          --efb-sm-select-bg: #16161a;
          --efb-sm-select-border: #222228;
          --efb-sm-select-text: #888;
          --efb-sm-select-hover-border: #2e2e38;
          --efb-sm-select-hover-text: #bbb;
          --efb-sm-input-border: #1e1e26;
          --efb-sm-input-bg: #14141a;
          --efb-sm-input-text: #c0c8d0;
          --efb-sm-input-placeholder: #282838;
          --efb-sm-input-focus-border: #2a2a38;
          --efb-sm-tbtn-bg: #16161a;
          --efb-sm-tbtn-border: #1e1e26;
          --efb-sm-tbtn-text: #555;
          --efb-sm-tbtn-hover-text: #aaa;
          --efb-sm-tbtn-hover-border: #2a2a34;
          --efb-sm-tbtn-hover-bg: #1c1c22;
          --efb-sm-tbtn-clear: #553030;
          --efb-sm-tbtn-clear-border: #1e1616;
          --efb-sm-tbtn-clear-hover: #e05050;
          --efb-sm-tbtn-clear-hover-border: rgba(224,80,80,.3);
          --efb-sm-tbtn-clear-hover-bg: rgba(224,80,80,.06);
          --efb-sm-output-bg: #0c0c10;
          --efb-sm-output-scroll: #1e1e26;
          --efb-sm-line-rx: #c0c8d0;
          --efb-sm-line-tx: #f59e0b;
          --efb-sm-line-sys: #404048;
          --efb-sm-line-err: #e05050;
          --efb-sm-empty: #282830;
          --efb-sm-input-row-bg: #0e0e12;
          --efb-sm-input-row-border: #141418;
          --efb-sm-footer-bg: #0a0a0e;
          --efb-sm-footer-border: #0e0e14;
          --efb-sm-footer-credit: #282830;
          --efb-sm-footer-link: #404048;
          --efb-sm-count: #282830;
          --efb-htitle: #f0f0f0;
          --efb-hsub: #484850;
          --efb-hclose-bg: #1c1c20;
          --efb-hclose-text: #666;
          --efb-hclose-hover-bg: #262630;
          --efb-hclose-hover-text: #bbb;
          --efb-hicon-bg: linear-gradient(135deg,#1a0404,#280808);
          --efb-hicon-border: #3a1010;
          --efb-hicon-color: #e03030;
          --efb-credit-text: #383840;
          --efb-credit-link: #555;
          --efb-credit-hover: #e03030;
          --efb-stext: #888;
          --efb-stext-strong: #d8d8e0;
          --efb-sdot: #2a2a32;
          --efb-sm-hicon-bg: linear-gradient(135deg,#0a0a0e,#141420);
          --efb-sm-hicon-border: #1e1e2e;
          --efb-sm-hicon-color: #3dd68c;
          --efb-sm-htitle: #e0e0e8;
          --efb-sm-hsub: #3dd68c;
          --efb-sm-hclose-bg: #1a1a1e;
          --efb-sm-hclose-text: #555;
          --efb-sm-hclose-hover-bg: #222228;
          --efb-sm-hclose-hover-text: #aaa;
          --efb-sm-footer-credit: #282830;
          --efb-sm-footer-link: #404048;
          --efb-sm-send-bg: linear-gradient(135deg,#e03030,#b81f1f);
          --efb-sm-send-hover-bg: linear-gradient(135deg,#f04040,#c82020);
          --efb-sm-send-text: #fff;
          --efb-sm-dot-bg: #3dd68c;
          --efb-sm-dot-glow: rgba(61,214,140,.6);
          --efb-hserial-bg: rgba(139, 92, 246, 0.14);
          --efb-hserial-border: rgba(139, 92, 246, 0.35);
          --efb-hserial-color: #a78bfa;
          --efb-hserial-hover-bg: rgba(139, 92, 246, 0.25);
          --efb-hserial-hover-border: rgba(139, 92, 246, 0.6);
          --efb-hserial-hover-color: #c4b5fd;
        }

        /* ══════ Light theme overrides ══════ */
        :root[data-theme="light"], .__efb-overlay[data-theme="light"], .__efb-sm-overlay[data-theme="light"], .__efb-modal[data-theme="light"], .__efb-sm-modal[data-theme="light"] {
          --efb-overlay: rgba(0,0,0,0.30);
          --efb-modal-bg: #ffffff;
          --efb-text: #1e293b;
          --efb-text2: #64748b;
          --efb-text3: #94a3b8;
          --efb-text4: #94a3b8;
          --efb-text5: #64748b;
          --efb-border: #e2e8f0;
          --efb-border2: #e2e8f0;
          --efb-border3: #e2e8f0;
          --efb-border4: #e2e8f0;
          --efb-surface: #f8fafc;
          --efb-surface2: #f1f5f9;
          --efb-surface3: #f1f5f9;
          --efb-surface4: #ffffff;
          --efb-surface5: #f8fafc;
          --efb-accent: #3b82f6;
          --efb-accent-dark: #1d4ed8;
          --efb-accent-hover: #2563eb;
          --efb-accent-dark2: #1e40af;
          --efb-accent-bg: rgba(59,130,246,.07);
          --efb-accent-border: rgba(59,130,246,.45);
          --efb-accent-shadow: rgba(59,130,246,.3);
          --efb-accent-shadow2: rgba(59,130,246,.4);
          --efb-green: #16a34a;
          --efb-green-bg: rgba(22,163,74,.08);
          --efb-green-border: rgba(22,163,74,.2);
          --efb-green-glow: rgba(22,163,74,.5);
          --efb-amber: #d97706;
          --efb-amber-glow: rgba(217,119,6,.4);
          --efb-error: #dc2626;
          --efb-error-border: rgba(220,38,38,.18);
          --efb-error-bg: rgba(220,38,38,.04);
          --efb-ghost-bg: #f1f5f9;
          --efb-ghost-border: #e2e8f0;
          --efb-ghost-hover-bg: #e2e8f0;
          --efb-ghost-hover-text: #475569;
          --efb-ghost-hover-border: #cbd5e1;
          --efb-ghost-text: #64748b;
          --efb-ghost-cp-text: #64748b;
          --efb-ghost-cp-border: #e2e8f0;
          --efb-ghost-cp-hover-text: #475569;
          --efb-ghost-cp-hover-border: #cbd5e1;
          --efb-ghost-cp-hover-bg: #f1f5f9;
          --efb-log-bg: #f8fafc;
          --efb-log-border: #e2e8f0;
          --efb-log-scroll: #cbd5e1;
          --efb-pill-bg: #f1f5f9;
          --efb-pill-border: #e2e8f0;
          --efb-pill-pl: #94a3b8;
          --efb-pill-pv: #475569;
          --efb-prog-bg: #f8fafc;
          --efb-prog-border: #e2e8f0;
          --efb-prog-txt: #64748b;
          --efb-prog-track: #e2e8f0;
          --efb-prog-fill: linear-gradient(90deg,#3b82f6,#60a5fa);
          --efb-prog-fill-done: #16a34a;
          --efb-success-bg: #f0fdf4;
          --efb-success-border: #bbf7d0;
          --efb-succ-title: #16a34a;
          --efb-succ-sub: #64748b;
          --efb-succ-meta: #64748b;
          --efb-succ-meta-span: #475569;
          --efb-succ-meta-dot: #cbd5e1;
          --efb-succ-md5-border: #e2e8f0;
          --efb-succ-md5-title: #64748b;
          --efb-succ-md5-file: #64748b;
          --efb-succ-md5-addr: #94a3b8;
          --efb-succ-md5-hash: #16a34a;
          --efb-scrollbar: #cbd5e1;
          --efb-check-bg: #ffffff;
          --efb-check-border: #cbd5e1;
          --efb-checklabel: #64748b;
          --efb-fwcard-bg: #ffffff;
          --efb-fwcard-border: #e2e8f0;
          --efb-fwicon-bg: linear-gradient(135deg,#eff6ff,#dbeafe);
          --efb-fwicon-border: #bfdbfe;
          --efb-fwicon-color: #3b82f6;
          --efb-fwcredit-border: #e2e8f0;
          --efb-fwcredit-text: #94a3b8;
          --efb-fwcredit-link: #94a3b8;
          --efb-fwcredit-hover: #64748b;
          --efb-fwname: #1e293b;
          --efb-fwmeta: #64748b;
          --efb-errtext: #dc2626;
          --efb-errhint-text: #64748b;
          --efb-errhint-prefix: #dc2626;
          --efb-vlabel: #94a3b8;
          --efb-vchip-bg: #ffffff;
          --efb-vchip-border: #e2e8f0;
          --efb-vchip-text: #64748b;
          --efb-vchip-hover-border: #cbd5e1;
          --efb-vchip-hover-text: #475569;
          --efb-sm-overlay: rgba(0,0,0,0.30);
          --efb-sm-bg: #ffffff;
          --efb-sm-border: #e2e8f0;
          --efb-sm-shadow: rgba(0,0,0,0.15);
          --efb-sm-header-border: #e2e8f0;
          --efb-sm-toolbar-border: #e2e8f0;
          --efb-sm-label: #94a3b8;
          --efb-sm-select-bg: #ffffff;
          --efb-sm-select-border: #e2e8f0;
          --efb-sm-select-text: #64748b;
          --efb-sm-select-hover-border: #cbd5e1;
          --efb-sm-select-hover-text: #475569;
          --efb-sm-input-border: #e2e8f0;
          --efb-sm-input-bg: #f8fafc;
          --efb-sm-input-text: #1e293b;
          --efb-sm-input-placeholder: #94a3b8;
          --efb-sm-input-focus-border: #3b82f6;
          --efb-sm-tbtn-bg: #f1f5f9;
          --efb-sm-tbtn-border: #e2e8f0;
          --efb-sm-tbtn-text: #64748b;
          --efb-sm-tbtn-hover-text: #475569;
          --efb-sm-tbtn-hover-border: #cbd5e1;
          --efb-sm-tbtn-hover-bg: #e2e8f0;
          --efb-sm-tbtn-clear: #dc2626;
          --efb-sm-tbtn-clear-border: #fecaca;
          --efb-sm-tbtn-clear-hover: #b91c1c;
          --efb-sm-tbtn-clear-hover-border: rgba(220,38,38,.3);
          --efb-sm-tbtn-clear-hover-bg: rgba(220,38,38,.06);
          --efb-sm-output-bg: #f8fafc;
          --efb-sm-output-scroll: #cbd5e1;
          --efb-sm-line-rx: #1e293b;
          --efb-sm-line-tx: #d97706;
          --efb-sm-line-sys: #94a3b8;
          --efb-sm-line-err: #dc2626;
          --efb-sm-empty: #94a3b8;
          --efb-sm-input-row-bg: #ffffff;
          --efb-sm-input-row-border: #e2e8f0;
          --efb-sm-footer-bg: #f8fafc;
          --efb-sm-footer-border: #e2e8f0;
          --efb-sm-footer-credit: #94a3b8;
          --efb-sm-footer-link: #94a3b8;
          --efb-sm-count: #94a3b8;
          --efb-htitle: #1e293b;
          --efb-hsub: #64748b;
          --efb-hclose-bg: #f1f5f9;
          --efb-hclose-text: #64748b;
          --efb-hclose-hover-bg: #e2e8f0;
          --efb-hclose-hover-text: #475569;
          --efb-hicon-bg: linear-gradient(135deg,#eff6ff,#dbeafe);
          --efb-hicon-border: #bfdbfe;
          --efb-hicon-color: #3b82f6;
          --efb-credit-text: #cbd5e1;
          --efb-credit-link: #94a3b8;
          --efb-credit-hover: #3b82f6;
          --efb-stext: #64748b;
          --efb-stext-strong: #1e293b;
          --efb-sdot: #cbd5e1;
          --efb-sm-hicon-bg: linear-gradient(135deg,#eff6ff,#dbeafe);
          --efb-sm-hicon-border: #bfdbfe;
          --efb-sm-hicon-color: #3b82f6;
          --efb-sm-htitle: #1e293b;
          --efb-sm-hsub: #3b82f6;
          --efb-sm-hclose-bg: #f1f5f9;
          --efb-sm-hclose-text: #64748b;
          --efb-sm-hclose-hover-bg: #e2e8f0;
          --efb-sm-hclose-hover-text: #475569;
          --efb-sm-footer-credit: #94a3b8;
          --efb-sm-footer-link: #94a3b8;
          --efb-sm-send-bg: linear-gradient(135deg,#3b82f6,#1d4ed8);
          --efb-sm-send-hover-bg: linear-gradient(135deg,#2563eb,#1e40af);
          --efb-sm-send-text: #fff;
          --efb-sm-dot-bg: #3b82f6;
          --efb-sm-dot-glow: rgba(59,130,246,.6);
          --efb-hserial-bg: #f3e8ff;
          --efb-hserial-border: #d8b4fe;
          --efb-hserial-color: #7e22ce;
          --efb-hserial-hover-bg: #e9d5ff;
          --efb-hserial-hover-border: #c084fc;
          --efb-hserial-hover-color: #6b21a8;
        }

        /* ══════ Apply variables ══════ */
        .__efb-overlay {
          background: var(--efb-overlay);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .__efb-modal {
          background: var(--efb-modal-bg);
          border: 1px solid var(--efb-border2);
          border-radius: 16px;
          width: 520px;
          max-width: calc(100vw - 24px);
          max-height: min(90vh, 780px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px -12px rgba(0,0,0,0.75), 0 0 0 1px var(--efb-border3);
          animation: __efb_slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .__efb-overlay[data-theme="light"] .__efb-modal {
          box-shadow: 0 20px 48px -12px rgba(15,23,42,0.14), 0 4px 16px -2px rgba(15,23,42,0.06), 0 0 0 1px rgba(226,232,240,0.85);
        }
        .__efb-modal *, .__efb-modal *::before, .__efb-modal *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Header */
        .__efb-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--efb-border);
          flex-shrink: 0;
        }
        .__efb-hicon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--efb-hicon-bg);
          border: 1px solid var(--efb-hicon-border);
          color: var(--efb-hicon-color);
        }
        .__efb-hicon svg { width: 18px; height: 18px; }
        .__efb-htitles { flex: 1; min-width: 0; }
        .__efb-htitle {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--efb-htitle);
          letter-spacing: -0.015em;
          line-height: 1.25;
        }
        .__efb-hsub {
          font-size: 11.5px;
          color: var(--efb-hsub);
          margin-top: 2px;
          font-weight: 400;
        }
        .__efb-hactions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .__efb-hbtn {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
          box-sizing: border-box;
        }
        .__efb-hserial {
          background: var(--efb-hserial-bg);
          color: var(--efb-hserial-color);
          border: 1px solid var(--efb-hserial-border);
        }
        .__efb-hserial:hover {
          background: var(--efb-hserial-hover-bg);
          color: var(--efb-hserial-hover-color);
          border-color: var(--efb-hserial-hover-border);
          transform: translateY(-1px);
        }
        .__efb-hserial:active { transform: translateY(0); }
        .__efb-hserial svg { width: 14px; height: 14px; }
        .__efb-hclose {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          border: none;
          cursor: pointer;
          background: var(--efb-hclose-bg);
          color: var(--efb-hclose-text);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
          box-sizing: border-box;
        }
        .__efb-hclose:hover {
          background: var(--efb-hclose-hover-bg);
          color: var(--efb-hclose-hover-text);
          transform: translateY(-1px);
        }
        .__efb-hclose:active { transform: translateY(0); }
        .__efb-hclose svg { width: 14px; height: 14px; }

        /* Body */
        .__efb-body {
          padding: 14px 18px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scrollbar-width: thin;
          scrollbar-color: var(--efb-scrollbar) transparent;
        }
        .__efb-body::-webkit-scrollbar { width: 4px; }
        .__efb-body::-webkit-scrollbar-thumb { background: var(--efb-scrollbar); border-radius: 3px; }

        /* Footer */
        .__efb-footer {
          padding: 12px 18px;
          border-top: 1px solid var(--efb-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          gap: 12px;
        }
        .__efb-credit {
          font-size: 10.5px;
          color: var(--efb-credit-text);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .__efb-credit a {
          color: var(--efb-credit-link);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }
        .__efb-credit a:hover { color: var(--efb-credit-hover); }

        /* Button row */
        .__efb-btnrow {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* Buttons */
        .__efb-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.01em;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .__efb-btn:active:not(:disabled) { transform: scale(0.98); }
        .__efb-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
        .__efb-btn svg { width: 14px; height: 14px; flex-shrink: 0; }
        .__efb-btn-wrap { position: relative; overflow: hidden; display: inline-flex; }
        .__efb-btn-ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          transform: scale(0);
          animation: __efb_btnRipple 0.5s ease-out;
          pointer-events: none;
        }
        @keyframes __efb_btnRipple { to { transform: scale(4); opacity: 0; } }
        .__efb-btn.primary {
          background: linear-gradient(135deg, var(--efb-accent), var(--efb-accent-dark));
          color: #fff;
          box-shadow: 0 2px 8px var(--efb-accent-shadow);
        }
        .__efb-btn.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--efb-accent-hover), var(--efb-accent-dark2));
          transform: translateY(-1px);
          box-shadow: 0 4px 14px var(--efb-accent-shadow2);
        }
        .__efb-btn.ghost {
          background: var(--efb-ghost-bg);
          color: var(--efb-ghost-text);
          border: 1px solid var(--efb-ghost-border);
        }
        .__efb-btn.ghost:hover:not(:disabled) {
          background: var(--efb-ghost-hover-bg);
          color: var(--efb-ghost-hover-text);
          border-color: var(--efb-ghost-hover-border);
          transform: translateY(-1px);
        }
        .__efb-btn.success-btn {
          background: linear-gradient(135deg, #1a8c4e, #15703e);
          color: #fff;
          box-shadow: 0 2px 8px rgba(26,140,78,0.3);
        }
        .__efb-btn.success-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1eaa5c, #17864a);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(26,140,78,0.4);
        }
        .__efb-btn.change-port-btn {
          background: transparent;
          color: var(--efb-ghost-cp-text);
          border: 1px solid var(--efb-ghost-cp-border);
          font-size: 11px;
          padding: 5px 9px;
          gap: 4px;
        }
        .__efb-btn.change-port-btn:hover:not(:disabled) {
          color: var(--efb-ghost-cp-hover-text);
          border-color: var(--efb-ghost-cp-hover-border);
          background: var(--efb-ghost-cp-hover-bg);
        }
        .__efb-btn.change-port-btn svg { width: 11px; height: 11px; }
        .__efb-btn.serial-btn {
          color: var(--efb-accent);
          border-color: var(--efb-accent-border);
        }
        .__efb-btn.serial-btn:hover {
          color: var(--efb-accent-hover);
          border-color: var(--efb-accent);
          background: var(--efb-accent-bg);
        }
        .__efb-btn.safe-btn {
          background: rgba(245,158,11,0.1);
          color: var(--efb-amber);
          border: 1px solid rgba(245,158,11,0.35);
        }
        .__efb-btn.safe-btn:hover:not(:disabled) {
          background: rgba(245,158,11,0.18);
          border-color: var(--efb-amber);
          color: #fbbf24;
          transform: translateY(-1px);
        }

        .__efb-spinner {
          width: 13px;
          height: 13px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: __efb_spin 0.75s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }
        .__efb-divider { height: 1px; background: var(--efb-border); flex-shrink: 0; }

        /* Firmware card */
        .__efb-fwcard, .__efb-fwcard-wrap {
          background: var(--efb-fwcard-bg);
          border: 1px solid var(--efb-fwcard-border);
          border-radius: 12px;
          padding: 11px 14px;
          display: flex;
          flex-direction: column;
          gap: 0;
          transition: border-color 0.15s;
        }
        .__efb-fwcard-inner { display: flex; align-items: center; gap: 12px; }
        .__efb-fwicon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          flex-shrink: 0;
          background: var(--efb-fwicon-bg);
          border: 1px solid var(--efb-fwicon-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--efb-fwicon-color);
        }
        .__efb-fwicon svg { width: 17px; height: 17px; }
        .__efb-fwinfo { flex: 1; min-width: 0; }
        .__efb-fwname {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--efb-fwname);
          letter-spacing: -0.01em;
        }
        .__efb-fwmeta {
          font-size: 11px;
          color: var(--efb-fwmeta);
          margin-top: 2px;
          line-height: 1.4;
        }
        .__efb-fwbadge {
          font-size: 10px;
          font-weight: 600;
          padding: 2.5px 8.5px;
          border-radius: 12px;
          background: var(--efb-green-bg);
          border: 1px solid var(--efb-green-border);
          color: var(--efb-green);
          letter-spacing: 0.03em;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Variants */
        .__efb-vsection { display: flex; flex-direction: column; gap: 5px; margin-top: 1px; }
        .__efb-vlabel {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--efb-vlabel);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .__efb-vgrid { display: flex; flex-wrap: wrap; gap: 6px; }
        .__efb-vchip {
          padding: 5px 11px;
          border-radius: 7px;
          border: 1px solid var(--efb-vchip-border);
          background: var(--efb-vchip-bg);
          font-size: 11.5px;
          font-weight: 500;
          color: var(--efb-vchip-text);
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .__efb-vchip.selected {
          border-color: var(--efb-accent-border);
          background: var(--efb-accent-bg);
          color: var(--efb-accent);
          font-weight: 600;
        }
        .__efb-vchip.detected {
          border-color: var(--efb-green-border);
          background: var(--efb-green-bg);
          color: var(--efb-green);
        }
        .__efb-vchip:hover:not(.selected) {
          border-color: var(--efb-vchip-hover-border);
          color: var(--efb-vchip-hover-text);
          transform: translateY(-1px);
        }

        /* Hardware options / Baud selection row */
        .__efb-opt-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 10px;
          background: var(--efb-surface);
          border: 1px solid var(--efb-border4);
          box-sizing: border-box;
          width: 100%;
          transition: border-color 0.15s;
        }
        .__efb-opt-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
        }
        .__efb-opt-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--efb-text);
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .__efb-opt-title svg {
          width: 14px;
          height: 14px;
          color: var(--efb-accent);
          flex-shrink: 0;
        }
        .__efb-opt-wrap {
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
        }
        .__efb-opt-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-color: var(--efb-surface2);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%23888888' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 9px center;
          border: 1px solid var(--efb-border2);
          border-radius: 7px;
          color: var(--efb-text);
          font-size: 11.5px;
          font-weight: 500;
          padding: 4px 24px 4px 10px;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          flex-shrink: 0;
          width: auto;
          min-width: 145px;
          box-sizing: border-box;
          line-height: 1.35;
          height: 28px;
        }
        .__efb-opt-select:hover, .__efb-opt-select:focus { border-color: var(--efb-accent-border); }
        .__efb-opt-select option { background: var(--efb-modal-bg); color: var(--efb-text); }
        .__efb-opt-desc {
          font-size: 10.5px;
          color: var(--efb-text2);
          line-height: 1.35;
          margin: 0;
        }

        /* Settings Container */
        .__efb-settings {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        /* Baud rate row in confirm view */
        .__efb-confirm-baudrow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 13px;
          border-radius: 9px;
          background: var(--efb-surface);
          border: 1px solid var(--efb-border4);
          gap: 12px;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .__efb-confirm-baudrow:hover {
          border-color: var(--efb-border2);
        }
        .__efb-baud-lbl-group {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .__efb-baud-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: var(--efb-accent-bg);
          color: var(--efb-accent);
          flex-shrink: 0;
        }
        .__efb-baud-icon svg {
          width: 14px;
          height: 14px;
        }
        .__efb-baud-titles {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .__efb-baud-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--efb-text);
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .__efb-baud-sub {
          font-size: 10px;
          color: var(--efb-text2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .__efb-baud-select-wrap {
          flex-shrink: 0;
        }
        .__efb-confirm-baud-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-color: var(--efb-surface2);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%23888888' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 9px center;
          border: 1px solid var(--efb-border2);
          color: var(--efb-text);
          font-family: inherit;
          font-size: 11.5px;
          font-weight: 600;
          padding: 5px 26px 5px 10px;
          border-radius: 7px;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
          height: 30px;
          box-sizing: border-box;
        }
        .__efb-confirm-baud-select:hover, .__efb-confirm-baud-select:focus {
          border-color: var(--efb-accent);
          color: var(--efb-accent);
        }
        .__efb-confirm-baud-select option {
          background: var(--efb-modal-bg);
          color: var(--efb-text);
          font-family: inherit;
        }

        /* Collapsible details toggle (closed by default) */
        .__efb-details-toggle {
          border-radius: 9px;
          background: var(--efb-surface);
          border: 1px solid var(--efb-border4);
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .__efb-details-toggle:hover {
          border-color: var(--efb-border2);
        }
        .__efb-details-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 12px;
          cursor: pointer;
          user-select: none;
          list-style: none;
          font-size: 11px;
          color: var(--efb-text2);
          gap: 8px;
        }
        .__efb-details-summary::-webkit-details-marker {
          display: none;
        }
        .__efb-details-summary-title {
          font-weight: 600;
          color: var(--efb-text);
          font-size: 11px;
          flex-shrink: 0;
        }
        .__efb-details-summary-hint {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--efb-text3);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          text-align: right;
        }
        .__efb-details-arrow {
          font-size: 11px;
          color: var(--efb-text3);
          transition: transform 0.2s ease;
          display: inline-block;
          flex-shrink: 0;
        }
        .__efb-details-toggle[open] .__efb-details-arrow {
          transform: rotate(180deg);
        }
        .__efb-details-content {
          padding: 8px 12px 10px;
          border-top: 1px solid var(--efb-border);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          background: var(--efb-surface4);
        }
        .__efb-detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .__efb-detail-item .k {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--efb-text3);
          font-weight: 600;
        }
        .__efb-detail-item .v {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--efb-text);
          font-weight: 600;
        }
        .__efb-safe-badge {
          font-size: 8px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          background: var(--efb-amber-glow);
          color: var(--efb-amber);
          margin-left: 2px;
        }

        /* Status row */
        .__efb-srow {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 13px;
          border-radius: 9px;
          background: var(--efb-surface);
          border: 1px solid var(--efb-border4);
        }
        .__efb-sdot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--efb-sdot);
          transition: background 0.3s;
        }
        .__efb-sdot.green { background: var(--efb-green); box-shadow: 0 0 6px var(--efb-green-glow); }
        .__efb-sdot.red   { background: var(--efb-error); box-shadow: 0 0 6px var(--efb-accent-shadow); }
        .__efb-sdot.amber {
          background: var(--efb-amber);
          animation: __efb_pulse 1.2s ease-in-out infinite;
          box-shadow: 0 0 6px var(--efb-amber-glow);
        }
        .__efb-stext { flex: 1; font-size: 12px; color: var(--efb-stext); line-height: 1.4; }
        .__efb-stext strong { color: var(--efb-stext-strong); }

        /* Chip pills */
        .__efb-pills {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.35fr) minmax(0, 0.85fr);
          gap: 7px;
          width: 100%;
        }
        .__efb-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          background: var(--efb-pill-bg);
          border: 1px solid var(--efb-pill-border);
          min-width: 0;
        }
        .__efb-pill .pl {
          color: var(--efb-pill-pl);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.06em;
          flex-shrink: 0;
        }
        .__efb-pill .pv {
          color: var(--efb-pill-pv);
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .__efb-pill.hi .pv { color: var(--efb-green); }

        /* Progress */
        .__efb-prog {
          background: var(--efb-prog-bg);
          border: 1px solid var(--efb-prog-border);
          border-radius: 9px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .__efb-prog-lbl { display: flex; justify-content: space-between; align-items: center; }
        .__efb-prog-txt {
          font-size: 11px;
          color: var(--efb-prog-txt);
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .__efb-prog-pct {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--efb-accent);
          font-family: 'JetBrains Mono', monospace;
        }
        .__efb-prog-track {
          height: 5px;
          border-radius: 100px;
          background: var(--efb-prog-track);
          overflow: hidden;
          position: relative;
        }
        .__efb-prog-fill {
          height: 100%;
          border-radius: 100px;
          width: 0%;
          transition: width 0.25s ease;
          background: var(--efb-prog-fill);
        }
        .__efb-prog-fill.done { background: var(--efb-prog-fill-done); }

        @keyframes __efb_indeterminate {
          0%   { left: -35%; width: 35%; }
          50%  { left: 30%; width: 55%; }
          100% { left: 100%; width: 35%; }
        }
        .__efb-prog.indeterminate .__efb-prog-pct { display: none; }
        .__efb-prog.indeterminate .__efb-prog-fill {
          position: absolute;
          top: 0;
          bottom: 0;
          animation: __efb_indeterminate 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          background: linear-gradient(90deg, transparent, var(--efb-accent), transparent);
          border-radius: 100px;
        }

        /* Log */
        .__efb-log {
          background: var(--efb-log-bg);
          border: 1px solid var(--efb-log-border);
          border-radius: 9px;
          font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
          font-size: 10.5px;
          line-height: 1.6;
          padding: 9px 12px;
          height: 120px;
          max-height: 140px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--efb-log-scroll) transparent;
        }
        .__efb-log::-webkit-scrollbar { width: 4px; }
        .__efb-log::-webkit-scrollbar-thumb { background: var(--efb-log-scroll); border-radius: 2px; }
        .__efb-ll { display: block; }
        .__efb-ll.info    { color: #567090; }
        .__efb-ll.success { color: var(--efb-green); }
        .__efb-ll.warn    { color: var(--efb-amber); }
        .__efb-ll.error   { color: var(--efb-error); }
        .__efb-ll.accent  { color: var(--efb-accent); font-weight: 600; }
        .__efb-ll.dim     { color: #40404a; }
        .__efb-overlay[data-theme="light"] .__efb-ll.dim { color: #94a3b8; }

        /* Success block */
        .__efb-succ {
          background: var(--efb-success-bg);
          border: 1px solid var(--efb-success-border);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .__efb-succ-head { display: flex; align-items: center; gap: 11px; }
        .__efb-checkmark { width: 28px; height: 28px; flex-shrink: 0; }
        .__efb-check-circle {
          fill: none;
          stroke: var(--efb-green);
          stroke-width: 2;
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: __efb_circle 0.5s ease-in-out forwards;
        }
        .__efb-check-path {
          fill: none;
          stroke: var(--efb-green);
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: __efb_path 0.25s 0.5s ease-in-out forwards;
        }
        .__efb-succ-title { font-size: 14px; font-weight: 700; color: var(--efb-succ-title); letter-spacing: -0.01em; }
        .__efb-succ-sub { font-size: 11.5px; color: var(--efb-succ-sub); }
        .__efb-succ-meta { font-size: 11.5px; color: var(--efb-succ-meta); }
        .__efb-succ-meta span { color: var(--efb-succ-meta-span); }
        .__efb-succ-meta span+span::before { content: '\\00b7'; margin: 0 6px; color: var(--efb-succ-meta-dot); }
        .__efb-succ-md5 { padding-top: 10px; border-top: 1px solid var(--efb-succ-md5-border); }
        .__efb-succ-md5-title {
          font-size: 10px;
          font-weight: 600;
          color: var(--efb-succ-md5-title);
          margin-bottom: 5px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .__efb-succ-md5-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10.5px;
          padding: 2.5px 0;
          font-family: 'JetBrains Mono', monospace;
        }
        .__efb-succ-md5-file { color: var(--efb-succ-md5-file); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
        .__efb-succ-md5-addr { color: var(--efb-succ-md5-addr); flex-shrink: 0; }
        .__efb-succ-md5-hash { color: var(--efb-succ-md5-hash); font-size: 9.5px; margin-left: auto; flex-shrink: 0; }

        /* ── Post-Flash Success Actions ── */
        .__efb-succ-actions {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 8px;
          margin-top: 4px;
        }
        .__efb-succ-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
        }
        .__efb-succ-btn svg { width: 14px; height: 14px; flex-shrink: 0; }
        .__efb-succ-btn-serial {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(109, 40, 217, 0.95));
          color: #fff;
          box-shadow: 0 2px 10px rgba(139, 92, 246, 0.25);
        }
        .__efb-succ-btn-serial:hover {
          background: linear-gradient(135deg, #9061f9, #7c3aed);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
        }
        .__efb-succ-btn-wifi {
          background: var(--efb-surface2);
          border: 1px solid var(--efb-border2);
          color: var(--efb-text);
        }
        .__efb-succ-btn-wifi:hover {
          border-color: var(--efb-accent);
          color: var(--efb-accent);
          transform: translateY(-1px);
        }

        /* ── Improv Wi-Fi Provisioning Card ── */
        .__efb-wifi-card {
          background: var(--efb-surface);
          border: 1px solid var(--efb-border4);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .__efb-wifi-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .__efb-wifi-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(34, 211, 238, 0.12);
          border: 1px solid rgba(34, 211, 238, 0.3);
          color: #22d3ee;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .__efb-wifi-icon svg { width: 17px; height: 17px; }
        .__efb-wifi-title { font-size: 13px; font-weight: 700; color: var(--efb-text); }
        .__efb-wifi-sub { font-size: 11px; color: var(--efb-text2); margin-top: 1px; }
        .__efb-wifi-form { display: flex; flex-direction: column; gap: 10px; }
        .__efb-wifi-field { display: flex; flex-direction: column; gap: 4px; }
        .__efb-wifi-label { font-size: 11px; font-weight: 600; color: var(--efb-text2); }
        .__efb-wifi-input {
          background: var(--efb-surface2);
          border: 1px solid var(--efb-border2);
          border-radius: 7px;
          padding: 7px 11px;
          color: var(--efb-text);
          font-family: inherit;
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s;
        }
        .__efb-wifi-input:focus { border-color: var(--efb-accent); }
        .__efb-wifi-status {
          font-size: 11.5px;
          padding: 7px 11px;
          border-radius: 7px;
          line-height: 1.4;
        }
        .__efb-wifi-status.info {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.25);
          color: #60a5fa;
        }
        .__efb-wifi-status.ok {
          background: var(--efb-green-bg);
          border: 1px solid var(--efb-green-border);
          color: var(--efb-green);
        }
        .__efb-wifi-status.err {
          background: var(--efb-error-bg);
          border: 1px solid var(--efb-error-border);
          color: var(--efb-error);
        }
        .__efb-wifi-btns {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 4px;
        }

        /* ── Smart Baud Fallback Box ── */
        .__efb-baud-fallback-box {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          padding: 13px 15px;
        }
        .__efb-baud-fallback-title {
          font-size: 13px;
          font-weight: 700;
          color: #fbbf24;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .__efb-baud-fallback-title svg { width: 15px; height: 15px; }
        .__efb-baud-fallback-desc {
          font-size: 11.5px;
          color: var(--efb-text2);
          margin-top: 6px;
          line-height: 1.45;
        }

        /* ── GitHub release badge ── */
        .__efb-ghbadge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: var(--efb-text);
          font-size: 10.5px;
          text-decoration: none;
        }
        .__efb-ghbadge svg { width: 12px; height: 12px; }

        /* ── Confetti celebration ── */
        .__efb-confetti-container {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          pointer-events: none;
          overflow: hidden;
        }
        .__efb-confetti {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: __efb_confetti 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        /* Error box */
        .__efb-errbox {
          background: var(--efb-error-bg);
          border: 1px solid var(--efb-error-border);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 12px;
          color: var(--efb-errtext);
          line-height: 1.6;
        }
        .__efb-errtitle { font-weight: 700; color: var(--efb-error); font-size: 13.5px; margin-bottom: 6px; }
        .__efb-errhints { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--efb-error-border); }
        .__efb-errhint { color: var(--efb-errhint-text); margin-top: 5px; font-size: 11.5px; }
        .__efb-errhint::before { content: '\\2192  '; color: var(--efb-errhint-prefix); }

        /* Checkbox row */
        .__efb-checkrow {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 13px;
          border-radius: 9px;
          background: var(--efb-surface);
          border: 1px solid var(--efb-border4);
          cursor: pointer;
          user-select: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .__efb-checkrow:hover { background: var(--efb-surface2); border-color: var(--efb-border2); }
        .__efb-checkbox {
          width: 15px;
          height: 15px;
          border-radius: 4px;
          flex-shrink: 0;
          background: var(--efb-check-bg);
          border: 1.5px solid var(--efb-check-border);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .__efb-checkbox.checked {
          background: linear-gradient(135deg, var(--efb-accent), var(--efb-accent-dark));
          border-color: var(--efb-accent);
        }
        .__efb-checkbox svg { width: 10px; height: 10px; color: #fff; display: none; }
        .__efb-checkbox.checked svg { display: block; }
        .__efb-checklabel { font-size: 12px; color: var(--efb-checklabel); font-weight: 500; }

        /* Responsive Mobile Layout */
        @media (max-width: 480px) {
          .__efb-overlay { padding: 8px; }
          .__efb-modal {
            width: 100%;
            max-width: 100%;
            max-height: 92vh;
            border-radius: 14px;
          }
          .__efb-header { padding: 11px 14px; gap: 10px; }
          .__efb-body { padding: 12px 14px; gap: 8px; }
          .__efb-details-content { grid-template-columns: 1fr 1fr; }
          .__efb-confirm-baudrow { flex-direction: column; align-items: stretch; gap: 8px; }
          .__efb-confirm-baud-select { width: 100%; }
          .__efb-succ-actions { grid-template-columns: 1fr; }
          .__efb-footer {
            padding: 10px 14px;
            flex-direction: column-reverse;
            gap: 10px;
            align-items: stretch;
          }
          .__efb-credit { text-align: center; }
          .__efb-btnrow { width: 100%; justify-content: stretch; gap: 6px; }
          .__efb-btnrow .__efb-btn { flex: 1; justify-content: center; }
          .__efb-log { height: 95px; }
        }


        /* ── Serial Monitor Modal ── */
        .__efb-sm-overlay {
          position:fixed; inset:0; z-index:2147483647;
          background:var(--efb-sm-overlay); backdrop-filter:blur(8px);
          display:flex; align-items:center; justify-content:center;
          font-family:'Inter',system-ui,sans-serif;
          animation:__efb_fadeIn 0.18s ease;
          padding:16px;
        }
        .__efb-sm-modal {
          background:var(--efb-sm-bg); border:1px solid var(--efb-sm-border); border-radius:16px;
          width:580px; max-width:calc(100vw - 24px); height:540px; max-height:90vh;
          display:flex; flex-direction:column; overflow:hidden;
          box-shadow:0 32px 80px var(--efb-sm-shadow);
          animation:__efb_slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .__efb-sm-modal *,.__efb-sm-modal *::before,.__efb-sm-modal *::after {
          box-sizing:border-box; margin:0; padding:0;
        }
        .__efb-sm-header {
          display:flex; align-items:center; gap:12px; padding:14px 18px;
          border-bottom:1px solid var(--efb-sm-header-border); flex-shrink:0;
        }
        .__efb-sm-hicon {
          width:34px; height:34px; border-radius:8px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:var(--efb-sm-hicon-bg); border:1px solid var(--efb-sm-hicon-border); color:var(--efb-sm-hicon-color);
        }
        .__efb-sm-hicon svg { width:16px; height:16px; }
        .__efb-sm-htitles { flex:1; min-width:0; }
        .__efb-sm-htitle { font-size:14px; font-weight:700; color:var(--efb-sm-htitle); letter-spacing:-.01em; }
        .__efb-sm-hsub { font-size:11px; color:var(--efb-sm-hsub); margin-top:1px; display:flex; align-items:center; gap:5px; }
        .__efb-sm-dot {
          width:6px; height:6px; border-radius:50%; background:var(--efb-sm-dot-bg);
          box-shadow:0 0 5px var(--efb-sm-dot-glow); animation:__efb_pulse 2s ease-in-out infinite;
          display:inline-block; flex-shrink:0;
        }
        .__efb-sm-hclose {
          width:28px; height:28px; border-radius:7px; border:none; cursor:pointer;
          background:var(--efb-sm-hclose-bg); color:var(--efb-sm-hclose-text); display:flex; align-items:center; justify-content:center;
          transition:background .15s,color .15s; flex-shrink:0;
        }
        .__efb-sm-hclose:hover { background:var(--efb-sm-hclose-hover-bg); color:var(--efb-sm-hclose-hover-text); }
        .__efb-sm-hclose svg { width:14px; height:14px; }
        .__efb-sm-toolbar {
          display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 16px;
          border-bottom:1px solid var(--efb-sm-toolbar-border); flex-shrink:0; flex-wrap:nowrap;
        }
        .__efb-sm-toolbar-left { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .__efb-sm-toolbar-right { display:flex; align-items:center; gap:5px; flex-shrink:0; }
        .__efb-sm-label { font-size:9.5px; font-weight:700; color:var(--efb-sm-label); text-transform:uppercase; letter-spacing:.08em; white-space:nowrap; }
        .__efb-sm-select {
          background:var(--efb-sm-select-bg); border:1px solid var(--efb-sm-select-border); border-radius:6px;
          color:var(--efb-sm-select-text); font-size:11px; padding:4px 6px; font-family:'Inter',system-ui,sans-serif;
          cursor:pointer; outline:none; transition:border-color .15s; max-width:105px;
        }
        .__efb-sm-select:hover,.__efb-sm-select:focus { border-color:var(--efb-sm-select-hover-border); color:var(--efb-sm-select-hover-text); }
        .__efb-sm-tbtn {
          display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:6px;
          border:1px solid var(--efb-sm-tbtn-border); background:var(--efb-sm-tbtn-bg); color:var(--efb-sm-tbtn-text); font-size:11px; font-weight:500;
          cursor:pointer; font-family:inherit; transition:all .15s; white-space:nowrap;
        }
        .__efb-sm-tbtn svg { width:12px; height:12px; }
        .__efb-sm-tbtn:hover { color:var(--efb-sm-tbtn-hover-text); border-color:var(--efb-sm-tbtn-hover-border); background:var(--efb-sm-tbtn-hover-bg); }
        .__efb-sm-tbtn.active { color:var(--efb-green); border-color:var(--efb-green-border); background:var(--efb-green-bg); }
        .__efb-sm-tbtn-clear { color:var(--efb-sm-tbtn-clear); border-color:var(--efb-sm-tbtn-clear-border); }
        .__efb-sm-tbtn-clear:hover { color:var(--efb-sm-tbtn-clear-hover); border-color:var(--efb-sm-tbtn-clear-hover-border); background:var(--efb-sm-tbtn-clear-hover-bg); }

        @media (max-width: 520px) {
          .__efb-sm-modal {
            width: 100%;
            height: 92vh;
            border-radius: 14px;
          }
          .__efb-sm-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            padding: 8px 12px;
          }
          .__efb-sm-toolbar-left {
            display: flex;
            justify-content: space-between;
            width: 100%;
          }
          .__efb-sm-toolbar-left .__efb-sm-select {
            flex: 1;
            max-width: none;
          }
          .__efb-sm-toolbar-right {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            width: 100%;
            gap: 6px;
          }
          .__efb-sm-toolbar-right .__efb-sm-tbtn {
            justify-content: center;
          }
        }
        .__efb-sm-output {
          flex:1; overflow-y:auto; padding:12px 16px;
          font-family:'JetBrains Mono','Fira Code',Consolas,monospace; font-size:11.5px; line-height:1.7;
          scrollbar-width:thin; scrollbar-color:var(--efb-sm-output-scroll) transparent;
          background:var(--efb-sm-output-bg);
        }
        .__efb-sm-output::-webkit-scrollbar { width:4px; }
        .__efb-sm-output::-webkit-scrollbar-thumb { background:var(--efb-sm-output-scroll); border-radius:2px; }
        .__efb-sm-line { display:block; word-break:break-all; }
        .__efb-sm-line.rx { color:var(--efb-sm-line-rx); }
        .__efb-sm-line.tx { color:var(--efb-sm-line-tx); }
        .__efb-sm-line.sys { color:var(--efb-sm-line-sys); font-style:italic; }
        .__efb-sm-line.err { color:var(--efb-sm-line-err); }
        .__efb-sm-empty {
          color:var(--efb-sm-empty); font-size:12px; font-style:italic; padding-top:8px;
        }
        .__efb-sm-input-row {
          display:flex; gap:8px; padding:12px 16px;
          border-top:1px solid var(--efb-sm-input-row-border); flex-shrink:0; align-items:center; background:var(--efb-sm-input-row-bg);
        }
        .__efb-sm-input {
          flex:1; background:var(--efb-sm-input-bg); border:1px solid var(--efb-sm-input-border); border-radius:8px;
          color:var(--efb-sm-input-text); font-family:'JetBrains Mono',monospace; font-size:12px;
          padding:8px 12px; outline:none; transition:border-color .15s;
        }
        .__efb-sm-input::placeholder { color:var(--efb-sm-input-placeholder); }
        .__efb-sm-input:focus { border-color:var(--efb-sm-input-focus-border); }
        .__efb-sm-send {
          display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px;
          border:none; cursor:pointer; font-size:12px; font-weight:600; color:var(--efb-sm-send-text);
          background:var(--efb-sm-send-bg); transition:all .15s; flex-shrink:0;
          font-family:'Inter',system-ui,sans-serif;
        }
        .__efb-sm-send svg { width:13px; height:13px; }
        .__efb-sm-send:hover { background:var(--efb-sm-send-hover-bg); transform:translateY(-1px); }
        .__efb-sm-send:active { transform:translateY(0); }
        .__efb-sm-footer {
          display:flex; align-items:center; justify-content:space-between; padding:8px 16px;
          border-top:1px solid var(--efb-sm-footer-border); flex-shrink:0; background:var(--efb-sm-footer-bg);
        }
        .__efb-sm-footer-credit { font-size:9px; color:var(--efb-sm-footer-credit); }
        .__efb-sm-footer-credit a { color:var(--efb-sm-footer-link); text-decoration:none; }
        .__efb-sm-footer-credit a:hover { color:var(--efb-credit-hover); }
        .__efb-sm-count { font-size:10px; color:var(--efb-sm-count); font-family:'JetBrains Mono',monospace; }
      `;
    }

    async _closeModal() {
      this._abortFlash = true;
      this._isFlashing = false;
      await this._closeModalNow();
    }

    async _closeModalNow() {
      if (this._onKeyDown) {
        window.removeEventListener('keydown', this._onKeyDown);
        this._onKeyDown = null;
      }
      await this._stopSerialMonitor();
      await this._cleanupNow();
      if (this._overlay) { this._overlay.remove(); this._overlay = null; }
      if (this._styleEl) { this._styleEl.remove(); this._styleEl = null; }
      this._modal = null;
      if (this._defaultBtn) this._defaultBtn.classList.remove('loading');
    }

    // ── Log helper ───────────────────────────────────────────────
    _log(type, text) {
      this._logLines.push({ type, text });
      const logEl = this._modal?.querySelector('#__efb-log');
      if (logEl) {
        const span = document.createElement('span');
        span.className = `__efb-ll ${type}`;
        span.textContent = text + '\n';
        logEl.appendChild(span);
        logEl.scrollTop = logEl.scrollHeight;
      }
    }

    _setTitle(title, sub) {
      const t = this._modal?.querySelector('#__efb-htitle');
      const s = this._modal?.querySelector('#__efb-hsub');
      if (t) t.textContent = title;
      if (s) s.textContent = sub || '';
    }

    _setBody(html) {
      const body = this._modal?.querySelector('#__efb-body');
      if (body) body.innerHTML = html;
    }

    _setFooterBtns(html) {
      if (this._footerBtns) this._footerBtns.innerHTML = html;
    }

    _setProgress(pct, label) {
      const progEl = this._modal?.querySelector('#__efb-prog');
      const fill   = this._modal?.querySelector('#__efb-pfill');
      const txt    = this._modal?.querySelector('#__efb-ptxt');
      const pctEl  = this._modal?.querySelector('#__efb-ppct');

      if (txt && label) txt.textContent = label;

      if (pct === null || pct === undefined || pct < 0) {
        progEl?.classList.add('indeterminate');
        if (pctEl) pctEl.textContent = '';
        if (fill) fill.classList.remove('done');
      } else {
        progEl?.classList.remove('indeterminate');
        const clamped = Math.max(0, Math.min(100, Math.round(pct)));
        if (fill) {
          fill.style.width = clamped + '%';
          clamped >= 100 ? fill.classList.add('done') : fill.classList.remove('done');
        }
        if (pctEl) pctEl.textContent = clamped + '%';
      }
    }

    // ── Load manifest ────────────────────────────────────────────
    async _loadManifest() {
      // Direct GitHub repository integration
      if (this._githubRepo) {
        this._setTitle('GitHub Release…', `Fetching latest release from ${this._githubRepo}`);
        this._setBody(`
          <div class="__efb-srow">
            <div class="__efb-sdot amber"></div>
            <div class="__efb-stext">Querying GitHub Releases for <strong>${this._esc(this._githubRepo)}</strong>…</div>
          </div>
        `);
        this._setFooterBtns('');

        try {
          this._manifest = await this._resolveGitHubRelease(this._githubRepo);
          this._validateManifest();
          this._showReadyPanel();
          return;
        } catch (e) {
          this._showError('GitHub Release Resolution Failed', e.message, [
            `Make sure https://github.com/${this._githubRepo} has at least one published Release.`,
            'Ensure release assets include .bin firmware files or a manifest.json.',
            'Check GitHub API rate limits if requesting frequently.',
          ]);
          return;
        }
      }

      this._setTitle('Loading…', 'Fetching firmware manifest');
      this._setBody(`
        <div class="__efb-srow">
          <div class="__efb-sdot amber"></div>
          <div class="__efb-stext">Fetching firmware manifest…</div>
        </div>
      `);
      this._setFooterBtns('');

      try {
        const res = await fetch(this._manifestUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status} — could not fetch manifest`);
        this._manifest = await res.json();
        this._validateManifest();
        this._showReadyPanel();
      } catch (e) {
        this._showError('Failed to load firmware manifest', e.message, [
          'Check the manifest URL is correct and publicly accessible.',
          'Make sure your server sends CORS headers (Access-Control-Allow-Origin: *).',
          'Ensure the manifest JSON is valid.',
        ]);
      }
    }

    async _resolveGitHubRelease(repo) {
      const url = `https://api.github.com/repos/${repo}/releases/latest`;
      const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
      if (!res.ok) {
        if (res.status === 404) throw new Error(`No releases found for ${repo}. Check repository name or publish a release.`);
        if (res.status === 403) throw new Error('GitHub API rate limit reached. Please try again later.');
        throw new Error(`GitHub API error HTTP ${res.status}`);
      }
      const data = await res.json();
      const assets = data.assets || [];

      // 1. If release contains a manifest.json asset, download and use that
      const manifestAsset = assets.find(a => a.name.toLowerCase() === 'manifest.json');
      if (manifestAsset) {
        const mRes = await fetch(manifestAsset.browser_download_url);
        if (!mRes.ok) throw new Error(`Failed to download manifest.json from release (HTTP ${mRes.status})`);
        const parsed = await mRes.json();
        if (!parsed.version && data.tag_name) parsed.version = data.tag_name;
        if (!parsed.githubRelease) parsed.githubRelease = { repo, tag: data.tag_name, url: data.html_url };
        return parsed;
      }

      // 2. Otherwise, synthesize manifest from .bin assets in the release
      const binAssets = assets.filter(a => a.name.toLowerCase().endsWith('.bin'));
      if (!binAssets.length) {
        throw new Error(`Latest release ${data.tag_name || ''} has no .bin assets or manifest.json attached.`);
      }

      const isFactory = (name) => /factory|merged|combined|all/i.test(name);
      const isBootloader = (name) => /bootloader/i.test(name);
      const isPartitions = (name) => /partition/i.test(name);
      const isFs = (name) => /littlefs|spiffs|fatfs|storage/i.test(name);
      const isOta = (name) => /ota/i.test(name);

      const CHIP_PATTERNS = [
        { chip: 'esp32s3', label: 'ESP32-S3', regex: /esp32[-_]?s3/i },
        { chip: 'esp32c3', label: 'ESP32-C3', regex: /esp32[-_]?c3/i },
        { chip: 'esp32s2', label: 'ESP32-S2', regex: /esp32[-_]?s2/i },
        { chip: 'esp32c6', label: 'ESP32-C6', regex: /esp32[-_]?c6/i },
        { chip: 'esp32',   label: 'ESP32',    regex: /esp32(?![-_]?[sc])/i },
        { chip: 'esp8266', label: 'ESP8266',  regex: /esp8266/i },
        { chip: 'esp8285', label: 'ESP8285',  regex: /esp8285/i },
      ];

      const builds = [];
      for (const cp of CHIP_PATTERNS) {
        const chipBins = binAssets.filter(a => cp.regex.test(a.name));
        if (chipBins.length > 0) {
          const factory = chipBins.find(a => isFactory(a.name));
          if (factory) {
            builds.push({
              chip: cp.chip,
              name: `${data.name || repo.split('/')[1]} (${cp.label})`,
              parts: [{ path: factory.browser_download_url, offset: 0x0 }]
            });
          } else {
            const boot = chipBins.find(a => isBootloader(a.name));
            const part = chipBins.find(a => isPartitions(a.name));
            const fs = chipBins.find(a => isFs(a.name));
            const app = chipBins.find(a => !isBootloader(a.name) && !isPartitions(a.name) && !isFs(a.name) && !isOta(a.name));

            const parts = [];
            const isC3orS3 = cp.chip === 'esp32c3' || cp.chip === 'esp32s3' || cp.chip === 'esp32c6';
            if (boot) parts.push({ path: boot.browser_download_url, offset: isC3orS3 ? 0x0 : 0x1000 });
            if (part) parts.push({ path: part.browser_download_url, offset: 0x8000 });
            if (app) parts.push({ path: app.browser_download_url, offset: 0x10000 });
            if (fs) parts.push({ path: fs.browser_download_url, offset: 0x290000 });

            if (parts.length > 0) {
              builds.push({
                chip: cp.chip,
                name: `${data.name || repo.split('/')[1]} (${cp.label})`,
                parts
              });
            } else if (chipBins.length === 1) {
              const single = chipBins[0];
              const offset = cp.chip.includes('8266') || cp.chip.includes('8285') ? 0x0 : 0x10000;
              builds.push({
                chip: cp.chip,
                name: `${data.name || repo.split('/')[1]} (${cp.label})`,
                parts: [{ path: single.browser_download_url, offset }]
              });
            }
          }
        }
      }

      if (builds.length === 0) {
        const factory = binAssets.find(a => isFactory(a.name));
        if (factory) {
          builds.push({
            chip: 'esp32',
            name: `${data.name || repo.split('/')[1]} (ESP32)`,
            parts: [{ path: factory.browser_download_url, offset: 0x0 }]
          });
        } else {
          const boot = binAssets.find(a => isBootloader(a.name));
          const part = binAssets.find(a => isPartitions(a.name));
          const fs = binAssets.find(a => isFs(a.name));
          const app = binAssets.find(a => !isBootloader(a.name) && !isPartitions(a.name) && !isFs(a.name));

          if (boot || part || app) {
            const parts = [];
            if (boot) parts.push({ path: boot.browser_download_url, offset: 0x1000 });
            if (part) parts.push({ path: part.browser_download_url, offset: 0x8000 });
            if (app) parts.push({ path: app.browser_download_url, offset: 0x10000 });
            if (fs) parts.push({ path: fs.browser_download_url, offset: 0x290000 });
            builds.push({ chip: 'esp32', name: data.name || repo.split('/')[1], parts });
          } else {
            binAssets.forEach(bin => {
              builds.push({
                chip: 'esp32',
                name: bin.name.replace(/\.bin$/i, ''),
                parts: [{ path: bin.browser_download_url, offset: 0x0 }]
              });
            });
          }
        }
      }

      return {
        name: data.name || repo.split('/')[1] || 'Firmware',
        version: data.tag_name || 'latest',
        description: data.body ? (data.body.length > 200 ? data.body.substring(0, 200) + '…' : data.body) : `Latest release from ${repo}`,
        githubRelease: { repo, tag: data.tag_name, url: data.html_url },
        flashSettings: { mode: 'keep', freq: 'keep', baud: 460800, compress: true },
        builds
      };
    }

    _validateManifest() {
      if (!this._manifest) throw new Error('Manifest is empty');
      if (!this._manifest.builds || !Array.isArray(this._manifest.builds))
        throw new Error('Manifest must have a "builds" array');
      if (!this._manifest.builds.length) throw new Error('Manifest has no builds');
    }

    // ── Flash settings (manifest-driven) ─────────────────────────
    _effectiveBaud(chip, baud) {
      const c = String(chip || '').toUpperCase();
      const is8266 = c.includes('ESP8266') || c.includes('ESP8285');
      return (is8266 && baud > 115200) ? 115200 : baud;
    }

    // Normalize any of the accepted spellings into canonical keys.
    _normalizeFlashSettings(raw) {
      if (!raw || typeof raw !== 'object') return {};
      const s = {};
      if ('mode' in raw) s.mode = raw.mode;
      if ('flashMode' in raw) s.mode = raw.flashMode;
      if ('flash_mode' in raw) s.mode = raw.flash_mode;
      if ('freq' in raw) s.freq = raw.freq;
      if ('flashFreq' in raw) s.freq = raw.flashFreq;
      if ('flash_frequency' in raw) s.freq = raw.flash_frequency;
      if ('flashSize' in raw) s.flashSize = raw.flashSize;
      if ('flash_size' in raw) s.flashSize = raw.flash_size;
      if ('baud' in raw) s.baud = raw.baud;
      if ('erase' in raw) s.erase = raw.erase;
      if ('eraseAll' in raw) s.erase = raw.eraseAll;
      if ('compress' in raw) s.compress = raw.compress;
      return s;
    }

    // Collect settings from a manifest scope (root or build):
    // nested "flashSettings" wins over flat legacy keys.
    _collectFlashSettings(scope) {
      const raw = {};
      if (scope && typeof scope === 'object') {
        Object.assign(raw, scope);
        if (scope.flashSettings && typeof scope.flashSettings === 'object') {
          Object.assign(raw, scope.flashSettings);
        }
      }
      return this._normalizeFlashSettings(raw);
    }

    // Coerce into safe values; invalid entries fall back to defaults.
    _validateFlashSettings(s) {
      const out = {};
      const mode = String(s.mode || '').toLowerCase();
      out.mode = FLASH_MODE_VALUES.includes(mode) ? mode : 'keep';
      const freq = String(s.freq || '').toLowerCase();
      out.freq = FLASH_FREQ_VALUES.includes(freq) ? freq : 'keep';
      const size = String(s.flashSize || '').toUpperCase();
      out.flashSize = FLASH_SIZE_VALUES.includes(size) ? size : 'detect';
      const baud = parseInt(s.baud, 10);
      out.baud = Number.isFinite(baud) && baud > 0 ? baud : null;
      out.erase = typeof s.erase === 'boolean' ? s.erase : null;
      out.compress = typeof s.compress === 'boolean' ? s.compress : true;
      return out;
    }

    // Precedence: build.flashSettings > manifest.flashSettings > component attributes > defaults.
    _resolveFlashSettings(build) {
      const manifestLevel = this._collectFlashSettings(this._manifest);
      const buildLevel = this._collectFlashSettings(build);
      const merged = {};
      for (const key of FLASH_SETTINGS_KEYS) {
        if (buildLevel[key] !== undefined) merged[key] = buildLevel[key];
        else if (manifestLevel[key] !== undefined) merged[key] = manifestLevel[key];
      }
      const s = this._validateFlashSettings(merged);
      if (!s.baud) {
        const attrBaud = parseInt(this._baud, 10);
        s.baud = Number.isFinite(attrBaud) && attrBaud > 0 ? attrBaud : 460800;
      }
      if (this._userBaud) {
        s.baud = this._userBaud;
      }
      return s;
    }

    // ── Firmware card HTML ───────────────────────────────────────
    _fwCardHtml(name, description, ver) {
      return `
        <div class="__efb-fwcard-wrap">
          <div class="__efb-fwcard-inner">
            <div class="__efb-fwicon">${ICONS.micro}</div>
            <div class="__efb-fwinfo">
              <div class="__efb-fwname">${this._esc(name)}</div>
              <div class="__efb-fwmeta">${this._esc(description || 'Firmware installation')}</div>
            </div>
            ${this._manifest?.githubRelease ? `
              <a class="__efb-fwbadge __efb-ghbadge" href="${this._esc(this._manifest.githubRelease.url)}" target="_blank" rel="noopener" title="View release on GitHub">
                ${ICONS.github} ${this._esc(this._manifest.githubRelease.tag || 'Release')}
              </a>
            ` : (ver ? `<span class="__efb-fwbadge">${this._esc(ver)}</span>` : '')}
          </div>
        </div>
      `;
    }

    // ── Panel: Ready ─────────────────────────────────────────────
    _showReadyPanel() {
      const m    = this._manifest;
      const name = m.name || 'Firmware';
      const ver  = m.version ? `v${m.version}` : '';
      const rootSettings = this._resolveFlashSettings(null);
      const eraseChecked = typeof rootSettings.erase === 'boolean' ? rootSettings.erase : this._eraseFirst;
      const currentBaud = this._userBaud || rootSettings.baud || this._baud || 460800;

      if (!this._selectedBuild && m.builds?.length) {
        this._selectedBuild = m.builds[0];
      }
      this._setTitle(name, ver ? `Version ${ver}` : 'Ready to install');
      this._logLines = [];

      const hasMultipleBuilds = m.builds && m.builds.length > 1;

      this._setBody(`
        ${this._fwCardHtml(name, m.description, ver)}

        ${hasMultipleBuilds ? `
        <div class="__efb-vsection" id="__efb-vsection">
          <div class="__efb-vlabel">Target Hardware Variant</div>
          <div class="__efb-vgrid" id="__efb-vgrid">
            ${m.builds.map((b, i) => `
              <div class="__efb-vchip ${b === this._selectedBuild ? 'selected' : ''}" data-idx="${i}">
                ${this._esc(b.chipFamily || b.chip || `Variant ${i+1}`)}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div class="__efb-opt-row" id="__efb-baud-row">
          <div class="__efb-opt-top">
            <div class="__efb-opt-title">${ICONS.bolt} <span>Flash Speed</span></div>
            <div class="__efb-opt-wrap">
              <select class="__efb-opt-select" id="__efb-baud-select" aria-label="Flash baud rate">
                <option value="921600" ${currentBaud === 921600 ? 'selected' : ''}>921600 (Turbo)</option>
                <option value="460800" ${currentBaud === 460800 ? 'selected' : ''}>460800 (Fast)</option>
                <option value="230400" ${currentBaud === 230400 ? 'selected' : ''}>230400 (Balanced)</option>
                <option value="115200" ${currentBaud === 115200 ? 'selected' : ''}>115200 (Safe / ESP8266)</option>
              </select>
            </div>
          </div>
          <div class="__efb-opt-desc">Baud rate for flashing (use 115200 for noisy cables or ESP8266)</div>
        </div>

        <div id="__efb-erase-row" class="__efb-checkrow">
          <div class="__efb-checkbox ${eraseChecked ? 'checked' : ''}" id="__efb-erase-check">
            ${ICONS.check}
          </div>
          <span class="__efb-checklabel">Erase flash before writing</span>
        </div>
        <div class="__efb-srow" id="__efb-srow">
          <div class="__efb-sdot" id="__efb-sdot"></div>
          <div class="__efb-stext" id="__efb-stxt">Connect your ESP device to get started</div>
        </div>
        <div id="__efb-pills" class="__efb-pills" style="display:none;"></div>
        <div id="__efb-settings" class="__efb-settings" style="display:none;"></div>
        <div class="__efb-log" id="__efb-log" style="display:none;"></div>
        <div id="__efb-prog" class="__efb-prog" style="display:none;">
          <div class="__efb-prog-lbl">
            <span class="__efb-prog-txt" id="__efb-ptxt">Starting...</span>
            <span class="__efb-prog-pct" id="__efb-ppct">0%</span>
          </div>
          <div class="__efb-prog-track"><div class="__efb-prog-fill" id="__efb-pfill"></div></div>
        </div>
        <div id="__efb-success" style="display:none;"></div>
        <div id="__efb-errbox" style="display:none;"></div>
      `);

      // Wire baud selection
      const baudSelect = this._modal?.querySelector('#__efb-baud-select');
      if (baudSelect) {
        baudSelect.addEventListener('change', (e) => {
          this._userBaud = parseInt(e.target.value, 10);
          if (this._flashSettings) this._flashSettings.baud = this._userBaud;
        });
      }

      // Wire variant grid selection
      const vgrid = this._modal?.querySelector('#__efb-vgrid');
      if (vgrid) {
        vgrid.addEventListener('click', (e) => {
          const chip = e.target.closest('.__efb-vchip');
          if (!chip) return;
          const idx = parseInt(chip.dataset.idx, 10);
          this._selectedBuild = this._manifest.builds[idx];
          vgrid.querySelectorAll('.__efb-vchip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          this._flashSettings = this._resolveFlashSettings(this._selectedBuild);
        });
      }

      // Erase toggle
      this._eraseEnabled = eraseChecked;
      const eraseRow   = this._modal?.querySelector('#__efb-erase-row');
      const eraseCheck = this._modal?.querySelector('#__efb-erase-check');
      if (eraseRow && eraseCheck) {
        eraseRow.addEventListener('click', () => {
          this._eraseEnabled = !this._eraseEnabled;
          eraseCheck.classList.toggle('checked', this._eraseEnabled);
        });
      }

      this._setConnectBtn();
    }

    _setConnectBtn() {
      this._setFooterBtns(`
        <button class="__efb-btn ghost" id="__efb-btn-cancel">Cancel</button>
        <button class="__efb-btn primary" id="__efb-btn-connect">${ICONS.link} Connect Device</button>
      `);
      this._footerBtns?.querySelector('#__efb-btn-cancel')?.addEventListener('click', () => this._closeModal());
      this._footerBtns?.querySelector('#__efb-btn-connect')?.addEventListener('click', () => this._connectAndFlash());
    }

    // ── Connect + probe + flash ───────────────────────────────────
    async _connectAndFlash() {
      const logEl = this._modal?.querySelector('#__efb-log');
      if (logEl) logEl.style.display = 'block';

      // Hide pre-connect options to keep the modal card compact
      const baudRow = this._modal?.querySelector('#__efb-baud-row');
      if (baudRow) baudRow.style.display = 'none';
      const vsec = this._modal?.querySelector('#__efb-vsection');
      if (vsec) vsec.style.display = 'none';

      this._setStatusDot('amber', 'Waiting for port selection…');
      this._setFooterBtns(`<button class="__efb-btn ghost" id="__efb-btn-cancel-flow">Cancel</button>`);
      this._footerBtns?.querySelector('#__efb-btn-cancel-flow')?.addEventListener('click', async () => {
        await this._closeModal();
      });

      try {
        this._log('info', '→ Requesting serial port...');
        this._port = await navigator.serial.requestPort();
        if (!this._modal) return; // User closed the modal while selecting port
        this._setStatusDot('amber', '<strong>Port acquired.</strong> Connecting…');
        this._log('success', '✓ Serial port acquired.');

        this._port.addEventListener('disconnect', () => {
          this._log('warn', '! Device disconnected.');
          this._abortFlash = true;
          this._isFlashing = false;
          this._setStatusDot('red', 'Device disconnected');
        });

        await this._detectChip();

      } catch (e) {
        if (e.name === 'NotFoundError') {
          this._log('dim', '× Port selection cancelled.');
          this._setStatusDot('', 'Connect your ESP device to get started');
          if (baudRow) baudRow.style.display = '';
          if (vsec) vsec.style.display = '';
          this._setConnectBtn();
        } else if (e.message === 'Aborted by user') {
          this._log('warn', '↻ Flash cancelled by user.');
          await this._cleanupConnection();
          this._showReadyPanel();
          return;
        } else {
          this._log('error', '✗ ' + e.message);
          this._showError('Connection failed', e.message, [
            'Make sure your ESP device is plugged in via USB.',
            'Try a different USB cable or port.',
            'On some boards, hold the BOOT button while clicking Connect.',
          ]);
        }
        this._isFlashing = false;
        if (this._transport) { await this._transport.disconnect().catch(() => {}); this._transport = null; }
        if (this._port?.readable) await this._port.close().catch(() => {});
      }
    }

    _autoSelectBuildForChip() {
      if (!this._chipDetected || !this._manifest?.builds?.length) return;
      const chip = this._chipDetected.toUpperCase();
      const match = this._manifest.builds.find(b => {
        const fam = (b.chipFamily || b.chip || '').toUpperCase();
        return chip.includes(fam) || fam.includes(chip) || chip.startsWith(fam.replace('-', ''));
      });
      if (match) {
        this._selectedBuild = match;
        const grid = this._modal?.querySelector('#__efb-vgrid');
        if (grid) {
          grid.querySelectorAll('.__efb-vchip').forEach((c, i) => {
            const isMatch = this._manifest.builds[i] === match;
            c.classList.toggle('selected', isMatch);
            c.classList.toggle('detected', isMatch);
          });
        }
        this._log('info', `→ Auto-selected variant: ${match.chipFamily || match.chip}`);
      }
    }

    _showChipPills(chip, mac, flashSize) {
      const pillsEl = this._modal?.querySelector('#__efb-pills');
      if (!pillsEl) return;
      pillsEl.style.display = 'grid';
      pillsEl.innerHTML = `
        <div class="__efb-pill hi" title="${this._esc(chip || '—')}"><span class="pl">Chip</span><span class="pv">${this._esc(chip || '—')}</span></div>
        <div class="__efb-pill" title="${this._esc(mac || '—')}"><span class="pl">MAC</span><span class="pv">${this._esc(mac || '—')}</span></div>
        <div class="__efb-pill" title="${this._esc(flashSize || '—')}"><span class="pl">Flash</span><span class="pv">${this._esc(flashSize || '—')}</span></div>
      `;
    }

    // ── Detect chip (connect + probe only) ───────────────────────
    async _detectChip() {
      this._isFlashing = true;
      this._abortFlash = false;
      this._flashStartTime = performance.now();
      if (this._defaultBtn) this._defaultBtn.classList.add('loading');

      const progEl = this._modal?.querySelector('#__efb-prog');
      if (progEl) progEl.style.display = 'flex';

      this._setStatusDot('amber', '<strong>Detecting chip…</strong> — do not unplug your device');
      this._setFooterBtns(`
        <button class="__efb-btn ghost" id="__efb-btn-abort">Cancel</button>
      `);
      this._footerBtns?.querySelector('#__efb-btn-abort')?.addEventListener('click', async () => {
        this._abortFlash = true;
        this._log('warn', '→ Cancelling...');
        await this._closeModal();
      });

      // ── Ensure port is fully closed before esptool opens it ────
      if (this._transport) { await this._transport.disconnect().catch(() => {}); this._transport = null; }
      try {
        if (this._port?.readable || this._port?.writable) {
          await this._port.close().catch(() => {});
        }
      } catch (e) { /* already closed */ }

      let macStr = '—';
      const term = {
        clean: () => {},
        writeLine: (d) => {
          if (typeof d === 'string') {
            if (d.startsWith('MAC: ')) macStr = d.replace('MAC: ', '').trim().toUpperCase();
            this._log('dim', d);
          }
        },
        write: (d) => { if (typeof d === 'string') this._log('dim', d); },
      };

      const transport = new this._Transport(this._port, true);
      this._transport = transport;

      this._setProgress(10, 'Connecting to bootloader…');
      this._log('info', '→ Connecting to bootloader...');

      let useBaud = this._userBaud || this._baud || 460800;
      const loader = new this._ESPLoader({
        transport,
        baudrate: useBaud,
        terminal: term,
        enableTracing: false,
      });

      this._setProgress(25, 'Detecting chip…');
      const chip = await loader.main();
      this._chipDetected = chip;
      this._macDetected = macStr;
      this._log('success', `✓ Chip: ${chip}`);

      // If ESP8266/ESP8285 detected, reconnect at 115200 to prevent brownout
      const is8266 = chip.toUpperCase().includes('ESP8266') || chip.toUpperCase().includes('ESP8285');
      if (is8266 && useBaud > 115200) {
        this._log('warn', `⚠ ESP8266/8285 detected — reducing baud from ${useBaud} to 115200`);
        await transport.disconnect().catch(() => {});
        this._transport = null;
        if (this._port?.readable) await this._port.close().catch(() => {});
        useBaud = 115200;
        const t2 = new this._Transport(this._port, true);
        this._transport = t2;
        loader.transport = t2;
        await loader.main().catch(() => {});
        this._log('info', '→ Reconnected at 115200 baud');
      }

      // Detect flash size
      this._setProgress(35, 'Detecting flash…');
      let flashSize = '4MB';
      try {
        await loader.flashId();
        const flashKb = await loader.getFlashSize();
        if (flashKb) {
          flashSize = kbToFlashSizeStr(flashKb);
          this._flashSizeDetected = flashSize;
          this._log('success', `✓ Flash size: ${flashSize}`);
        }
      } catch (e) { console.warn('ESP Flash Button: flash size detect failed', e); }

      this._autoSelectBuildForChip();
      const build = this._selectedBuild;
      if (!build?.parts?.length) throw new Error(`No firmware variant available for ${chip}.`);

      this._showChipPills(chip, macStr, flashSize);

      if (this._abortFlash) throw new Error('Aborted by user');

      // Store for _executeFlash (and potential reconnect after monitor)
      this._detectLoader = loader;
      this._detectTransport = transport;

      // Show confirmation with Flash button (don't write yet)
      this._showFlashConfirm(chip, flashSize, build, loader, transport, useBaud);
    }

    _showFlashConfirm(chip, flashSize, build, loader, transport, useBaud) {
      // Store for reconnect if monitor disconnects transport
      this._detectBaud = useBaud;
      this._detectBuild = build;
      this._flashSettings = this._resolveFlashSettings(build);

      const progEl = this._modal?.querySelector('#__efb-prog');
      if (progEl) progEl.style.display = 'none';

      // Show erase toggle (build-level setting may override the initial state)
      const eraseRow = this._modal?.querySelector('#__efb-erase-row');
      const eraseCheck = this._modal?.querySelector('#__efb-erase-check');
      if (eraseRow) eraseRow.style.display = 'flex';
      if (typeof this._flashSettings.erase === 'boolean' && eraseCheck) {
        this._eraseEnabled = this._flashSettings.erase;
        eraseCheck.classList.toggle('checked', this._eraseEnabled);
      }

      // Hide ready-state baud selector & variant section to avoid duplicate controls
      const baudRow = this._modal?.querySelector('#__efb-baud-row');
      if (baudRow) baudRow.style.display = 'none';
      const vsec = this._modal?.querySelector('#__efb-vsection');
      if (vsec) vsec.style.display = 'none';

      this._log('info', `→ ${build.parts.length} file(s) to write. Ready to flash.`);


      // Flash settings info strip — shows exactly what will be applied
      const st = this._flashSettings;
      const effSize = st.flashSize !== 'detect' ? st.flashSize : (flashSize || '4MB');
      const effBaud = this._effectiveBaud(chip, st.baud);
      const is8266 = chip.toUpperCase().includes('ESP8266') || chip.toUpperCase().includes('ESP8285');
      const settingsEl = this._modal?.querySelector('#__efb-settings');
      if (settingsEl) {
        settingsEl.style.display = 'flex';
        settingsEl.innerHTML = `
        <div class="__efb-confirm-baudrow">
          <div class="__efb-baud-lbl-group">
            <div class="__efb-baud-icon">${ICONS.bolt}</div>
            <div class="__efb-baud-titles">
              <div class="__efb-baud-label">Flashing Speed</div>
              <div class="__efb-baud-sub">${is8266 ? 'ESP8266 safe limit (115200 max)' : 'Select baud rate for flashing'}</div>
            </div>
          </div>
          <div class="__efb-baud-select-wrap">
            <select class="__efb-confirm-baud-select" id="__efb-confirm-baud" ${is8266 ? 'disabled title="ESP8266 capped at 115200"' : ''}>
              <option value="921600" ${effBaud === 921600 ? 'selected' : ''}>921600 (Fastest)</option>
              <option value="460800" ${effBaud === 460800 ? 'selected' : ''}>460800 (Recommended)</option>
              <option value="230400" ${effBaud === 230400 ? 'selected' : ''}>230400 (Stable)</option>
              <option value="115200" ${effBaud === 115200 ? 'selected' : ''}>115200 (Safe)</option>
            </select>
          </div>
        </div>

        <details class="__efb-details-toggle">
          <summary class="__efb-details-summary">
            <span class="__efb-details-summary-title">Flash Details</span>
            <span class="__efb-details-summary-hint">${this._esc(st.mode.toUpperCase())} · ${this._esc(st.freq)} · ${this._esc(effSize)} · ${st.compress ? 'compressed' : 'raw'}</span>
            <span class="__efb-details-arrow">▾</span>
          </summary>
          <div class="__efb-details-content">
            <div class="__efb-detail-item">
              <span class="k">Flash Mode</span>
              <span class="v">${this._esc(st.mode.toUpperCase())}</span>
            </div>
            <div class="__efb-detail-item">
              <span class="k">Frequency</span>
              <span class="v">${this._esc(st.freq)}</span>
            </div>
            <div class="__efb-detail-item">
              <span class="k">Flash Size</span>
              <span class="v">${this._esc(effSize)}</span>
            </div>
            <div class="__efb-detail-item">
              <span class="k">Compression</span>
              <span class="v">${st.compress ? 'Enabled' : 'Disabled'}</span>
            </div>
            ${typeof st.erase === 'boolean' ? `
            <div class="__efb-detail-item">
              <span class="k">Erase Setting</span>
              <span class="v">${st.erase ? 'Full Erase' : 'Keep Flash'}</span>
            </div>` : ''}
          </div>
        </details>
      `;
        const confirmBaudEl = settingsEl.querySelector('#__efb-confirm-baud');
        if (confirmBaudEl) {
          confirmBaudEl.addEventListener('change', (e) => {
            const newBaud = parseInt(e.target.value, 10);
            this._userBaud = newBaud;
            this._flashSettings.baud = newBaud;
            this._log('info', `→ Flash speed updated to ${newBaud} baud`);
          });
        }
      }

      this._setStatusDot('amber', `<strong>Device detected.</strong> Click "Flash Firmware" to begin`);
      this._setFooterBtns(`
        <button class="__efb-btn ghost" id="__efb-btn-cancel-flash">Cancel</button>
        <button class="__efb-btn primary" id="__efb-btn-start-flash">${ICONS.bolt} Flash Firmware</button>
      `);

      this._footerBtns?.querySelector('#__efb-btn-cancel-flash')?.addEventListener('click', async () => {
        await this._closeModal();
      });

      this._footerBtns?.querySelector('#__efb-btn-start-flash')?.addEventListener('click', async () => {
        await this._executeFlash(build);
      });
    }

    // ── Execute flash (fetch + write + reset) ─────────────────────
    async _executeFlash(build) {
      // Hide all pre-flash cards so the active flashing view is ultra-compact and focused
      const fwCard = this._modal?.querySelector('.__efb-fwcard-wrap');
      if (fwCard) fwCard.style.display = 'none';
      const baudRow = this._modal?.querySelector('#__efb-baud-row');
      if (baudRow) baudRow.style.display = 'none';
      const eraseRow = this._modal?.querySelector('#__efb-erase-row');
      if (eraseRow) eraseRow.style.display = 'none';
      const vsec = this._modal?.querySelector('#__efb-vsection');
      if (vsec) vsec.style.display = 'none';
      const settingsEl = this._modal?.querySelector('#__efb-settings');
      if (settingsEl) settingsEl.style.display = 'none';

      // Move progress bar right under status row for clean hierarchy
      const srow = this._modal?.querySelector('#__efb-srow');
      const progEl = this._modal?.querySelector('#__efb-prog');
      if (progEl && srow && srow.parentNode) {
        progEl.style.display = 'flex';
        srow.parentNode.insertBefore(progEl, srow.nextSibling);
      }

      this._setStatusDot('amber', '<strong>Flashing…</strong> — do not unplug your device');
      this._setFooterBtns(`
        <button class="__efb-btn ghost" id="__efb-btn-abort">Cancel</button>
      `);
      this._footerBtns?.querySelector('#__efb-btn-abort')?.addEventListener('click', async () => {
        this._abortFlash = true;
        this._log('warn', '→ Cancelling...');
        await this._closeModal();
      });


      // Close serial monitor if still open (opened from confirm step)
      if (this._serialMonitorOpen) await this._closeSerialMonitor();

      let loader = this._detectLoader;
      let transport = this._detectTransport;

      const settings = this._flashSettings || this._resolveFlashSettings(build);

      // KEEP THE ACTIVE CONNECTION!
      // Do NOT disconnect and re-sync if the bootloader is already connected and ready.
      // Only reconnect if transport was disconnected (e.g. user opened serial monitor).
      const desiredBaud = this._effectiveBaud(this._chipDetected, settings.baud);
      const currentBaud = this._detectBaud || this._baud;
      let needReconnect = !this._transport || !loader;

      if (!needReconnect && desiredBaud !== currentBaud) {
        try {
          if (loader.setBaudrate) {
            await loader.setBaudrate(desiredBaud);
            this._detectBaud = desiredBaud;
            this._log('info', `→ Switched baud to ${desiredBaud}`);
          }
        } catch (_) {
          this._log('info', `→ Flashing on active connection at ${currentBaud} baud`);
        }
      }

      if (needReconnect) {
        this._log('info', '→ Re-establishing connection to device...');
        try {
          const result = await this._reconnectForFlash(desiredBaud);
          loader = result.loader;
          transport = result.transport;
        } catch (e) {
          this._log('error', '✗ Reconnection failed: ' + e.message);
          this._isFlashing = false;
          if (this._defaultBtn) this._defaultBtn.classList.remove('loading');
          this._showError('Connection failed', e.message, [
            'Make sure your device is still connected via USB.',
            'Try closing and reconnecting.',
          ]);
          return;
        }
      } else {
        this._log('info', `→ Device ready on active connection (${this._detectBaud || currentBaud} baud)`);
      }

      const flashSize = (settings.flashSize !== 'detect') ? settings.flashSize : (this._flashSizeDetected || '4MB');
      const startTime = performance.now();
      this._flashStartTime = startTime;
      let fileStartTime = startTime;
      let lastFileIdx = -1;

      try {
        // Fetch firmware files
        const manifestBase = this._manifestUrl.substring(0, this._manifestUrl.lastIndexOf('/') + 1);
        const flashFiles = [];

        this._log('accent', `→ Flashing ${this._manifest?.name || 'firmware'} [${build.chipFamily}]`);
        this._log('info', `→ Flash settings: mode=${settings.mode} freq=${settings.freq} size=${flashSize} baud=${desiredBaud} compress=${settings.compress ? 'on' : 'off'}`);
        this._setProgress(null, 'Fetching firmware files…');

        for (let i = 0; i < build.parts.length; i++) {
          if (this._abortFlash) throw new Error('Aborted by user');
          const part = build.parts[i];
          const rawOffset = part.offset !== undefined ? part.offset : part.address;
          const offset = typeof rawOffset === 'string'
            ? (rawOffset.startsWith('0x') || rawOffset.startsWith('0X') ? parseInt(rawOffset, 16) : parseInt(rawOffset, 10))
            : (rawOffset || 0);
          const url  = part.path.startsWith('http') ? part.path : manifestBase + part.path;
          this._log('info', `  Fetching ${part.path}...`);
          this._setProgress(null, `Fetching ${part.path} (${i+1}/${build.parts.length})…`);
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            flashFiles.push({ data: bufStr(buf), address: offset });
            this._log('success', `  ✓ ${part.path} (${(buf.byteLength / 1024).toFixed(1)} KB) @ 0x${offset.toString(16)}`);
          } catch (e) {
            throw new Error(`Cannot fetch ${part.path}: ${e.message}`);
          }
        }

        if (this._abortFlash) throw new Error('Aborted by user');

        // Write flash
        const willEraseAll = this._eraseEnabled ?? this._eraseFirst ?? false;
        if (willEraseAll) {
          this._setProgress(null, 'Erasing flash memory… this may take a few seconds');
          this._log('warn', '→ Erasing flash memory before writing...');
        } else {
          this._setProgress(null, 'Preparing flash memory…');
        }

        this._log('info', `→ Writing ${flashFiles.length} file(s) to flash...`);

        const totalFiles = flashFiles.length;
        const md5Results = [];

        await loader.writeFlash({
          fileArray: flashFiles,
          flashSize,
          flashMode:  settings.mode,
          flashFreq:  settings.freq,
          eraseAll:   willEraseAll,
          compress:   settings.compress,
          reportProgress: (fi, written, total) => {
            if (this._abortFlash) throw new Error('Aborted by user');
            if (fi !== lastFileIdx) {
              lastFileIdx = fi;
              fileStartTime = performance.now();
            }
            // Use exact percentage from esptool-js written/total so UI matches terminal log identically
            const pct = Math.min(100, Math.max(0, Math.floor((written / total) * 100)));
            const elapsed = (performance.now() - fileStartTime) / 1000;
            const eta = pct > 4 && pct < 99 && elapsed > 0.5 ? Math.max(1, Math.round((elapsed / pct) * (100 - pct))) : 0;
            const etaStr = eta > 0 ? ` — ETA ${eta}s` : '';
            const fileName = (build.parts[fi]?.path || `file ${fi+1}`).split('/').pop();
            const filePrefix = totalFiles > 1 ? `[${fi + 1}/${totalFiles}] ` : '';
            this._setProgress(Math.min(pct, 99), `Writing ${filePrefix}${fileName} (${pct}%${etaStr})`);
          },
          calculateMD5Hash: (image) => {
            const arr = new Uint8Array(image.length);
            for (let i = 0; i < image.length; i++) arr[i] = image.charCodeAt(i) & 0xff;
            const hash = md5(arr.buffer);
            md5Results.push(hash);
            return hash;
          },
        });

        // Done
        this._setProgress(100, 'Flash complete!');
        this._flashDuration = ((performance.now() - startTime) / 1000).toFixed(1);
        this._log('success', `✓ Flash complete in ${this._flashDuration}s!`);

        // Hard reset — release from bootloader to app
        await loader.hardReset().catch(() => {});
        this._log('success', '✓ Device rebooting…');

        // IMPORTANT: Disconnect transport fully so the port is free for serial monitor
        await transport.disconnect().catch(() => {});
        this._transport = null;

        this._isFlashing = false;
        if (this._defaultBtn) this._defaultBtn.classList.remove('loading');

        const chip = this._chipDetected || '—';
        this._showSuccess(chip, flashSize, this._flashDuration, flashFiles.length, md5Results, build.parts);

        this._showCelebration();

      this.dispatchEvent(new CustomEvent('flash-success', {
          detail: { chip, flashSize, duration: this._flashDuration, filesCount: flashFiles.length },
          bubbles: true, composed: true,
        }));

      } catch (e) {
        if (e.message === 'Aborted by user') {
          this._log('warn', '↻ Flash cancelled by user.');
          await this._cleanupConnection();
          this._showReadyPanel();
          return;
        }
        this._isFlashing = false;
        if (this._defaultBtn) this._defaultBtn.classList.remove('loading');
        await transport.disconnect().catch(() => {});
        this._transport = null;
        this._log('error', '✗ ' + e.message);

        // Smart Baud Fallback: Offer 1-click retry at 115200 if high-speed flash timed out
        const isBaudTimeout = /time(d)?\s*out|slip|sync|header|packet|receive/i.test(e.message);
        if (desiredBaud > 115200 && isBaudTimeout) {
          this._showBaudRecovery(desiredBaud, e.message, build);
          return;
        }

        this._showError('Flash failed', e.message, [
          'Make sure your device stays connected throughout flashing.',
          'Try a different USB cable or port.',
          'Hold the BOOT button if the device keeps failing.',
        ]);
      }
    }

    _showBaudRecovery(failedBaud, errorMsg, build) {
      this._setTitle('Flash Speed Fallback', 'Connection lost during flashing');
      this._setStatusDot('amber', `<strong>High-speed flash timed out (${failedBaud} baud).</strong>`);

      const errbox = this._modal?.querySelector('#__efb-errbox');
      if (errbox) {
        errbox.style.display = 'block';
        errbox.innerHTML = `
          <div class="__efb-baud-fallback-box">
            <div class="__efb-baud-fallback-title">
              ${ICONS.warning} Flashing timed out at ${failedBaud} baud
            </div>
            <div class="__efb-baud-fallback-desc">
              High speeds (${failedBaud} baud) frequently drop packets on unshielded USB cables, breadboards, or USB hubs. Falling back to the universal <strong>115200 safe baud rate</strong> almost always succeeds.
            </div>
            <button class="__efb-btn primary" id="__efb-btn-retry-safe" style="width:100%;margin-top:10px;justify-content:center;">
              ${ICONS.bolt} Retry at Safe Speed (115200 Baud)
            </button>
          </div>
        `;
        errbox.querySelector('#__efb-btn-retry-safe')?.addEventListener('click', async () => {
          errbox.style.display = 'none';
          this._userBaud = 115200;
          this._flashSettings.baud = 115200;
          this._log('info', '→ Retrying flash at safe speed: 115200 baud...');
          await this._executeFlash(build);
        });
      }

      this._setFooterBtns(`
        <button class="__efb-btn ghost" id="__efb-btn-cancel-rec">Cancel</button>
      `);
      this._footerBtns?.querySelector('#__efb-btn-cancel-rec')?.addEventListener('click', () => this._closeModal());
    }

    async _reconnectForFlash(baud = this._detectBaud || this._baud) {
      if (!this._port) throw new Error('No port available. Device may have been disconnected.');
      // Ensure transport is disconnected
      if (this._transport) { await this._transport.disconnect().catch(() => {}); this._transport = null; }
      // Wait for any serial monitor cleanup to finish
      await new Promise(r => setTimeout(r, 200));
      // Force-close port if still open, ensuring stream locks are dropped
      try {
        if (this._port.readable || this._port.writable) {
          await this._port.close().catch(() => {});
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 100));

      const transport = new this._Transport(this._port, true);
      this._transport = transport;

      let useBaud = baud;
      const term = {
        clean: () => {},
        writeLine: (d) => { if (typeof d === 'string') this._log('dim', d); },
        write: (d) => { if (typeof d === 'string') this._log('dim', d); },
      };
      const loader = new this._ESPLoader({
        transport,
        baudrate: useBaud,
        terminal: term,
        enableTracing: false,
      });

      await loader.main();

      // Handle ESP8266 baud cap
      const chip = this._chipDetected || '';
      const is8266 = chip.toUpperCase().includes('ESP8266') || chip.toUpperCase().includes('ESP8285');
      if (is8266 && useBaud > 115200) {
        this._log('warn', `⚠ Reconnecting at 115200 for ESP8266/8285`);
        await transport.disconnect().catch(() => {});
        this._transport = null;
        if (this._port?.readable) await this._port.close().catch(() => {});
        useBaud = 115200;
        const t2 = new this._Transport(this._port, true);
        this._transport = t2;
        loader.transport = t2;
        await loader.main().catch(() => {});
      }

      this._log('success', '✓ Device reconnected');
      return { loader, transport };
    }

    // ── Show success state ───────────────────────────────────────
    _showSuccess(chip, flashSize, duration, filesCount, md5Results = [], parts = []) {
      const progEl = this._modal?.querySelector('#__efb-prog');
      if (progEl) progEl.style.display = 'none';
      const pillsEl = this._modal?.querySelector('#__efb-pills');
      if (pillsEl) pillsEl.style.display = 'none';

      this._setStatusDot('green', '<strong>Flash complete!</strong> Device is running new firmware.');
      this._setTitle(this._manifest?.name || 'Firmware', 'Installation complete');

      const successEl = this._modal?.querySelector('#__efb-success');
      if (successEl) {
        successEl.style.display = 'block';
        successEl.innerHTML = `
          <div class="__efb-succ">
            <div class="__efb-succ-head">
              <svg class="__efb-checkmark" viewBox="0 0 52 52">
                <circle class="__efb-check-circle" cx="26" cy="26" r="25"/>
                <path class="__efb-check-path" d="M14 27l7 7 16-16"/>
              </svg>
              <div>
                <div class="__efb-succ-title">Firmware installed</div>
                <div class="__efb-succ-sub">Device is flashed and rebooting</div>
              </div>
            </div>
            <div class="__efb-succ-meta">
              <span>${this._esc(chip || '—')}</span>
              <span>${this._esc(flashSize)}</span>
              <span>${duration}s</span>
              <span>${filesCount} file${filesCount !== 1 ? 's' : ''}</span>
            </div>
            ${md5Results.length ? `
            <div class="__efb-succ-md5">
              <div class="__efb-succ-md5-title">MD5 Verification</div>
              ${md5Results.map((hash, i) => `
                <div class="__efb-succ-md5-row">
                  <span class="__efb-succ-md5-file" title="${this._esc(parts[i]?.path || `file${i}`)}">${this._esc(parts[i]?.path?.split('/').pop() || `file${i}`)}</span>
                  <span class="__efb-succ-md5-addr">0x${this._esc(parts[i]?.offset?.toString(16) || '?')}</span>
                  <span class="__efb-succ-md5-hash">${hash}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}
            <div class="__efb-succ-actions">
              <button class="__efb-succ-btn __efb-succ-btn-serial" id="__efb-succ-open-monitor" title="View boot logs in Serial Monitor">
                ${ICONS.terminal} <span>Open Serial Monitor</span>
              </button>
              <button class="__efb-succ-btn __efb-succ-btn-wifi" id="__efb-succ-open-wifi" title="Set up Wi-Fi over USB Serial">
                ${ICONS.wifi} <span>Configure Wi-Fi</span>
              </button>
            </div>
          </div>
        `;

        successEl.querySelector('#__efb-succ-open-monitor')?.addEventListener('click', async () => {
          await this._closeModal();
          await this._openSerialMonitor(115200);
        });

        successEl.querySelector('#__efb-succ-open-wifi')?.addEventListener('click', () => {
          this._showWifiProvisioning();
        });
      }

      const hasPort = !!this._port;

      this._setFooterBtns(`
        <button class="__efb-btn ghost" id="__efb-btn-done">Done</button>
        ${hasPort ? `<button class="__efb-btn ghost serial-btn" id="__efb-btn-serial" style="gap:5px;">${ICONS.terminal} Monitor</button>` : ''}
        <button class="__efb-btn ghost" id="__efb-btn-refresh" style="gap:5px;padding:9px 12px;" title="Start over">${ICONS.refresh}</button>
      `);

      this._footerBtns?.querySelector('#__efb-btn-done')?.addEventListener('click', () => this._closeModal());
      this._footerBtns?.querySelector('#__efb-btn-refresh')?.addEventListener('click', async () => {
        await this._cleanupConnection();
        this._showReadyPanel();
      });
      if (hasPort) {
        this._footerBtns?.querySelector('#__efb-btn-serial')?.addEventListener('click', () => this._openSerialMonitor());
      }
    }

    _showWifiProvisioning() {
      const successEl = this._modal?.querySelector('#__efb-success');
      if (!successEl) return;
      this._setTitle('Wi-Fi Setup', 'Connect device to local Wi-Fi');
      this._setStatusDot('amber', 'Enter Wi-Fi credentials to provision device over Serial');

      successEl.innerHTML = `
        <div class="__efb-wifi-card">
          <div class="__efb-wifi-header">
            <div class="__efb-wifi-icon">${ICONS.wifi}</div>
            <div>
              <div class="__efb-wifi-title">Improv Wi-Fi Provisioning</div>
              <div class="__efb-wifi-sub">Send Wi-Fi credentials directly over USB serial</div>
            </div>
          </div>
          <div class="__efb-wifi-form">
            <div class="__efb-wifi-field">
              <label class="__efb-wifi-label">Wi-Fi Network Name (SSID)</label>
              <input type="text" class="__efb-wifi-input" id="__efb-wifi-ssid" placeholder="e.g. MyHomeNetwork" autocomplete="off" />
            </div>
            <div class="__efb-wifi-field">
              <label class="__efb-wifi-label">Password</label>
              <input type="password" class="__efb-wifi-input" id="__efb-wifi-pass" placeholder="Wi-Fi Password" autocomplete="off" />
            </div>
            <div class="__efb-wifi-status" id="__efb-wifi-status" style="display:none;"></div>
            <div class="__efb-wifi-btns">
              <button class="__efb-btn ghost" id="__efb-wifi-back">Back</button>
              <button class="__efb-btn primary" id="__efb-wifi-send">${ICONS.wifi} Connect Device</button>
            </div>
          </div>
        </div>
      `;

      successEl.querySelector('#__efb-wifi-back')?.addEventListener('click', () => {
        const chip = this._chipDetected || '—';
        this._showSuccess(chip, this._flashSizeDetected || '4MB', this._flashDuration || '0', 1, []);
      });

      successEl.querySelector('#__efb-wifi-send')?.addEventListener('click', async () => {
        const ssid = successEl.querySelector('#__efb-wifi-ssid')?.value.trim();
        const pass = successEl.querySelector('#__efb-wifi-pass')?.value || '';
        const statusEl = successEl.querySelector('#__efb-wifi-status');
        const sendBtn = successEl.querySelector('#__efb-wifi-send');
        if (!ssid) {
          if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.className = '__efb-wifi-status err';
            statusEl.textContent = 'Please enter a Wi-Fi network name (SSID).';
          }
          return;
        }
        if (sendBtn) sendBtn.disabled = true;
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.className = '__efb-wifi-status info';
          statusEl.textContent = 'Sending Wi-Fi credentials via Serial…';
        }
        await this._sendImprovWifi(ssid, pass, statusEl, sendBtn);
      });
    }

    async _sendImprovWifi(ssid, pass, statusEl, sendBtn) {
      try {
        if (!this._port) throw new Error('Device not connected. Reconnect USB cable.');
        if (!this._port.readable || !this._port.writable) {
          await this._port.open({ baudRate: 115200 }).catch(() => {});
        }

        const encoder = new TextEncoder();
        const ssidBytes = encoder.encode(ssid);
        const passBytes = encoder.encode(pass);

        // Improv RPC Packet (Command 0x01: Send Wi-Fi settings)
        // Format: 'IMPROV', version(0x01), type(0x03), length, [cmd(0x01), ssid_len, ...ssid, pass_len, ...pass], checksum
        const header = [0x49, 0x4D, 0x50, 0x52, 0x4F, 0x56, 0x01, 0x03];
        const payload = [0x01, ssidBytes.length, ...ssidBytes, passBytes.length, ...passBytes];
        const packet = [...header, payload.length, ...payload];
        let sum = 0;
        for (const b of packet) sum = (sum + b) & 0xff;
        packet.push(sum);

        const writer = this._port.writable.getWriter();
        await writer.write(new Uint8Array(packet));
        writer.releaseLock();

        if (statusEl) {
          statusEl.className = '__efb-wifi-status ok';
          statusEl.innerHTML = `✓ Wi-Fi credentials sent! <br><small>If your firmware supports Improv-Wi-Fi, it is connecting now.</small>`;
        }
        this._log('success', `✓ Improv Wi-Fi: sent credentials for network "${ssid}"`);
      } catch (err) {
        if (statusEl) {
          statusEl.className = '__efb-wifi-status err';
          statusEl.textContent = 'Failed to send credentials: ' + err.message;
        }
        this._log('error', `✗ Improv Wi-Fi error: ${err.message}`);
      } finally {
        if (sendBtn) sendBtn.disabled = false;
      }
    }

    _showCelebration() {
      const container = document.createElement('div');
      container.className = '__efb-confetti-container';
      const colors = ['#e03030','#ff4a40','#3dd68c','#f59e0b','#4d9de0','#a060e0','#ff6b6b','#22d3ee'];
      for (let i = 0; i < 80; i++) {
        const el = document.createElement('div');
        el.className = '__efb-confetti';
        const angle = Math.random() * 360;
        const dist = 100 + Math.random() * 350;
        const x = Math.cos(angle * Math.PI / 180) * dist;
        const y = Math.sin(angle * Math.PI / 180) * dist;
        el.style.setProperty('--ex', x + 'px');
        el.style.setProperty('--ey', y + 'px');
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.width = (4 + Math.random() * 8) + 'px';
        el.style.height = (4 + Math.random() * 8) + 'px';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.animationDelay = (Math.random() * 0.3) + 's';
        el.style.animationDuration = (0.6 + Math.random() * 0.6) + 's';
        container.appendChild(el);
      }
      document.body.appendChild(container);
      setTimeout(() => container.remove(), 2000);
    }

    // ── Serial Monitor ───────────────────────────────────────────
    async _openSerialMonitor() {
      if (this._serialMonitorOpen) return;
      if (!this._port) {
        if (!('serial' in navigator)) {
          alert('Web Serial is not supported in this browser. Please use Chrome or Edge 89+ on desktop.');
          return;
        }
        try {
          this._port = await navigator.serial.requestPort();
        } catch (e) {
          return;
        }
      }

      this._serialMonitorOpen = true;
      this._serialReading     = false;

      // Hide the main modal overlay so it doesn't show behind
      if (this._overlay) this._overlay.style.display = 'none';

      const smOverlay = document.createElement('div');
      smOverlay.className = '__efb-sm-overlay';
      this._smOverlay = smOverlay;

      const smModal = document.createElement('div');
      smModal.className = '__efb-sm-modal';
      if (this._theme === 'light') { smOverlay.dataset.theme = 'light'; smModal.dataset.theme = 'light'; }
      this._smModal = smModal;

      smModal.innerHTML = `
        <div class="__efb-sm-header">
          <div class="__efb-sm-hicon">${ICONS.terminal}</div>
          <div class="__efb-sm-htitles">
            <div class="__efb-sm-htitle">Serial Monitor</div>
            <div class="__efb-sm-hsub" id="__efb-sm-status">
              <span class="__efb-sm-dot"></span>
              <span id="__efb-sm-statustext">Connecting…</span>
            </div>
          </div>
          <button class="__efb-sm-hclose" id="__efb-sm-close">${ICONS.close}</button>
        </div>
        <div class="__efb-sm-toolbar">
          <div class="__efb-sm-toolbar-left">
            <span class="__efb-sm-label">Baud</span>
            <select class="__efb-sm-select" id="__efb-sm-baud">
              <option value="9600">9600</option>
              <option value="19200">19200</option>
              <option value="38400">38400</option>
              <option value="57600">57600</option>
              <option value="74880">74880 (Boot)</option>
              <option value="115200" selected>115200</option>
              <option value="230400">230400</option>
              <option value="460800">460800</option>
              <option value="921600">921600</option>
            </select>
            <span class="__efb-sm-label">EOL</span>
            <select class="__efb-sm-select" id="__efb-sm-eol">
              <option value="">None</option>
              <option value="\r\n" selected>CR+LF</option>
              <option value="\n">LF</option>
              <option value="\r">CR</option>
            </select>
          </div>
          <div class="__efb-sm-toolbar-right">
            <button class="__efb-sm-tbtn ${this._smShowTimestamp ? 'active' : ''}" id="__efb-sm-ts" title="Toggle line timestamps">TS</button>
            <button class="__efb-sm-tbtn" id="__efb-sm-dtr" title="Toggle DTR">DTR</button>
            <button class="__efb-sm-tbtn" id="__efb-sm-rts" title="Toggle RTS / Reset">RST</button>
            <button class="__efb-sm-tbtn __efb-sm-tbtn-clear" id="__efb-sm-clear">${ICONS.trash} Clear</button>
          </div>
        </div>
        <div class="__efb-sm-output" id="__efb-sm-output">
          <span class="__efb-sm-line sys" id="__efb-sm-empty">Waiting for output…</span>
        </div>
        <div class="__efb-sm-input-row">
          <input class="__efb-sm-input" id="__efb-sm-input" placeholder="Type command and press Enter" autocomplete="off" />
          <button class="__efb-sm-send" id="__efb-sm-send">${ICONS.send} Send</button>
        </div>
        <div class="__efb-sm-footer">
          <span class="__efb-sm-footer-credit">Powered by <a href="${CREDIT_URL}" target="_blank" rel="noopener">esp-flash-button</a></span>
          <span class="__efb-sm-count" id="__efb-sm-count">0 lines</span>
        </div>
      `;

      smOverlay.appendChild(smModal);
      document.body.appendChild(smOverlay);

      // Wire close
      smModal.querySelector('#__efb-sm-close').addEventListener('click', () => this._closeSerialMonitor());
      smOverlay.addEventListener('click', (e) => { if (e.target === smOverlay) this._closeSerialMonitor(); });

      // Wire Escape key for serial monitor
      this._onSmKeyDown = (e) => {
        if (e.key === 'Escape') this._closeSerialMonitor();
      };
      window.addEventListener('keydown', this._onSmKeyDown);

      // Wire timestamp toggle
      const tsBtn = smModal.querySelector('#__efb-sm-ts');
      if (tsBtn) {
        tsBtn.classList.toggle('active', this._smShowTimestamp);
        tsBtn.addEventListener('click', () => {
          this._smShowTimestamp = !this._smShowTimestamp;
          tsBtn.classList.toggle('active', this._smShowTimestamp);
        });
      }

      // Wire clear
      smModal.querySelector('#__efb-sm-clear').addEventListener('click', () => {
        const out = smModal.querySelector('#__efb-sm-output');
        out.innerHTML = '<span class="__efb-sm-line sys" id="__efb-sm-empty">Cleared.</span>';
        this._smLineCount = 0;
        const cnt = smModal.querySelector('#__efb-sm-count');
        if (cnt) cnt.textContent = '0 lines';
      });

      // Wire DTR toggle
      let dtrState = true;
      const dtrBtn = smModal.querySelector('#__efb-sm-dtr');
      dtrBtn.classList.toggle('active', dtrState);
      dtrBtn.addEventListener('click', async () => {
        dtrState = !dtrState;
        dtrBtn.classList.toggle('active', dtrState);
        try { await this._smPort?.setSignals({ dataTerminalReady: dtrState }); } catch (e) {}
        this._smAppendLine(`[DTR ${dtrState ? 'ON' : 'OFF'}]`, 'sys');
      });

      // Wire RST (DTR+RTS pulse — triggers reset on most ESP32 boards)
      const rtsBtn = smModal.querySelector('#__efb-sm-rts');
      rtsBtn.addEventListener('click', async () => {
        try {
          await this._smPort?.setSignals({ dataTerminalReady: true, requestToSend: false });
          await new Promise(r => setTimeout(r, 100));
          await this._smPort?.setSignals({ dataTerminalReady: false, requestToSend: true });
          await new Promise(r => setTimeout(r, 50));
          await this._smPort?.setSignals({ dataTerminalReady: false, requestToSend: false });
          this._smAppendLine('[RST pulse sent — device resetting]', 'sys');
        } catch (e) {
          this._smAppendLine('[RST: ' + e.message + ']', 'err');
        }
      });

      // Wire baud change
      const baudSel = smModal.querySelector('#__efb-sm-baud');
      baudSel.addEventListener('change', async () => {
        await this._stopSerialReadLoop();
        await this._startSerialReadLoop(parseInt(baudSel.value, 10));
      });

      // Wire send
      const inputEl = smModal.querySelector('#__efb-sm-input');
      const eolSel  = smModal.querySelector('#__efb-sm-eol');
      const doSend  = async () => {
        const val = inputEl.value;
        if (!val) return;
        const eol = eolSel.value;
        inputEl.value = '';
        this._smAppendLine('> ' + val, 'tx');
        try {
          if (this._smWriter) {
            const enc = new TextEncoder();
            await this._smWriter.write(enc.encode(val + eol));
          }
        } catch (e) {
          this._smAppendLine('[Send error: ' + e.message + ']', 'err');
        }
      };
      smModal.querySelector('#__efb-sm-send').addEventListener('click', doSend);
      inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });

      this._smLineCount = 0;

      // Propagate theme to :root so serial monitor inherits CSS variables
      this._savedRootTheme = document.documentElement.dataset.theme || '';
      document.documentElement.dataset.theme = this._theme;

      // Open port for serial monitor
      try {
        await this._startSerialReadLoop(115200);
      } catch (e) {
        this._smAppendLine(`[Failed to initialize serial: ${e.message}]`, 'err');
        const statusEl = this._smModal?.querySelector('#__efb-sm-statustext');
        if (statusEl) statusEl.textContent = 'Connection failed';
      }
    }

    _smAppendLine(text, type = 'rx') {
      const out = this._smModal?.querySelector('#__efb-sm-output');
      if (!out) return;

      // Remove placeholder
      const empty = out.querySelector('#__efb-sm-empty');
      if (empty) empty.remove();

      // Check if user is scrolled to bottom (keep position if scrolled up)
      const isAtBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 25;

      // Limit lines to 500 to prevent memory issues
      while (out.childElementCount > 500) out.removeChild(out.firstChild);

      const span = document.createElement('span');
      span.className = `__efb-sm-line ${type}`;

      if (this._smShowTimestamp && type !== 'sys') {
        const d = new Date();
        const ts = d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
        const tsSpan = document.createElement('span');
        tsSpan.className = '__efb-sm-ts';
        tsSpan.textContent = `[${ts}] `;
        span.appendChild(tsSpan);
      }

      const textNode = document.createTextNode(text);
      span.appendChild(textNode);
      out.appendChild(span);

      // Auto-scroll only if user is at the bottom
      if (isAtBottom) {
        out.scrollTop = out.scrollHeight;
      }

      this._smLineCount = (this._smLineCount || 0) + 1;
      const cnt = this._smModal?.querySelector('#__efb-sm-count');
      if (cnt) cnt.textContent = `${this._smLineCount} line${this._smLineCount !== 1 ? 's' : ''}`;
    }

    async _startSerialReadLoop(baud) {
      try {
        this._smPort = this._port;
        // Close port if already open so we can reopen at the desired baud
        if (this._smPort?.readable) {
          try { await this._smPort.close(); } catch (_) {}
        }
        await this._smPort.open({ baudRate: baud });

        // Get writer for TX
        if (this._smPort.writable) {
          this._smWriter = this._smPort.writable.getWriter();
        }

        const statusEl = this._smModal?.querySelector('#__efb-sm-statustext');
        if (statusEl) statusEl.textContent = `Connected at ${baud} baud`;

        this._serialReading = true;
        this._smAppendLine(`[Serial monitor opened at ${baud} baud]`, 'sys');

        // Read loop — per MDN Web Serial best practices
        this._smReadLoop(this._smPort);

      } catch (e) {
        this._smAppendLine(`[Failed to open serial: ${e.message}]`, 'err');
        const statusEl = this._smModal?.querySelector('#__efb-sm-statustext');
        if (statusEl) statusEl.textContent = 'Connection failed';
      }
    }

    async _smReadLoop(port) {
      const decoder = new TextDecoder();
      let buffer = '';

      while (port.readable && this._serialReading) {
        try {
          this._smReader = port.readable.getReader();
          while (this._serialReading) {
            const { value, done } = await this._smReader.read();
            if (done) break;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop();
              for (const line of lines) {
                if (line.trim() !== '') {
                  this._smAppendLine(line.replace(/\r$/, ''), 'rx');
                }
              }
            }
          }
        } catch (e) {
          if (this._serialReading) {
            this._smAppendLine(`[Read error: ${e.message}]`, 'err');
          }
        } finally {
          try { this._smReader?.releaseLock(); } catch (_) {}
          this._smReader = null;
        }
        if (!this._serialReading) break;
        await new Promise(r => setTimeout(r, 200));
      }

      if (buffer.trim()) this._smAppendLine(buffer, 'rx');
    }

    async _stopSerialReadLoop() {
      this._serialReading = false;
      try {
        if (this._smWriter) {
          await this._smWriter.close().catch(() => {});
          this._smWriter.releaseLock();
          this._smWriter = null;
        }
      } catch (_) {}
      // Cancel the stored reader (not a new one — avoids ReadableStream locked error)
      try {
        if (this._smReader) {
          await this._smReader.cancel().catch(() => {});
          this._smReader.releaseLock();
          this._smReader = null;
        }
      } catch (_) {}
      // Small delay for Web Serial to settle before closing
      await new Promise(r => setTimeout(r, 50));
      try {
        if (this._smPort?.readable) {
          await this._smPort.close().catch(() => {});
        }
      } catch (_) {}
    }

    async _closeSerialMonitor() {
      if (this._onSmKeyDown) {
        window.removeEventListener('keydown', this._onSmKeyDown);
        this._onSmKeyDown = null;
      }
      this._serialMonitorOpen = false;
      await this._stopSerialReadLoop();
      this._smPort = null;
      if (this._smOverlay) { this._smOverlay.remove(); this._smOverlay = null; }
      this._smModal = null;
      // Restore the main modal overlay visibility
      if (this._overlay) this._overlay.style.display = '';
      // Restore :root data-theme
      delete document.documentElement.dataset.theme;
      if (this._savedRootTheme) document.documentElement.dataset.theme = this._savedRootTheme;
    }

    async _stopSerialMonitor() {
      if (this._serialMonitorOpen) await this._closeSerialMonitor();
    }

    // ── Show error state ─────────────────────────────────────────
    _showError(title, message, hints = []) {
      this._isFlashing = false;
      if (this._defaultBtn) this._defaultBtn.classList.remove('loading');

      this._setStatusDot('red', `<strong>Error</strong> — ${this._esc(title)}`);
      this._setTitle('Installation failed', '');

      const body = this._modal?.querySelector('#__efb-body');
      if (body) {
        const errEl = body.querySelector('#__efb-errbox');
        if (errEl) {
          errEl.style.display = 'block';
          errEl.innerHTML = `
            <div class="__efb-errtitle">${this._esc(title)}</div>
            <div>${this._esc(message)}</div>
            ${hints.length ? `<div class="__efb-errhints">${hints.map(h => `<div class="__efb-errhint">${this._esc(h)}</div>`).join('')}</div>` : ''}
          `;
        }
      }

      this._setFooterBtns(`
        <button class="__efb-btn ghost" id="__efb-btn-close-err">Close</button>
        <button class="__efb-btn safe-btn" id="__efb-btn-retry-safe" title="Retry with safe 115200 baud for maximum hardware stability">${ICONS.bolt} Safe 115.2k Retry</button>
        <button class="__efb-btn primary" id="__efb-btn-retry-err">${ICONS.refresh} Try Again</button>
      `);
      this._footerBtns?.querySelector('#__efb-btn-close-err')?.addEventListener('click', () => this._closeModal());
      this._footerBtns?.querySelector('#__efb-btn-retry-err')?.addEventListener('click', async () => {
        await this._cleanupConnection();
        this._showReadyPanel();
      });
      this._footerBtns?.querySelector('#__efb-btn-retry-safe')?.addEventListener('click', async () => {
        this._userBaud = 115200;
        await this._cleanupConnection();
        this._showReadyPanel();
        this._log('warn', '⚠ Safe Mode: Flash speed set to 115200 baud for maximum compatibility.');
      });

      this.dispatchEvent(new CustomEvent('flash-error', {
        detail: { title, message },
        bubbles: true, composed: true,
      }));
    }

    // ── Status dot ───────────────────────────────────────────────
    _setStatusDot(color, textHtml) {
      const dot  = this._modal?.querySelector('#__efb-sdot');
      const text = this._modal?.querySelector('#__efb-stxt');
      if (dot)  dot.className = '__efb-sdot' + (color ? ` ${color}` : '');
      if (text) text.innerHTML = textHtml;
    }

    // ── Cleanup ──────────────────────────────────────────────────
    async _cleanupNow() {
      this._abortFlash = true;
      this._isFlashing = false;
      try {
        if (this._transport) { await this._transport.disconnect().catch(() => {}); this._transport = null; }
        if (this._port?.readable || this._port?.writable) await this._port.close().catch(() => {});
      } catch (e) {
        console.warn('ESP Flash Button cleanup:', e);
      }
      this._port = null;
    }

    async _cleanupConnection() {
      await this._cleanupNow();
      this._chipDetected    = null;
      this._macDetected     = null;
      this._flashSizeDetected = null;
      this._logLines        = [];
      this._eraseEnabled    = null;
      if (this._defaultBtn) this._defaultBtn.classList.remove('loading');
    }

    // ── HTML escape ──────────────────────────────────────────────
    _esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  }

  // ── Register custom element ────────────────────────────────────
  if (!customElements.get(COMPONENT_TAG)) {
    customElements.define(COMPONENT_TAG, EspFlashButton);
  }

})();