import test from "node:test";
import assert from "node:assert/strict";

import { mergeGuestAssignments } from "../../lib/venues/syncSeatingTemplateToLinkedEvents";

const template = [
  { id: "t1", name: "שולחן 1", type: "round", seats: 10, x: 0, y: 0, rotation: 0 },
  { id: "t2", name: "שולחן 2", type: "round", seats: 12, x: 200, y: 0, rotation: 0 },
  { id: "t3", name: "שולחן 3", type: "rect", seats: 8, x: 400, y: 0, rotation: 0 },
];

const clientTables = [
  {
    id: "t1",
    seats: 10,
    x: -86,
    y: -151,
    rotation: 30,
    seatedGuests: [{ guestId: "g1", seatIndex: 0 }],
  },
  { id: "t2", seats: 10, x: 725, y: 376, rotation: 0 },
];

test("template re-sync keeps client positions when layout was customized", () => {
  const merged = mergeGuestAssignments(clientTables, template, {
    keepClientPositions: true,
  });
  const byId = Object.fromEntries(merged.map((t: any) => [t.id, t]));

  assert.deepEqual([byId.t1.x, byId.t1.y, byId.t1.rotation], [-86, -151, 30]);
  assert.deepEqual([byId.t2.x, byId.t2.y], [725, 376]);
  assert.equal(byId.t2.seats, 12, "capacity still follows the template");
  assert.deepEqual([byId.t3.x, byId.t3.y], [400, 0], "new template table uses template position");
  assert.equal(byId.t1.seatedGuests.length, 1, "guest assignments preserved");
});

test("template re-sync uses template positions when client did not customize", () => {
  const merged = mergeGuestAssignments(clientTables, template);
  const byId = Object.fromEntries(merged.map((t: any) => [t.id, t]));

  assert.deepEqual([byId.t1.x, byId.t1.y, byId.t1.rotation], [0, 0, 0]);
  assert.deepEqual([byId.t2.x, byId.t2.y], [200, 0]);
});
