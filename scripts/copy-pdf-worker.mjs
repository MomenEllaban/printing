import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const source = join(process.cwd(), "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destination = join(process.cwd(), "public", "pdf.worker.min.mjs");

if (!existsSync(source)) {
  console.warn("[pdf-worker] pdfjs-dist worker not found, skipping copy");
  process.exit(0);
}

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
console.log("[pdf-worker] copied pdf.worker.min.mjs to public/");
