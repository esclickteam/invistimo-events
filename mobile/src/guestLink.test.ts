import assert from "node:assert/strict";
import test from "node:test";
import {
  formatGuestPhone,
  guestLinkWasOpened,
  guestTableLabel,
  matchesGuestLinkOpenFilter,
} from "./guestLink.ts";

test("opened guests match opened filter", () => {
  assert.equal(guestLinkWasOpened({ firstOpenedAt: "2026-09-01", openCount: 1 }), true);
  assert.equal(guestLinkWasOpened({ openCount: 2 }), true);
  assert.equal(guestLinkWasOpened({}), false);
  assert.equal(matchesGuestLinkOpenFilter({ firstOpenedAt: "2026-09-01" }, "opened"), true);
  assert.equal(matchesGuestLinkOpenFilter({}, "notOpened"), true);
});

test("guest phone and table labels match website helpers", () => {
  assert.equal(formatGuestPhone("501234567"), "0501234567");
  assert.equal(formatGuestPhone("050-123-4567"), "0501234567");
  assert.equal(guestTableLabel({ tableName: "שולחן 4" }), "שולחן 4");
  assert.equal(guestTableLabel({ tableNumber: 7 }), "7");
  assert.equal(guestTableLabel({}), "—");
});
