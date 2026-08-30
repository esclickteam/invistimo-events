import test from "node:test";
import assert from "node:assert/strict";

import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsLink,
  getWazeLink,
  hasExactCoordinates,
  parseCoord,
  resolveEventLocation,
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
    `https://waze.com/ul?ll=${encodeURIComponent("32.0961,34.7732")}&navigate=yes`
  );
  assert.equal(
    getGoogleMapsEmbedUrl(location, 16),
    `https://www.google.com/maps?q=${encodeURIComponent("32.0961,34.7732")}&z=16&output=embed`
  );
});

test("navigation links fall back to address only when no pin exists", () => {
  const location = { address: "רחוב רוקח 12, תל אביב" };

  assert.equal(hasExactCoordinates(location), false);
  assert.equal(
    getGoogleMapsLink(location),
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      "רחוב רוקח 12, תל אביב"
    )}`
  );
  assert.equal(
    getWazeLink(location),
    `https://waze.com/ul?q=${encodeURIComponent("רחוב רוקח 12, תל אביב")}&navigate=yes`
  );
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
