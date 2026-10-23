import { createRequire } from "module";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

// Compile with esbuild to CJS then require
execSync(
  `npx --yes esbuild ${path.join(root, "lib/seo/answers.ts")} ${path.join(root, "lib/seo/keywordMap.ts")} --bundle --platform=node --format=cjs --outdir=/tmp/seo-sync --packages=external`,
  { stdio: "inherit", cwd: root }
);

const require = createRequire(import.meta.url);
const answers = require("/tmp/seo-sync/answers.js");
const keywords = require("/tmp/seo-sync/keywordMap.js");
const base = JSON.parse(execSync("git show HEAD:public/answers.json", { encoding: "utf8", cwd: root }));

const out = {
  ...base,
  updated: "2026-10-23",
  volumeNote: keywords.KEYWORD_VOLUME_NOTE || base.volumeNote,
  pageAnswers: answers.PAGE_ANSWERS,
  packageComparison: answers.PACKAGE_COMPARISON || base.packageComparison,
  aiMonitorQuestions: keywords.AI_MONITOR_QUESTIONS,
};

fs.writeFileSync(path.join(root, "public/answers.json"), JSON.stringify(out, null, 2) + "\n");
console.log("synced", Object.keys(answers.PAGE_ANSWERS).length, "answers");
