import fs from "fs";
import path from "path";

const routes = [
  "api/cron/whatsapp",
  "api/cron/send-scheduled-sms",
  "api/cron/ivr-dial",
  "api/events",
  "api/ivr/config",
  "api/ivr/preview",
  "api/ivr/schedule",
  "api/kosher-calls",
  "api/marketing/rsvp-calls-demo",
  "api/telnyx/ivr/webhook",
  "api/telnyx/voice/webhook",
  "api/employee-agreements/sign",
  "api/employee-agreements/preview",
  "api/employee-agreement-templates/save",
  "api/invitations/[id]",
  "api/admin/users/[id]/ivr-rounds",
];

function measure(route) {
  const nftPath = path.join(".next", "server", "app", route, "route.js.nft.json");
  if (!fs.existsSync(nftPath)) return { route, missing: true };
  const j = JSON.parse(fs.readFileSync(nftPath, "utf8"));
  const base = path.dirname(nftPath);
  let total = 0;
  let tmp = 0;
  let pubVideos = 0;
  let ffmpeg = 0;
  let other = 0;
  const big = [];
  for (const f of j.files || []) {
    const abs = path.resolve(base, f);
    let size = 0;
    try {
      size = fs.statSync(abs).size;
    } catch {
      continue;
    }
    total += size;
    const norm = f.replace(/\\/g, "/");
    if (norm.includes("/tmp/") || norm.includes("\\tmp\\")) tmp += size;
    else if (
      norm.includes("/public/videos") ||
      norm.includes("/public/marketing/videos") ||
      norm.includes("/public/marketing/luxury")
    )
      pubVideos += size;
    else if (norm.includes("ffmpeg")) ffmpeg += size;
    else other += size;
    if (size > 5_000_000) big.push({ mb: +(size / 1e6).toFixed(2), f: norm });
  }
  big.sort((a, b) => b.mb - a.mb);
  return {
    route,
    files: (j.files || []).length,
    totalMB: +(total / 1e6).toFixed(2),
    tmpMB: +(tmp / 1e6).toFixed(2),
    pubVideosMB: +(pubVideos / 1e6).toFixed(2),
    ffmpegMB: +(ffmpeg / 1e6).toFixed(2),
    otherMB: +(other / 1e6).toFixed(2),
    big: big.slice(0, 8),
  };
}

const rows = routes.map(measure);
console.log(JSON.stringify(rows, null, 2));
const present = rows.filter((r) => !r.missing);
console.log(
  "SUMMARY",
  JSON.stringify({
    routesMeasured: present.length,
    maxTotalMB: Math.max(...present.map((r) => r.totalMB)),
    sumTotalMB: +present.reduce((s, r) => s + r.totalMB, 0).toFixed(2),
    anyTmp: present.some((r) => r.tmpMB > 0),
    anyPubVideos: present.some((r) => r.pubVideosMB > 0),
  })
);
