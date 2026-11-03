import test from "node:test";
import assert from "node:assert/strict";

import {
  chairsStayInside,
  displayedOuter,
  explicitVisualSize,
  fitTableLayout,
  resolveDefaultVisualSize,
} from "../../lib/seating/tableVisual";
import { normalizeBackground } from "../../lib/seating/canvasLayout";

const guest = [{ guestId: "g1", seatIndex: 0 }];

test("opening a saved table does not invent a visual size or move it", () => {
  const saved = {
    id: "t1",
    x: 120,
    y: -40,
    rotation: 15,
    seats: 12,
    capacity: 12,
    type: "round",
    layoutScale: 1,
    seatedGuests: guest,
  };

  assert.equal(explicitVisualSize(saved), null);
  const before = displayedOuter(saved);
  const after = displayedOuter({ ...saved });
  assert.equal(after, before);
  assert.equal(saved.x, 120);
  assert.equal(saved.seatedGuests.length, 1);
});

test("a new 12-seat and 20-seat table share one visual size", () => {
  const size = resolveDefaultVisualSize({
    url: "hall.png",
    x: 0,
    y: 0,
    width: 4000,
    height: 2200,
  });
  const lowRes = resolveDefaultVisualSize({
    url: "hall.png",
    x: 0,
    y: 0,
    width: 800,
    height: 440,
  });

  const wide = fitTableLayout({ seats: 12, type: "round" }, size);
  const crowded = fitTableLayout({ seats: 20, type: "round" }, size);
  assert.equal(wide.outerWidth, crowded.outerWidth);
  assert.equal(wide.outerHeight, crowded.outerHeight);
  assert.ok(chairsStayInside(wide));
  assert.ok(crowded.compact || chairsStayInside(crowded));
  assert.ok(Math.abs(size / 2200 - lowRes / 440) < 1e-9);
});

test("changing seats does not change an explicit visual size", () => {
  const size = 140;
  const before = fitTableLayout({ seats: 8, type: "square" }, size);
  const after = fitTableLayout({ seats: 16, type: "square" }, size);
  assert.equal(before.outerWidth, after.outerWidth);
  assert.equal(before.outerHeight, after.outerHeight);
});

test("calibration is kept on the background and legacy tables stay untouched", () => {
  const bg = normalizeBackground({
    url: "https://example.com/hall.png",
    x: 0,
    y: 0,
    width: 2000,
    height: 1000,
    defaultVisualSize: 96,
  });
  assert.equal(bg?.defaultVisualSize, 96);
  assert.equal(resolveDefaultVisualSize(bg), 96);

  const legacy = { id: "old", x: 10, y: 20, seats: 10, type: "round", layoutScale: 1, seatedGuests: guest };
  const resized = { ...legacy, visualSize: 96 };
  assert.notEqual(displayedOuter(legacy), displayedOuter(resized));
  assert.equal(legacy.x, 10);
  assert.equal(legacy.seatedGuests[0].guestId, "g1");
});
