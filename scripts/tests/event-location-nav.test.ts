import test from "node:test";
import assert from "node:assert/strict";

import {
  coordsFromNavUrl,
  getGoogleMapsEmbedUrl,
  getGoogleMapsLink,
  getGoogleMapsLinkForTarget,
  getWazeLink,
  getWazeAppLink,
  getWazeLinkForTarget,
  hasExactCoordinates,
  parseCoord,
  resolveEventLocation,
  resolveNavTarget,
} from "../../lib/navigationLinks";

test("navigation links prefer the exact event coordinates", () => {
  const location = {
    name: "אולמי הירקון",
    address: "רחוב רוקח 12, תל אביב",
    lat: 32.0961,
    lng: 34.7732,
  };

  assert.equal(parseCoord("32.0961"), 32.0961);
  assert.equal(hasExactCoordinates(location), true);
  assert.equal(
    getGoogleMapsLink(location),
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("32.0961,34.7732")}`
  );
  assert.equal(
    getWazeLink(location),
    "https://waze.com/ul?ll=32.0961,34.7732&navigate=yes"
  );
  assert.equal(
    getGoogleMapsEmbedUrl(location, 16),
    "https://www.google.com/maps?q=32.0961,34.7732&z=16&output=embed"
  );
});

test("Waze coordinate links keep a raw comma so the app opens the pin", () => {
  const url = getWazeLink({ lat: 32.5942, lng: 35.3611 });
  assert.equal(url, "https://waze.com/ul?ll=32.5942,35.3611&navigate=yes");
  assert.equal(getWazeAppLink({ lat: 32.5942, lng: 35.3611 }), "waze://?ll=32.5942,35.3611&navigate=yes");
  assert.doesNotMatch(url || "", /%2C/);
});

test("Google Maps and Waze use the same saved coordinates", () => {
  const location = {
    name: "שיבולים גן אירועים",
    address: "רמת צבי, ישראל",
    lat: 32.5927,
    lng: 35.4143,
    placeId: "ChIJGardenRamatZvi",
  };

  assert.equal(
    getGoogleMapsLink(location),
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("32.5927,35.4143")}`
  );
  assert.equal(
    getWazeLink(location),
    "https://waze.com/ul?ll=32.5927,35.4143&navigate=yes"
  );
  assert.doesNotMatch(getWazeLink(location) || "", /[?&]q=/);
});

test("Waze never appends a name search even when the venue has a label", () => {
  const url = getWazeLink({
    name: "שיבולים גן אירועים",
    address: "רמת צבי, ישראל",
    lat: 32.5942,
    lng: 35.3611,
  });
  assert.equal(url, "https://waze.com/ul?ll=32.5942,35.3611&navigate=yes");
  assert.doesNotMatch(url || "", /[?&]q=/);
  assert.equal(
    getWazeAppLink({
      name: "שיבולים גן אירועים",
      address: "רמת צבי, ישראל",
      lat: 32.5942,
      lng: 35.3611,
    }),
    "waze://?ll=32.5942,35.3611&navigate=yes"
  );
});

test("a custom Waze pin is the shared destination for both buttons", () => {
  const location = {
    name: "אולם ישן",
    address: "נתניה",
    lat: 32.2764,
    lng: 34.8582,
  };
  const custom = {
    wazeUrl: "https://waze.com/ul?ll=32.5927,35.4143&navigate=yes",
  };

  const target = resolveNavTarget(location, custom);
  assert.equal(target.source, "custom");
  assert.equal(target.lat, 32.5927);
  assert.equal(target.lng, 35.4143);
  assert.equal(
    getWazeLinkForTarget(target),
    "https://waze.com/ul?ll=32.5927,35.4143&navigate=yes"
  );
  assert.equal(
    getGoogleMapsLinkForTarget(target),
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      "32.5927,35.4143"
    )}`
  );
});

test("saved coordinates beat a text search and stay shared", () => {
  const location = {
    name: "שיבולים גן אירועים",
    address: "רמת צבי, ישראל",
    lat: 32.5927,
    lng: 35.4143,
  };
  const target = resolveNavTarget(location);

  assert.equal(target.source, "coordinates");
  assert.equal(getWazeLink(location), getWazeLinkForTarget(target));
  assert.equal(getGoogleMapsLink(location), getGoogleMapsLinkForTarget(target));
  assert.doesNotMatch(getWazeLink(location) || "", /[?&]q=/);
});

test("coordsFromNavUrl reads a Waze ll and a Google Maps q", () => {
  assert.deepEqual(
    coordsFromNavUrl("https://waze.com/ul?ll=32.5927,35.4143&navigate=yes"),
    { lat: 32.5927, lng: 35.4143 }
  );
  assert.deepEqual(
    coordsFromNavUrl(
      "https://www.google.com/maps/search/?api=1&query=32.5927%2C35.4143"
    ),
    { lat: 32.5927, lng: 35.4143 }
  );
});

test("Waze falls back to an address search when the event has no saved pin", () => {
  const location = {
    name: "שיבולים גן אירועים",
    address: "שיבולים גן אירועים, רמת צבי, ישראל",
  };

  assert.equal(hasExactCoordinates(location), false);
  assert.equal(
    getWazeLink(location),
    `https://waze.com/ul?q=${encodeURIComponent(
      "שיבולים גן אירועים, רמת צבי, ישראל"
    )}&navigate=yes`
  );
  assert.equal(
    getWazeAppLink(location),
    `waze://?q=${encodeURIComponent(
      "שיבולים גן אירועים, רמת צבי, ישראל"
    )}&navigate=yes`
  );
  assert.doesNotMatch(getWazeLink(location) || "", /[?&]ll=/);
  assert.equal(
    getGoogleMapsLink(location),
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      "שיבולים גן אירועים, רמת צבי, ישראל"
    )}`
  );
  assert.doesNotMatch(getGoogleMapsLink(location) || "", /waze/);
});

test("resolved event location uses invitation details before event fallback", () => {
  const resolved = resolveEventLocation(
    {
      location: {
        name: "גן האירועים",
        address: "דרך היין 8, זכרון יעקב",
        lat: "32.5731",
        lng: "34.9552",
      },
    },
    {
      location: {
        name: "מיקום ישן",
        address: "כתובת ישנה",
        lat: 31.5,
        lng: 34.5,
      },
    }
  );

  assert.deepEqual(resolved, {
    name: "גן האירועים",
    address: "דרך היין 8, זכרון יעקב",
    lat: 32.5731,
    lng: 34.9552,
    placeId: "",
  });
});

test("resolved event location keeps invitation address and event pin when needed", () => {
  const resolved = resolveEventLocation(
    {
      location: {
        name: "אולם השמחה",
        address: "הרצל 10, ראשון לציון",
      },
    },
    {
      location: {
        lat: 31.964,
        lng: 34.804,
      },
    }
  );

  assert.equal(resolved.name, "אולם השמחה");
  assert.equal(resolved.address, "הרצל 10, ראשון לציון");
  assert.equal(resolved.lat, 31.964);
  assert.equal(resolved.lng, 34.804);
});
