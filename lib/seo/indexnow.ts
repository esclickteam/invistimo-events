import fs from "node:fs";
import path from "node:path";

import { SITE_URL } from "@/lib/seo/site";

/**
 * Known production IndexNow key filename.
 * Reading this fixed path (instead of readdirSync(public/)) keeps Next.js
 * output file tracing from pulling the entire public media tree into
 * Serverless Function bundles.
 */
const KNOWN_KEY_FILE = "a8f2e2e9afb300fbc6da66c9141d945e.txt";

function readKnownKeyFile() {
  const full = path.join(process.cwd(), "public", KNOWN_KEY_FILE);
  const key = KNOWN_KEY_FILE.slice(0, -4);
  const body = fs.readFileSync(full, "utf8").trim();
  if (body !== key) {
    throw new Error("IndexNow key file contents do not match the file name");
  }
  return key;
}

export function indexNowKey() {
  const fromEnv = process.env.INDEXNOW_KEY?.trim();
  if (fromEnv) {
    if (!/^[a-f0-9]{32}$/i.test(fromEnv)) {
      throw new Error("INDEXNOW_KEY must be a 32-char hex string");
    }
    return fromEnv.toLowerCase();
  }
  return readKnownKeyFile();
}

export function indexNowKeyLocation() {
  return `${SITE_URL}/${indexNowKey()}.txt`;
}
