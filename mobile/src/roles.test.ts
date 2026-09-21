import test from "node:test";
import assert from "node:assert/strict";
import {
  homeHref,
  resolveAppExperience,
  userIsWeddingChallengesOnly,
} from "./roles";

test("admin is never sent to the customer shell", () => {
  const experience = resolveAppExperience({ _id: "1", role: "admin", name: "Admin" });
  assert.equal(experience, "admin");
  assert.equal(homeHref(experience), "/(admin)");
});

test("system staff is sent to the employee dashboard", () => {
  const experience = resolveAppExperience({
    _id: "2",
    role: "staff",
    staffType: "general_staff",
    employeeScope: "system",
    isSystemStaff: true,
  });
  assert.equal(experience, "staff");
  assert.equal(homeHref(experience), "/(staff)");
});

test("usher staff stays on the staff dashboard", () => {
  const experience = resolveAppExperience({
    _id: "3",
    role: "staff",
    staffType: "usher_staff",
    employeeScope: "system",
    isUsherStaff: true,
  });
  assert.equal(experience, "staff");
});

test("producer staff is not shown the customer interface", () => {
  const experience = resolveAppExperience({
    _id: "4",
    role: "staff",
    staffType: "producer_staff",
    employeeScope: "producer",
    isProducerStaff: true,
  });
  assert.equal(experience, "producer_staff");
  assert.equal(homeHref(experience), "/(producer-staff)");
});

test("venue owner is sent to halls, not the event-owner app", () => {
  const experience = resolveAppExperience({
    _id: "5",
    role: "venue_owner",
    venueOwner: true,
  });
  assert.equal(experience, "venue");
  assert.equal(homeHref(experience), "/(venue)");
});

test("wedding-challenges-only customers skip the guest dashboard", () => {
  const user = {
    _id: "6",
    role: "user",
    includeWeddingChallenges: true,
    weddingChallengesOnly: true,
  };
  assert.equal(userIsWeddingChallengesOnly(user), true);
  assert.equal(resolveAppExperience(user), "customer_challenges");
});
