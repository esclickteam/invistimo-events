import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseMapPin,
  distanceKm,
  geographicQuery,
  pickHintPin,
  pinIsNear,
  placeSearchQuery,
  resultConflictsWithQuery,
} from "../../lib/mapPinChoice";

const garden = {
  lat: 32.5927,
  lng: 35.4143,
  name: "שיבולים גן אירועים",
  address: "שיבולים גן אירועים, רמת צבי, ישראל",
};
const moshav = {
  lat: 32.5915,
  lng: 35.4145,
  name: "רמת צבי",
  address: "רמת צבי, מועצה אזורית הגלבוע, ישראל",
};
const routeSouth = {
  lat: 32.5942,
  lng: 35.3611,
  name: "דרך 722 דרום",
  address: "דרך 722, ישראל",
};
const zikhron = {
  lat: 32.5665,
  lng: 34.9588,
  name: "רמת צבי",
  address: "רמת צבי, זכרון יעקב, ישראל",
};
const netanya = {
  lat: 32.2764,
  lng: 34.8582,
  name: "שיבולים אירועים",
  address: "הצורן 4א, נתניה, ישראל",
};

const query = "שיבולים גן אירועים, רמת צבי, ישראל";

test("Netanya and the Gilboa garden are different cities", () => {
  assert.ok(distanceKm(garden, netanya) > 50);
  assert.equal(pinIsNear(netanya, moshav), false);
  assert.equal(resultConflictsWithQuery(query, netanya.address), true);
  assert.equal(resultConflictsWithQuery(query, zikhron.address), true);
  assert.equal(resultConflictsWithQuery(query, garden.address), false);
});

test("Zikhron Yaakov's Ramat Zvi is not used as the city hint", () => {
  const hint = pickHintPin([zikhron, moshav], query);
  assert.deepEqual(hint, { lat: moshav.lat, lng: moshav.lng });
});

test("named garden beats a road south of the moshav", () => {
  const pin = chooseMapPin({
    saved: routeSouth,
    hint: moshav,
    candidates: [netanya, routeSouth, garden],
    query,
    venueName: "שיבולים גן אירועים",
  });
  assert.deepEqual(pin, { lat: garden.lat, lng: garden.lng });
});

test("saved Netanya pin is not kept when the address is Ramat Zvi", () => {
  const pin = chooseMapPin({
    saved: netanya,
    hint: moshav,
    candidates: [netanya, garden],
    query,
    venueName: "שיבולים גן אירועים",
  });
  assert.deepEqual(pin, { lat: garden.lat, lng: garden.lng });
});

test("geographic query prefers the city address over the venue name", () => {
  const location = {
    name: "שיבולים גן אירועים",
    address: "שיבולים גן אירועים, רמת צבי, ישראל",
  };
  assert.equal(geographicQuery(location), location.address);
  assert.equal(placeSearchQuery(location), location.address);
  assert.equal(
    placeSearchQuery({
      name: "שיבולים גן אירועים",
      address: "רמת צבי, ישראל",
    }),
    "שיבולים גן אירועים, רמת צבי, ישראל"
  );
});
