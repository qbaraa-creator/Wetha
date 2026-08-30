/**
 * يولّد أيقونات PWA كملفات PNG حقيقية بلا أي اعتماد خارجي.
 * التشغيل: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'public');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // عمق البت
  header[9] = 6; // RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // نوع المرشح: None
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const COLORS = {
  background: [15, 23, 42, 255],
  green: [29, 158, 77, 255],
  orange: [226, 105, 27, 255],
  red: [214, 45, 45, 255]
};

/** أيقونة المنتج: ثلاثة أشرطة زمنية بألوان الحالات على خلفية داكنة. */
function drawIcon(size, inset) {
  const pixels = Buffer.alloc(size * size * 4);
  const put = (x, y, color) => {
    const index = (y * size + x) * 4;
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = color[3];
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) put(x, y, COLORS.background);
  }

  const scale = 1 - inset * 2;
  const bars = [
    { top: 0.28, color: COLORS.green, start: 0.16, end: 0.62 },
    { top: 0.46, color: COLORS.orange, start: 0.16, end: 0.84 },
    { top: 0.64, color: COLORS.red, start: 0.16, end: 0.5 }
  ];

  for (const bar of bars) {
    const y0 = Math.round((inset + bar.top * scale) * size);
    const y1 = Math.round((inset + (bar.top + 0.12) * scale) * size);
    const x0 = Math.round((inset + bar.start * scale) * size);
    const x1 = Math.round((inset + bar.end * scale) * size);
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        if (x >= 0 && y >= 0 && x < size && y < size) put(x, y, bar.color);
      }
    }
  }

  return encodePng(size, size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  ['favicon.png', 64, 0.06],
  ['icon-180.png', 180, 0.06],
  ['icon-192.png', 192, 0.06],
  ['icon-512.png', 512, 0.06],
  // النسخة القابلة للقص تترك هامشًا آمنًا حول المحتوى.
  ['icon-maskable-512.png', 512, 0.18]
];

for (const [name, size, inset] of outputs) {
  writeFileSync(join(OUT_DIR, name), drawIcon(size, inset));
  console.log(`تم إنشاء ${name} (${size}×${size})`);
}
