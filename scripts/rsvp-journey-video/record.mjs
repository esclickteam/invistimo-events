/**
 * Records the guest-journey HTML animation into a marketing MP4.
 * Serves workspace root so /images/rsvp/* resolves, then captures with Playwright.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const HTML = join(__dirname, "index.html");
const OUT_DIR = join(ROOT, "public/videos");
const POSTER_DIR = join(ROOT, "public/images/rsvp");
const RAW_DIR = join(__dirname, ".record");
const FINAL_MP4 = join(OUT_DIR, "rsvp-guest-journey.mp4");
const POSTER = join(POSTER_DIR, "rsvp-guest-journey-poster.jpg");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

function contentType(path) {
  return MIME[extname(path).toLowerCase()] || "application/octet-stream";
}

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = decodeURIComponent((req.url || "/").split("?")[0]);
      let filePath;
      if (url === "/" || url === "/journey") {
        filePath = HTML;
      } else if (url.startsWith("/images/") || url.startsWith("/videos/")) {
        filePath = join(ROOT, "public", url);
      } else {
        filePath = join(ROOT, "public", url);
      }
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType(filePath) });
      res.end(readFileSync(filePath));
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(POSTER_DIR, { recursive: true });

const { server, port } = await startServer();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 420, height: 760 },
  deviceScaleFactor: 2,
  recordVideo: { dir: RAW_DIR, size: { width: 420, height: 760 } },
  locale: "he-IL",
});
const page = await context.newPage();
await page.goto(`http://127.0.0.1:${port}/journey`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.body.dataset.done === "1", null, {
  timeout: 60000,
});
await page.waitForTimeout(400);
await context.close();
await browser.close();
server.close();

const webm = spawnSync("bash", ["-lc", `ls -1t '${RAW_DIR}'/*.webm | head -1`], {
  encoding: "utf8",
}).stdout.trim();
if (!webm) {
  console.error("No webm recorded");
  process.exit(1);
}

const tmpMp4 = join(RAW_DIR, "journey-raw.mp4");
const encode = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    webm,
    "-an",
    "-vf",
    "scale=840:1520:flags=lanczos,fps=30",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-crf",
    "23",
    "-movflags",
    "+faststart",
    tmpMp4,
  ],
  { encoding: "utf8" }
);
if (encode.status !== 0) {
  console.error(encode.stderr);
  process.exit(1);
}

copyFileSync(tmpMp4, FINAL_MP4);

spawnSync(
  "ffmpeg",
  ["-y", "-ss", "1.2", "-i", FINAL_MP4, "-frames:v", "1", "-q:v", "3", POSTER],
  { encoding: "utf8" }
);

try {
  unlinkSync(webm);
} catch {}

console.log(JSON.stringify({ mp4: FINAL_MP4, poster: POSTER }, null, 2));
