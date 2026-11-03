import test from "node:test";
import assert from "node:assert/strict";

import {
  clampLayoutScale,
  computeCanonicalBackgroundRect,
  controlCounterScale,
  fillViewToRect,
  fitViewToBounds,
  getBackgroundRect,
  getContentBounds,
  getSketchDisplayOpacity,
  normalizeBackground,
  preserveWorldCenterOnResize,
  scaleTablesLayout,
  suggestInitialLayoutScale,
  TABLE_BASE_DRAW,
  unionBounds,
} from "../../lib/seating/canvasLayout";

test("normalizeBackground accepts string and object forms", () => {
  assert.deepEqual(normalizeBackground("https://example.com/a.png"), {
    url: "https://example.com/a.png",
    opacity: 0.28,
  });

  const withRect = normalizeBackground({
    url: "https://example.com/a.png",
    opacity: 0.4,
    x: 10,
    y: 20,
    width: 1000,
    height: 500,
  });

  assert.equal(withRect?.url, "https://example.com/a.png");
  assert.equal(withRect?.opacity, 0.4);
  assert.deepEqual(getBackgroundRect(withRect), {
    x: 10,
    y: 20,
    width: 1000,
    height: 500,
  });
});

test("canonical background uses natural size at origin when empty", () => {
  assert.deepEqual(
    computeCanonicalBackgroundRect({
      imageWidth: 2000,
      imageHeight: 1000,
      contentBounds: null,
      preferNaturalOrigin: true,
    }),
    { x: 0, y: 0, width: 2000, height: 1000 }
  );
});

test("legacy url-only background preserves aspect inside content bounds", () => {
  const rect = computeCanonicalBackgroundRect({
    imageWidth: 2000,
    imageHeight: 1000,
    contentBounds: { minX: 0, minY: 0, maxX: 400, maxY: 400 },
    preferNaturalOrigin: false,
  });

  assert.ok(Math.abs(rect.width / rect.height - 2) < 1e-6, "aspect preserved");
  assert.ok(rect.width <= 400 * 1.3 + 1);
  assert.ok(rect.height <= 400 * 1.3 + 1);
});

test("content bounds include sketch so fit does not clip background", () => {
  const bounds = getContentBounds({
    tables: [{ x: 100, y: 100, seats: 10, type: "round", layoutScale: 1 }],
    zones: [],
    background: { url: "x", x: 0, y: 0, width: 3000, height: 2000 },
  });

  assert.ok(bounds);
  // Sketch extents must be included so Fit-to-Screen does not clip the hall plan.
  assert.ok(bounds!.minX <= 0);
  assert.ok(bounds!.minY <= 0);
  assert.equal(bounds!.maxX, 3000);
  assert.equal(bounds!.maxY, 2000);
});

test("fitViewToBounds centers content in viewport", () => {
  const view = fitViewToBounds({
    bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 500 },
    viewportWidth: 1000,
    viewportHeight: 800,
    paddingX: 100,
    paddingY: 100,
    minScale: 0.1,
    maxScale: 2,
  });

  assert.ok(view.scale > 0);
  const worldCenterX = (1000 / 2 - view.x) / view.scale;
  const worldCenterY = (800 / 2 - view.y) / view.scale;
  assert.ok(Math.abs(worldCenterX - 500) < 1e-6);
  assert.ok(Math.abs(worldCenterY - 250) < 1e-6);
});

test("preserveWorldCenterOnResize keeps the same world point centered", () => {
  const before = { x: 100, y: 50, scale: 0.5 };
  const after = preserveWorldCenterOnResize({
    prevWidth: 1000,
    prevHeight: 800,
    nextWidth: 500,
    nextHeight: 400,
    view: before,
  });

  const worldBeforeX = (1000 / 2 - before.x) / before.scale;
  const worldAfterX = (500 / 2 - after.x) / after.scale;
  assert.ok(Math.abs(worldBeforeX - worldAfterX) < 1e-6);
  assert.equal(after.scale, before.scale);
});

test("layoutScale clamp and initial suggestion stay independent of seat count", () => {
  assert.equal(clampLayoutScale(0, 1), 1);
  assert.equal(clampLayoutScale(99, 1), 2.5);
  assert.equal(clampLayoutScale(0.1, 1), 0.2);

  const scale = suggestInitialLayoutScale({
    url: "x",
    x: 0,
    y: 0,
    width: 4000,
    height: 3000,
  });
  assert.ok(scale >= 0.25 && scale <= 3);
});

