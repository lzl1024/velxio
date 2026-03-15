/**
 * ESP32 Web Components
 *
 * Uses the official wokwi-boards SVG assets for realistic board rendering.
 * Pin positions are derived from board.json definitions (mm × 5 px/mm).
 *
 * Supports three variants via the `board-kind` attribute:
 *   - esp32        → ESP32 DevKit V1      (141 × 265 px)
 *   - esp32-s3     → ESP32-S3 DevKitC-1   (128 × 350 px)
 *   - esp32-c3     → ESP32-C3 DevKitM-1   (127 × 215 px)
 */

import esp32SvgUrl  from '../../../../wokwi-libs/wokwi-boards/boards/esp32-devkit-v1/board.svg?url';
import esp32S3SvgUrl from '../../../../wokwi-libs/wokwi-boards/boards/esp32-s3-devkitc-1/board.svg?url';
import esp32C3SvgUrl from '../../../../wokwi-libs/wokwi-boards/boards/esp32-c3-devkitm-1/board.svg?url';

// ─── Pin positions (mm × 5 px/mm, from board.json) ───────────────────────────

// ESP32 DevKit V1: 28.2 mm × 53 mm → 141 × 265 px
// Left col: x = 1.27 mm → 6 px  |  Right col: x = 26.8 mm → 134 px
const PINS_ESP32 = [
  { name: 'EN',   x:   6, y:  29 },
  { name: 'VN',   x:   6, y:  42 },
  { name: 'VP',   x:   6, y:  54 },
  { name: 'D34',  x:   6, y:  67 },
  { name: 'D35',  x:   6, y:  80 },
  { name: 'D32',  x:   6, y:  93 },
  { name: 'D33',  x:   6, y: 105 },
  { name: 'D25',  x:   6, y: 118 },
  { name: 'D26',  x:   6, y: 131 },
  { name: 'D27',  x:   6, y: 143 },
  { name: 'D14',  x:   6, y: 156 },
  { name: 'D12',  x:   6, y: 169 },
  { name: 'D13',  x:   6, y: 181 },
  { name: 'GND',  x:   6, y: 194 },
  { name: 'VIN',  x:   6, y: 207 },
  { name: '3V3',  x: 134, y: 207 },
  { name: 'GND',  x: 134, y: 194 },
  { name: 'D15',  x: 134, y: 181 },
  { name: 'D2',   x: 134, y: 169 },
  { name: 'D4',   x: 134, y: 156 },
  { name: 'RX2',  x: 134, y: 143 },
  { name: 'TX2',  x: 134, y: 131 },
  { name: 'D5',   x: 134, y: 118 },
  { name: 'D18',  x: 134, y: 105 },
  { name: 'D19',  x: 134, y:  93 },
  { name: 'D21',  x: 134, y:  80 },
  { name: 'RX0',  x: 134, y:  67 },
  { name: 'TX0',  x: 134, y:  54 },
  { name: 'D22',  x: 134, y:  42 },
  { name: 'D23',  x: 134, y:  29 },
];

// ESP32-S3 DevKitC-1: 25.527 mm × 70.057 mm → 128 × 350 px
// Left col: x = 1.343 mm → 7 px  |  Right col: x = 24.19 mm → 121 px
const PINS_ESP32_S3 = [
  { name: '3V3.1', x:   7, y:  38 },
  { name: '3V3.2', x:   7, y:  51 },
  { name: 'RST',   x:   7, y:  64 },
  { name: '4',     x:   7, y:  76 },
  { name: '5',     x:   7, y:  89 },
  { name: '6',     x:   7, y: 102 },
  { name: '7',     x:   7, y: 115 },
  { name: '15',    x:   7, y: 127 },
  { name: '16',    x:   7, y: 140 },
  { name: '17',    x:   7, y: 153 },
  { name: '18',    x:   7, y: 166 },
  { name: '8',     x:   7, y: 178 },
  { name: '3',     x:   7, y: 191 },
  { name: '46',    x:   7, y: 203 },
  { name: '9',     x:   7, y: 216 },
  { name: '10',    x:   7, y: 229 },
  { name: '11',    x:   7, y: 242 },
  { name: '12',    x:   7, y: 254 },
  { name: '13',    x:   7, y: 267 },
  { name: '14',    x:   7, y: 280 },
  { name: '5V',    x:   7, y: 292 },
  { name: 'GND.1', x:   7, y: 305 },
  { name: 'GND.2', x: 121, y:  38 },
  { name: 'TX',    x: 121, y:  51 },
  { name: 'RX',    x: 121, y:  64 },
  { name: '1',     x: 121, y:  76 },
  { name: '2',     x: 121, y:  89 },
  { name: '42',    x: 121, y: 102 },
  { name: '41',    x: 121, y: 115 },
  { name: '40',    x: 121, y: 127 },
  { name: '39',    x: 121, y: 140 },
  { name: '38',    x: 121, y: 153 },
  { name: '37',    x: 121, y: 166 },
  { name: '36',    x: 121, y: 178 },
  { name: '35',    x: 121, y: 191 },
  { name: '0',     x: 121, y: 203 },
  { name: '45',    x: 121, y: 216 },
  { name: '48',    x: 121, y: 229 },
  { name: '47',    x: 121, y: 242 },
  { name: '21',    x: 121, y: 254 },
  { name: '20',    x: 121, y: 267 },
  { name: '19',    x: 121, y: 280 },
  { name: 'GND.3', x: 121, y: 292 },
  { name: 'GND.4', x: 121, y: 305 },
];

