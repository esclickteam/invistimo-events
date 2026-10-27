/**
 * Notify IndexNow about specific public URLs.
 * Usage: node scripts/seo/submit-indexnow.mjs https://www.invistimo.com/sitemap.xml
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const keyFile = fs
  .readdirSync(path.join(root, "public"))
  .find((name) => /^[a-f0-9]{32}\.txt$/.test(name));

if (!keyFile) {
  console.error("IndexNow key file is missing");
  process.exit(1);
}

const key = keyFile.slice(0, -4);
const body = fs.readFileSync(path.join(root, "public", keyFile), "utf8").trim();
if (body !== key) {
  console.error("IndexNow key file does not match its name");
  process.exit(1);
}

const urlList = process.argv.slice(2).filter(Boolean);
if (!urlList.length) {
  console.error("Pass at least one absolute https URL");
  process.exit(1);
}

for (const url of urlList) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "www.invistimo.com") {
    console.error(`Refusing non-public URL: ${url}`);
    process.exit(1);
  }
}

const payload = {
  host: "www.invistimo.com",
  key,
  keyLocation: `https://www.invistimo.com/${key}.txt`,
  urlList,
};

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});

const text = await response.text();
console.log(JSON.stringify({ status: response.status, body: text.slice(0, 500), count: urlList.length }));
if (response.status !== 200 && response.status !== 202) {
  process.exit(1);
}
