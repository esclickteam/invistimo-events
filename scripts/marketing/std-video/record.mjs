/**
 * Record Save the Date marketing animation → webm + poster.
 * Serves public/ + animation HTML, captures frames with Puppeteer, encodes with ffmpeg.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const publicDir = path.join(root, "public");
const outDir = path.join(publicDir, "marketing/videos");
const framesDir = path.join(__dirname, ".frames");
const htmlPath = path.join(__dirname, "index.html");

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 12;
const DURATION_MS = 10500;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath;
    if (urlPath === "/" || urlPath === "/index.html") {
      filePath = htmlPath;
    } else if (urlPath.startsWith("/marketing/")) {
      filePath = path.join(publicDir, urlPath);
    } else {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function main() {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const { server, port } = await startServer();
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-gpu", `--window-size=${WIDTH},${HEIGHT}`],
    defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle0", timeout: 60000 });
    // Warm fonts/images
    await new Promise((r) => setTimeout(r, 800));

    const totalFrames = Math.ceil((DURATION_MS / 1000) * FPS);
    const interval = 1000 / FPS;
    const t0 = Date.now();
    for (let i = 0; i < totalFrames; i++) {
      const target = t0 + i * interval;
      const wait = target - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const file = path.join(framesDir, `frame_${String(i).padStart(4, "0")}.png`);
      await page.screenshot({ path: file, type: "png" });
      if (i % 12 === 0) console.log(`frame ${i}/${totalFrames}`);
    }

    const webm = path.join(outDir, "home-save-the-date.webm");
    const poster = path.join(outDir, "home-save-the-date-poster.jpg");
    const mid = path.join(framesDir, `frame_${String(Math.floor(totalFrames * 0.45)).padStart(4, "0")}.png`);

    await run("ffmpeg", [
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      path.join(framesDir, "frame_%04d.png"),
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "1.2M",
      "-crf",
      "34",
      "-an",
      "-row-mt",
      "1",
      webm,
    ]);
    await run("ffmpeg", ["-y", "-i", mid, "-q:v", "3", poster]);
    console.log("wrote", webm, fs.statSync(webm).size);
    console.log("wrote", poster, fs.statSync(poster).size);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
