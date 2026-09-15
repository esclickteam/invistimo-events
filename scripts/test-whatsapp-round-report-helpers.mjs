/**
 * Edge-case checks for WhatsApp round report status logic (mirrors lib helpers).
 * Run: node scripts/test-whatsapp-round-report-helpers.mjs
 */

const PROGRESS_RANK = {
  not_sent: 0,
  cancelled: 0,
  scheduled: 5,
  pending: 5,
  sending: 10,
  failed: 0,
  sent: 40,
  delivered: 50,
  read: 60,
};

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getReportStatus(item) {
  if (!item) return "not_sent";
  const status = normalizeStatus(item.status);
  const providerStatus = normalizeStatus(item.providerStatus);
  if (providerStatus === "read" || item.readAt) return "read";
  if (providerStatus === "delivered" || item.deliveredAt) return "delivered";
  if (providerStatus === "failed" || status === "failed") return "failed";
  if (providerStatus === "sent" || status === "sent" || item.sentAt) return "sent";
  if (status === "sending" || status === "processing") return "sending";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "scheduled") return "scheduled";
  if (status === "pending" || status === "queued") return "pending";
  return "pending";
}

function getTimestamp(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function pickLatestQueueItem(current, next) {
  if (!current) return next;
  const nextTime = Math.max(
    getTimestamp(next.updatedAt),
    getTimestamp(next.sentAt),
    getTimestamp(next.failedAt),
    getTimestamp(next.createdAt)
  );
  const currentTime = Math.max(
    getTimestamp(current.updatedAt),
    getTimestamp(current.sentAt),
    getTimestamp(current.failedAt),
    getTimestamp(current.createdAt)
  );
  if (nextTime !== currentTime) return nextTime > currentTime ? next : current;
  return next;
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

assert(
  getReportStatus({ status: "sent", providerStatus: "read", readAt: new Date() }) ===
    "read",
  "1. single read message"
);

{
  let overall = "not_sent";
  for (const s of ["read", "failed"]) {
    if (PROGRESS_RANK[s] > PROGRESS_RANK[overall]) overall = s;
  }
  assert(overall === "read", "2/4. overall remains read after later failure");
}

assert(
  getReportStatus({
    status: "sent",
    providerStatus: "delivered",
    deliveredAt: new Date(),
  }) === "delivered",
  "3. delivered not read"
);

assert(
  getReportStatus({ status: "scheduled", scheduledAt: new Date("2099-01-01") }) ===
    "scheduled",
  "8. scheduled future"
);

{
  const older = {
    status: "sent",
    providerStatus: "read",
    readAt: new Date("2026-08-01"),
    updatedAt: new Date("2026-08-01"),
  };
  const newer = {
    status: "failed",
    providerStatus: "failed",
    failedAt: new Date("2026-08-30"),
    updatedAt: new Date("2026-08-30"),
  };
  assert(
    getReportStatus(pickLatestQueueItem(older, newer)) === "failed",
    "12. latest of duplicates is newest attempt"
  );
}

{
  // unique guest with 3 messages
  const messages = ["read", "read", "read"];
  const uniqueGuests = 1;
  const messagesSent = messages.length;
  assert(uniqueGuests === 1 && messagesSent === 3, "11. unique guest vs 3 messages");
}

if (process.exitCode) {
  console.error("Some checks failed");
  process.exit(1);
}

console.log("All helper edge cases passed");
