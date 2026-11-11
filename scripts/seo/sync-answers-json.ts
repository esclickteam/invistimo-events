import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PAGE_ANSWERS, PACKAGE_COMPARISON } from "../../lib/seo/answers";
import {
  AI_MONITOR_QUESTIONS,
  KEYWORD_MAP,
  KEYWORD_VOLUME_NOTE,
} from "../../lib/seo/keywordMap";

const next = {
  site: "https://www.invistimo.com",
  note: "Factual short answers mirrored from public HTML. Not a ranking signal.",
  updated: "2026-11-11",
  volumeNote: KEYWORD_VOLUME_NOTE,
  pageAnswers: PAGE_ANSWERS,
  packageComparison: PACKAGE_COMPARISON,
  aiMonitorQuestions: AI_MONITOR_QUESTIONS,
  keywordMap: KEYWORD_MAP.map((row) => ({
    query: row.query,
    intent: row.intent,
    primaryPath: row.primaryPath,
    supportingPaths: row.supportingPaths,
    volume: row.volume,
    competition: row.competition,
    observation: row.observation,
  })),
};

const out = resolve(process.cwd(), "public/answers.json");
writeFileSync(out, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${Object.keys(PAGE_ANSWERS).length} answers, ${KEYWORD_MAP.length} keywords, ${AI_MONITOR_QUESTIONS.length} AI questions → ${out}`
);
