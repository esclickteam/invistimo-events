import fs from "node:fs";
import path from "node:path";

import { SITE_URL } from "@/lib/seo/site";

const KEY_FILE = /^[a-f0-9]{32}\.txt$/;

export function indexNowKey() {
  const dir = path.join(process.cwd(), "public");
  const names = fs.readdirSync(dir).filter((name) => KEY_FILE.test(name));
  if (names.length !== 1) {
    throw new Error(`Expected one IndexNow key file in public/, found ${names.length}`);
  }
  const key = names[0].slice(0, -4);
  const body = fs.readFileSync(path.join(dir, names[0]), "utf8").trim();
  if (body !== key) {
    throw new Error("IndexNow key file contents do not match the file name");
  }
  return key;
}

export function indexNowKeyLocation() {
  return `${SITE_URL}/${indexNowKey()}.txt`;
}
