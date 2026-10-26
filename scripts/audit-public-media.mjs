#!/usr/bin/env node
/**
 * Scan public marketing sources for image/video references and duplicates.
 * Output: docs/seo/public-video-policy/MEDIA-INVENTORY.json
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const SCAN_DIRS = [
  "app/(marketing)",
  "app/HomePageClient.tsx",
  "components/marketing",
  "app/seating-explained",
  "app/wedding-website",
  "app/components/event/EventManagementPage.jsx",
  "app/event-management",
  "app/pricing",
  "app/contact",
  "app/faq",
  "app/credit-gifts",
  "lib/seo/guides.ts",
  "lib/seo/services.ts",
];

const MEDIA_RE =
  /(?:src|poster|href)=["'`](\/(?:images|marketing|videos|og)[^"'`]+)["'`]|["'`](\/(?:images|marketing|videos)[^"'`]+\.(?:webp|jpg|jpeg|png|gif|mp4|webm|svg))["'`]/g;

function walk(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  const st = fs.statSync(abs);
  if (st.isFile()) return [abs];
  const out = [];
  for (const name of fs.readdirSync(abs)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    out.push(...walk(path.join(rel, name)));
  }
  return out;
}

const files = SCAN_DIRS.flatMap(walk).filter((f) =>
  /\.(tsx|ts|jsx|js|mdx)$/.test(f)
);

/** @type {Map<string, Set<string>>} */
const byAsset = new Map();
/** @type {Map<string, {images:Set<string>, videos:Set<string>}>} */
const byFile = new Map();

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (!byFile.has(rel)) byFile.set(rel, { images: new Set(), videos: new Set() });
  let m;
  const re = new RegExp(MEDIA_RE.source, "g");
  while ((m = re.exec(text))) {
    const asset = m[1] || m[2];
    if (!asset) continue;
    const clean = asset.split("?")[0];
    if (!byAsset.has(clean)) byAsset.set(clean, new Set());
    byAsset.get(clean).add(rel);
    if (/\.(mp4|webm)$/i.test(clean)) byFile.get(rel).videos.add(clean);
    else byFile.get(rel).images.add(clean);
  }
}

const duplicates = [...byAsset.entries()]
  .filter(([, filesSet]) => filesSet.size >= 2)
  .map(([asset, filesSet]) => ({
    asset,
    files: [...filesSet].sort(),
    count: filesSet.size,
  }))
  .sort((a, b) => b.count - a.count);

const missingOnDisk = [...byAsset.keys()].filter((a) => {
  const p = path.join(root, "public", a.replace(/^\//, ""));
  return !fs.existsSync(p);
});

const brandAllow = [
  "/og-invistimo",
  "/logo",
  "/brand",
  "/favicon",
  "/site-",
  "/homep",
];

const crossPageDupes = duplicates.filter(({ asset, files: f }) => {
  if (brandAllow.some((b) => asset.includes(b))) return false;
  // poster reuse with its video is OK-ish; flag still for report
  const pages = new Set(
    f.map((x) =>
      x
        .replace(/\/components\/.*/, "")
        .replace(/\/content\.ts.*/, "")
        .replace(/Page\.tsx.*/, "")
    )
  );
  return pages.size >= 2;
});

const out = {
  generatedAt: new Date().toISOString(),
  scannedFiles: files.length,
  uniqueAssets: byAsset.size,
  missingOnDisk,
  duplicates,
  crossPageDupes,
  byFile: Object.fromEntries(
    [...byFile.entries()].map(([k, v]) => [
      k,
      { images: [...v.images].sort(), videos: [...v.videos].sort() },
    ])
  ),
};

const outPath = path.join(
  root,
  "docs/seo/public-video-policy/MEDIA-INVENTORY.json"
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    {
      scannedFiles: out.scannedFiles,
      uniqueAssets: out.uniqueAssets,
      missingOnDisk: missingOnDisk.length,
      duplicateAssets: duplicates.length,
      crossPageDupes: crossPageDupes.length,
      outPath: path.relative(root, outPath),
    },
    null,
    2
  )
);
