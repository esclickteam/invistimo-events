import test from "node:test";
import assert from "node:assert/strict";

import { parseWazeSearchRows } from "../../lib/resolveWazePlace";

test("parseWazeSearchRows keeps named venues and city subtitles", () => {
  const places = parseWazeSearchRows([
    {
      businessName: "שיבולים - גן אירועים",
      city: "רמת צבי",
      street: null,
      number: null,
      location: { lat: 32.598945758239005, lon: 35.42126976965217 },
    },
    {
      businessName: "שיבולים אירועים",
      city: "נתניה",
      street: "הצורן",
      number: "4א",
      location: { lat: 32.287788016, lon: 34.866452753 },
    },
    {
      businessName: "שיבולים - גן אירועים",
      city: "רמת צבי",
      location: { lat: 32.598945758239005, lon: 35.42126976965217 },
    },
  ]);

  assert.equal(places.length, 2);
  assert.equal(places[0].name, "שיבולים - גן אירועים");
  assert.equal(places[0].subtitle, "רמת צבי");
  assert.equal(places[1].subtitle, "הצורן, 4א, נתניה");
});
