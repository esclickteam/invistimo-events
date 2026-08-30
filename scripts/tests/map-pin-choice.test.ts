import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseMapPin,
  distanceKm,
  geographicQuery,
  hintQueries,
  localityQuery,
  pinIsNear,
  placeSearchQuery,
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
const netanya = {
  lat: 32.2764,
  lng: 34.8582,
  name: "שיבולים אירועים",
  address: "הצורן 4א, נתניה, ישראל",
};

test("Netanya and the Gilboa garden are different cities", () => {
  assert.ok(distanceKm(garden, netanya) > 50);
  assert.equal(pinIsNear(netanya, moshav), false);
});

test("the locality query drops the venue name and keeps the town", () => {
  assert.equal(
    localityQuery({
      name: "שיבולים גן אירועים",
      address: "שיבולים גן אירועים, רמת צבי, ישראל",
    }),
    "רמת צבי, ישראל"
  );

  assert.equal(
    localityQuery({ name: "אולמי הירקון", address: "רחוב רוקח 12, תל אביב" }),
    "רחוב רוקח 12, תל אביב"
  );

  assert.equal(
    localityQuery({ name: "רמת צבי", address: "רמת צבי" }),
    "רמת צבי"
  );

  assert.equal(hintQueries(garden)[0], "רמת צבי, ישראל");
});

test("named garden beats a road south of the moshav", () => {
  const pin = chooseMapPin({
    saved: routeSouth,
    hint: moshav,
    candidates: [netanya, routeSouth, garden],
    venueName: "שיבולים גן אירועים",
  });
  assert.equal(pin?.lat, garden.lat);
  assert.equal(pin?.lng, garden.lng);
  assert.equal(pin?.placeName, garden.name);
  assert.equal(pin?.formattedAddress, garden.address);
});

test("a same-named hall in another city is never chosen", () => {
  const pin = chooseMapPin({
    saved: netanya,
    hint: moshav,
    candidates: [netanya, garden],
    venueName: "שיבולים גן אירועים",
  });
  assert.equal(pin?.lat, garden.lat);
  assert.equal(pin?.lng, garden.lng);

  const withoutTheGarden = chooseMapPin({
    saved: netanya,
    hint: moshav,
    candidates: [netanya],
    venueName: "שיבולים גן אירועים",
  });
  assert.deepEqual(withoutTheGarden, { lat: moshav.lat, lng: moshav.lng });
});

test("without a locality anchor no candidate is guessed", () => {
  const pin = chooseMapPin({
    saved: null,
    hint: null,
    candidates: [netanya, garden],
    venueName: "שיבולים גן אירועים",
  });
  assert.equal(pin, null);
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
