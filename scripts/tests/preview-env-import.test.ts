import assert from "node:assert/strict";
import { test } from "node:test";

test("route helpers can be imported when preview secrets are absent", async () => {
  await import("../../lib/mongodb");
  await import("../../lib/r2");
  await import("../../lib/lazyStripe");
  await import("../../lib/notifyAdminPurchase");
  const mongodb = await import("../../lib/mongodb");
  await assert.rejects(() => mongodb.default(), /MONGO_URI is not defined/);
});
