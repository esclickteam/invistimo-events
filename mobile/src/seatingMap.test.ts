import assert from "node:assert/strict";
import test from "node:test";
import { getTableLayout, parseSeatingTable, tableLabel } from "./seatingMap.ts";

test("round tables get a circular layout with one seat coord per seat", () => {
  const table = parseSeatingTable(
    { id: "t1", name: "שולחן 1", type: "round", seats: 8, x: 100, y: 80 },
    0
  );
  const layout = getTableLayout(table);
  assert.equal(layout.type, "round");
  assert.equal(layout.coords.length, 8);
  assert.ok(layout.radius > 0);
});

test("knight/rectangle tables become banquet", () => {
  const table = parseSeatingTable({ type: "rectangle", seats: 10, name: "אבירים" }, 0);
  assert.equal(table.type, "banquet");
  assert.equal(tableLabel(table), "אבירים");
  assert.equal(getTableLayout(table).coords.length, 10);
});