// ESP32-C3 DevKitM-1: 25.4 mm × 42.91 mm → 127 × 215 px
// Left col: x = 1 mm → 5 px  |  Right col: x = 24.2 mm → 121 px
const PINS_ESP32_C3 = [
  { name: 'GND.1',  x:   5, y:  26 },
  { name: '3V3.1',  x:   5, y:  39 },
  { name: '3V3.2',  x:   5, y:  51 },
  { name: '2',      x:   5, y:  64 },
  { name: '3',      x:   5, y:  77 },
  { name: 'GND.2',  x:   5, y:  89 },
  { name: 'RST',    x:   5, y: 102 },
  { name: 'GND.3',  x:   5, y: 115 },
  { name: '0',      x:   5, y: 127 },
  { name: '1',      x:   5, y: 140 },
  { name: '10',     x:   5, y: 153 },
  { name: 'GND.4',  x:   5, y: 166 },
  { name: '5V.1',   x:   5, y: 178 },
  { name: '5V.2',   x:   5, y: 191 },
  { name: 'GND.5',  x:   5, y: 204 },
  { name: 'GND.6',  x: 121, y: 204 },
  { name: '19',     x: 121, y: 191 },
  { name: '18',     x: 121, y: 178 },
  { name: 'GND.7',  x: 121, y: 166 },
  { name: '4',      x: 121, y: 153 },
  { name: '5',      x: 121, y: 140 },
  { name: '6',      x: 121, y: 127 },
  { name: '7',      x: 121, y: 115 },
  { name: 'GND.8',  x: 121, y: 102 },
  { name: '8',      x: 121, y:  89 },
  { name: '9',      x: 121, y:  77 },
  { name: 'GND.9',  x: 121, y:  64 },
  { name: 'RX',     x: 121, y:  51 },
  { name: 'TX',     x: 121, y:  39 },
  { name: 'GND.10', x: 121, y:  26 },
];

// ─── Board config by variant ──────────────────────────────────────────────────

interface BoardConfig {
  svgUrl: string;
  w: number;
  h: number;
  pins: { name: string; x: number; y: number }[];
}

const BOARD_CONFIGS: Record<string, BoardConfig> = {
  'esp32':    { svgUrl: esp32SvgUrl,   w: 141, h: 265, pins: PINS_ESP32    },
  'esp32-s3': { svgUrl: esp32S3SvgUrl, w: 128, h: 350, pins: PINS_ESP32_S3 },
  'esp32-c3': { svgUrl: esp32C3SvgUrl, w: 127, h: 215, pins: PINS_ESP32_C3 },
};

// ─── Custom element ───────────────────────────────────────────────────────────

class Esp32Element extends HTMLElement {
  static get observedAttributes() { return ['board-kind']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  private get config(): BoardConfig {
    const kind = this.getAttribute('board-kind') ?? 'esp32';
    return BOARD_CONFIGS[kind] ?? BOARD_CONFIGS['esp32'];
  }

  get pinInfo() {
    return this.config.pins;
  }

  private render() {
    if (!this.shadowRoot) return;
    const { svgUrl, w, h } = this.config;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; line-height: 0; }
        img   { display: block; }
      </style>
      <img
        src="${svgUrl}"
        width="${w}"
        height="${h}"
        draggable="false"
        alt="ESP32 board"
      />
    `;
  }
}

if (!customElements.get('wokwi-esp32')) {
  customElements.define('wokwi-esp32', Esp32Element);
}