test("unionBounds merges tables and sketch", () => {
  const bounds = unionBounds([
    { minX: 10, minY: 10, maxX: 20, maxY: 20 },
    { x: 0, y: 0, width: 100, height: 50 },
  ]);
  assert.deepEqual(bounds, {
    minX: 0,
    minY: 0,
    maxX: 100,
    maxY: 50,
  });
});

test("fillViewToRect covers the viewport while preserving aspect", () => {
  const landscape = fillViewToRect({
    rect: { x: 0, y: 0, width: 2400, height: 1400 },
    viewportWidth: 1200,
    viewportHeight: 800,
  });
  const portrait = fillViewToRect({
    rect: { x: 0, y: 0, width: 1000, height: 2000 },
    viewportWidth: 1200,
    viewportHeight: 800,
  });

  // Cover uses max(vw/w, vh/h)
  assert.ok(Math.abs(landscape.scale - 800 / 1400) < 1e-9);
  assert.ok(Math.abs(portrait.scale - 1200 / 1000) < 1e-9);

  const visibleW = 1200 / landscape.scale;
  const visibleH = 800 / landscape.scale;
  assert.ok(visibleW <= 2400 + 1e-6);
  assert.ok(visibleH <= 1400 + 1e-6);
  // At least one axis is fully covered (no empty bands on that axis)
  assert.ok(
    Math.abs(visibleH - 1400) < 1e-6 || Math.abs(visibleW - 2400) < 1e-6
  );
});

test("Fit vs Fill only change camera — table world coords stay fixed", () => {
  const tables = [
    { id: "t1", x: 120, y: 80, rotation: 15, layoutScale: 0.9 },
    { id: "t2", x: 400, y: 220, rotation: 0, layoutScale: 1 },
  ];
  const snapshot = structuredClone(tables);

  const fit = fitViewToBounds({
    bounds: { minX: 0, minY: 0, maxX: 2400, maxY: 1400 },
    viewportWidth: 1200,
    viewportHeight: 800,
    paddingX: 40,
    paddingY: 40,
    minScale: 0.05,
    maxScale: 6,
  });
  const fill = fillViewToRect({
    rect: { x: 0, y: 0, width: 2400, height: 1400 },
    viewportWidth: 1200,
    viewportHeight: 800,
  });

  assert.notEqual(fit.scale, fill.scale);
  assert.deepEqual(tables, snapshot);
});

test("sketch display opacity brightens faint stored values without rewriting them", () => {
  assert.equal(getSketchDisplayOpacity(0.28), 0.58);
  assert.equal(getSketchDisplayOpacity(null), 0.58);
  assert.equal(getSketchDisplayOpacity(0.7), 0.7);
});

test("control size stays constant across zoom while staying in world space", () => {
  for (const camera of [0.2, 1, 2.5, 6]) {
    const screenPx = 26 * controlCounterScale(camera) * camera;
    assert.ok(Math.abs(screenPx - 26) < 1e-6);
  }
});

test("scaling selected tables keeps each center and does not touch others", () => {
  const tables = [
    { id: "a", x: 10, y: 20, rotation: 15, seats: 12, layoutScale: 1, seatedGuests: [{ guestId: "g1" }] },
    { id: "b", x: 80, y: 40, rotation: 0, seats: 10, layoutScale: 1.2 },
    { id: "c", x: 140, y: 90, rotation: 40, seats: 8, layoutScale: 1 },
  ];
  const next = scaleTablesLayout(tables, ["a", "b"], 0.5);
  assert.equal(next[0].x, 10);
  assert.equal(next[0].y, 20);
  assert.equal(next[0].rotation, 15);
  assert.equal(next[0].seats, 12);
  assert.deepEqual(next[0].seatedGuests, [{ guestId: "g1" }]);
  assert.ok(Math.abs(next[0].layoutScale - 0.5) < 1e-9);
  assert.equal(next[1].x, 80);
  assert.equal(next[1].y, 40);
  assert.ok(Math.abs((next[1].layoutScale || 0) - 0.6) < 1e-9);
  assert.equal(next[2].layoutScale, 1);
  assert.ok(TABLE_BASE_DRAW < 0.5);
});
