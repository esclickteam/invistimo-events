import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import { selectCheckInEventId } from "../../lib/checkIn/findCheckInInvitation";

const root = path.resolve(process.cwd());

test("scan prefers the event that actually has check-in enabled", () => {
  assert.equal(
    selectCheckInEventId({
      preferredEventId: "event-disabled",
      enabledEventIds: ["event-live", "event-other"],
    }),
    "event-live"
  );
  assert.equal(
    selectCheckInEventId({
      preferredEventId: "event-other",
      enabledEventIds: ["event-live", "event-other"],
    }),
    "event-other"
  );
  assert.equal(
    selectCheckInEventId({
      preferredEventId: "",
      enabledEventIds: [],
    }),
    null
  );
});

test("scan routes resolve the enabled event instead of a random primary invitation", () => {
  const finder = fs.readFileSync(
    path.join(root, "lib/checkIn/findCheckInInvitation.ts"),
    "utf8"
  );
  const summary = fs.readFileSync(
    path.join(root, "app/api/check-in/summary/route.ts"),
    "utf8"
  );
  const host = fs.readFileSync(
    path.join(root, "app/dashboard/check-in/CheckInHostClient.tsx"),
    "utf8"
  );

  assert.match(finder, /findEnabledCheckInInvitation/);
  assert.match(finder, /checkInEnabled: true/);
  assert.match(summary, /eventId/);
  assert.match(host, /api\/check-in\/summary/);
  assert.match(host, /eventFromUrl/);
});
