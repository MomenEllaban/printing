import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buffer) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makePng(width, height, getPixel) {
  const rowBytes = 1 + width * 4;
  const raw = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    raw[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = getPixel(x, y, width, height);
      raw[pixelOffset] = r;
      raw[pixelOffset + 1] = g;
      raw[pixelOffset + 2] = b;
      raw[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIconPixel(x, y, w, h) {
  // Rounded squircle background
  const rCorner = 7;
  const inCorner =
    (x < rCorner && y < rCorner && (x - rCorner) ** 2 + (y - rCorner) ** 2 > rCorner ** 2) ||
    (x >= w - rCorner && y < rCorner && (x - (w - rCorner - 1)) ** 2 + (y - rCorner) ** 2 > rCorner ** 2) ||
    (x < rCorner && y >= h - rCorner && (x - rCorner) ** 2 + (y - (h - rCorner - 1)) ** 2 > rCorner ** 2) ||
    (x >= w - rCorner && y >= h - rCorner && (x - (w - rCorner - 1)) ** 2 + (y - (h - rCorner - 1)) ** 2 > rCorner ** 2);

  if (inCorner) return [0, 0, 0, 0];

  // Base background: teal-cyan gradient (#0f766e to #0284c7)
  const t = (x + y) / (w + h);
  let red = Math.round(15 * (1 - t) + 2 * t);
  let green = Math.round(118 * (1 - t) + 132 * t);
  let blue = Math.round(110 * (1 - t) + 199 * t);
  let alpha = 255;

  // Border glow
  if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
    return [45, 212, 191, 160];
  }

  // Top sheet feeding in: x in 9..22, y in 5..12
  if (x >= 10 && x <= 21 && y >= 5 && y <= 12) {
    if (y >= 7 && y <= 8 && x >= 12 && x <= 19) {
      return [13, 148, 136, 255]; // Teal header line
    }
    if (y === 10 && x >= 12 && x <= 18) {
      return [148, 163, 184, 255]; // Gray line
    }
    return [255, 255, 255, 255];
  }

  // Printer main body: x in 5..26, y in 13..23
  if (x >= 5 && x <= 26 && y >= 13 && y <= 23) {
    // Top feeder slot
    if (y === 13 && x >= 8 && x <= 23) {
      return [15, 23, 42, 255];
    }
    // Front slot
    if (y === 20 && x >= 7 && x <= 24) {
      return [15, 23, 42, 255];
    }
    // Green power LED
    if (x === 23 && y === 16) {
      return [16, 185, 129, 255];
    }
    // Accent line
    if (x >= 8 && x <= 14 && y === 16) {
      return [15, 118, 110, 255];
    }
    return [241, 245, 249, 255]; // Printer white/light gray
  }

  // Printed sheet emerging: x in 8..23, y in 21..28
  if (x >= 8 && x <= 23 && y >= 21 && y <= 28) {
    // Green check badge on bottom right: cx = 20, cy = 25, r = 3
    if ((x - 20) ** 2 + (y - 25) ** 2 <= 9) {
      // Checkmark tick pixels
      if ((x === 19 && y === 25) || (x === 20 && y === 26) || (x === 21 && y === 24)) {
        return [255, 255, 255, 255];
      }
      return [16, 185, 129, 255];
    }
    // Document text lines
    if (y === 23 && x >= 10 && x <= 16) return [71, 85, 105, 255];
    if (y === 25 && x >= 10 && x <= 15) return [148, 163, 184, 255];
    if (y === 27 && x >= 10 && x <= 14) return [203, 213, 225, 255];
    return [255, 255, 255, 255];
  }

  return [red, green, blue, alpha];
}

const png32 = makePng(32, 32, createIconPixel);

// Build .ico file header + directory entry + png data
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type 1 = icon
icoHeader.writeUInt16LE(1, 4); // 1 image

const icoEntry = Buffer.alloc(16);
icoEntry[0] = 32; // width
icoEntry[1] = 32; // height
icoEntry[2] = 0;  // palette colors
icoEntry[3] = 0;  // reserved
icoEntry.writeUInt16LE(1, 4);  // planes
icoEntry.writeUInt16LE(32, 6); // bit count
icoEntry.writeUInt32LE(png32.length, 8); // image bytes
icoEntry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

const icoFile = Buffer.concat([icoHeader, icoEntry, png32]);

fs.writeFileSync(path.resolve("src/app/favicon.ico"), icoFile);
fs.writeFileSync(path.resolve("public/favicon.ico"), icoFile);
console.log("Successfully generated src/app/favicon.ico and public/favicon.ico! Size:", icoFile.length, "bytes");

