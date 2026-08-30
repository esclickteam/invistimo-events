import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPreRsvpMessagesSet,
  preRsvpModeFromFlags,
  readPreRsvpFlags,
  shouldGrantPreRsvpInvitation,
} from "../../lib/preRsvp/entitlement";

test("pre-RSVP mode follows the two admin flags", () => {
  assert.equal(preRsvpModeFromFlags(false, false), "none");
  assert.equal(preRsvpModeFromFlags(true, false), "save_the_date_only");
  assert.equal(preRsvpModeFromFlags(false, true), "invitation_only");
  assert.equal(preRsvpModeFromFlags(true, true), "both");
});

test("opening invitation sending does not wipe an existing Save The Date flag", () => {
  const current = readPreRsvpFlags({
    salesUpsells: {
      preRsvpMessages: {
        enabled: true,
        mode: "save_the_date_only",
        saveTheDateEnabled: true,
        invitationOnlyEnabled: false,
      },
    },
  });

  const set = buildPreRsvpMessagesSet({
    saveTheDateEnabled: current.saveTheDateEnabled,
    invitationOnlyEnabled: true,
    givenFree: true,
  });

  assert.equal(set["salesUpsells.preRsvpMessages.enabled"], true);
  assert.equal(set["salesUpsells.preRsvpMessages.mode"], "both");
  assert.equal(set["salesUpsells.preRsvpMessages.saveTheDateEnabled"], true);
  assert.equal(
    set["salesUpsells.preRsvpMessages.invitationOnlyEnabled"],
    true
  );
  assert.equal(set["salesUpsells.preRsvpMessages.givenFree"], true);
});

test("a locked package with no upsell stays closed until invitation is granted", () => {
  const flags = readPreRsvpFlags({
    salesUpsells: {
      preRsvpMessages: {
        enabled: false,
        mode: "none",
      },
    },
  });

  assert.equal(flags.enabled, false);
  assert.equal(flags.invitationOnlyEnabled, false);

  const set = buildPreRsvpMessagesSet({
    saveTheDateEnabled: false,
    invitationOnlyEnabled: true,
    givenFree: true,
  });

  assert.equal(set["salesUpsells.preRsvpMessages.enabled"], true);
  assert.equal(set["salesUpsells.preRsvpMessages.mode"], "invitation_only");
});

test("jonathan.crystal@gmail.com is granted pre-RSVP invitation sending", () => {
  assert.equal(
    shouldGrantPreRsvpInvitation("jonathan.crystal@gmail.com"),
    true
  );
  assert.equal(
    shouldGrantPreRsvpInvitation("Jonathan.Crystal@gmail.com"),
    true
  );
  assert.equal(shouldGrantPreRsvpInvitation("other@example.com"), false);
});

test("admin user editor can toggle pre-RSVP invitation sending", () => {
  const fs = require("node:fs") as typeof import("node:fs");
  const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
  const patch = fs.readFileSync("app/api/admin/users/[id]/route.ts", "utf8");
  assert.match(page, /includePreRsvpInvitation/);
  assert.match(page, /שליחת הזמנה מוקדמת/);
  assert.match(patch, /includePreRsvpInvitation/);
  assert.match(patch, /buildPreRsvpMessagesSet/);
});
