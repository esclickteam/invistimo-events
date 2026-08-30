import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseMapPin,
  distanceKm,
  geographicQuery,
  pinIsNear,
  placeSearchQuery,
} from "../../lib/mapPinChoice";

const ramatZvi = { lat: 32.5942, lng: 35.3611 };
const netanya = { lat: 32.2764, lng: 34.8582 };

test("Netanya and Ramat Zvi are far enough that a wrong autocomplete pin is rejected", () => {
  assert.ok(distanceKm(ramatZvi, netanya) > 50);
  assert.equal(pinIsNear(netanya, ramatZvi), false);
  assert.equal(pinIsNear(ramatZvi, ramatZvi), true);
});

test("saved pin in the wrong city is replaced by the address pin", () => {
  const pin = chooseMapPin({
    saved: netanya,
    hint: ramatZvi,
    candidates: [netanya],
  });
  assert.deepEqual(pin, ramatZvi);
});

test("saved pin next to the address is kept", () => {
  const garden = { lat: 32.5931, lng: 35.3604 };
  const pin = chooseMapPin({
    saved: garden,
    hint: ramatZvi,
    candidates: [netanya],
  });
  assert.deepEqual(pin, garden);
});

test("Places ranking Netanya first still yields the nearby Ramat Zvi result", () => {
  const garden = { lat: 32.5931, lng: 35.3604 };
  const pin = chooseMapPin({
    saved: null,
    hint: ramatZvi,
    candidates: [netanya, garden],
  });
  assert.deepEqual(pin, garden);
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
