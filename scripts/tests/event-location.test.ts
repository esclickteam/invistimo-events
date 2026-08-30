import test from "node:test";
import assert from "node:assert/strict";

import {
  locationTextChanged,
  prepareEventLocation,
  toEventLocation,
} from "../../lib/eventLocation";

test("toEventLocation keeps name, address, coords and placeId", () => {
  assert.deepEqual(
    toEventLocation({
      name: "גן האירועים",
      address: "רמת צבי, ישראל",
      lat: "32.59",
      lng: "35.41",
      placeId: "ChIJ123",
      placeName: "גן האירועים",
      formattedAddress: "רמת צבי, ישראל",
    }),
    {
      name: "גן האירועים",
      address: "רמת צבי, ישראל",
      lat: 32.59,
      lng: 35.41,
      placeId: "ChIJ123",
      placeName: "גן האירועים",
      formattedAddress: "רמת צבי, ישראל",
      wazeLat: null,
      wazeLng: null,
      wazeUrl: "",
    }
  );
});

test("a venue text change invalidates the previous pin", () => {
  const previous = {
    name: "אולם ישן",
    address: "תל אביב",
    lat: 32.08,
    lng: 34.78,
    placeId: "old",
  };

  assert.equal(
    locationTextChanged(
      {
        name: "שיבולים גן ארועים",
        address: "שיבולים גן ארועים, רמת צבי, ישראל",
        lat: 32.08,
        lng: 34.78,
        placeId: "",
      },
      previous
    ),
    true
  );

  assert.equal(
    locationTextChanged(
      { name: "אולם ישן", address: "תל אביב", lat: null, lng: null, placeId: "old" },
      previous
    ),
    false
  );
});

test("prepareEventLocation keeps a new pin the client just picked", async () => {
  const prepared = await prepareEventLocation({
    input: {
      name: "שיבולים גן אירועים",
      address: "רמת צבי, ישראל",
      lat: 32.5927,
      lng: 35.4143,
      placeId: "ChIJGarden",
    },
    previous: {
      name: "אולם ישן",
      address: "נתניה",
      lat: 32.2764,
      lng: 34.8582,
      placeId: "old",
    },
  });

  assert.equal(prepared.pinSource, "client");
  assert.equal(prepared.location.lat, 32.5927);
  assert.equal(prepared.location.lng, 35.4143);
  assert.equal(prepared.warning, null);
});

test("prepareEventLocation drops stale coords when only the address changed", async () => {
  const prepared = await prepareEventLocation({
    input: {
      name: "שיבולים גן ארועים",
      address: "שיבולים גן ארועים, רמת צבי, ישראל",
      lat: 32.2764,
      lng: 34.8582,
    },
    previous: {
      name: "שיבולים, ישראל",
      address: "שיבולים, ישראל",
      lat: 32.2764,
      lng: 34.8582,
    },
    geocode: false,
  });

  assert.equal(prepared.textChanged, true);
  assert.equal(prepared.pinSource, "none");
  assert.equal(prepared.location.lat, null);
  assert.equal(prepared.location.lng, null);
});

test("prepareEventLocation keeps the pin when the venue text did not change", async () => {
  const prepared = await prepareEventLocation({
    input: {
      name: "גן האירועים",
      address: "רמת צבי, ישראל",
      lat: null,
      lng: null,
    },
    previous: {
      name: "גן האירועים",
      address: "רמת צבי, ישראל",
      lat: 32.5927,
      lng: 35.4143,
      placeId: "ChIJGarden",
    },
  });

  assert.equal(prepared.pinSource, "kept");
  assert.equal(prepared.location.lat, 32.5927);
  assert.equal(prepared.location.lng, 35.4143);
});

test("prepareEventLocation keeps a Waze entrance when the Google pin is unchanged", async () => {
  const prepared = await prepareEventLocation({
    input: {
      name: "גן האירועים",
      address: "רמת צבי, ישראל",
      lat: 32.591962,
      lng: 35.414497,
      placeId: "ChIJGarden",
    },
    previous: {
      name: "גן האירועים",
      address: "רמת צבי, ישראל",
      lat: 32.591962,
      lng: 35.414497,
      placeId: "ChIJGarden",
      wazeLat: 32.598945758239005,
      wazeLng: 35.42126976965217,
      wazeUrl: "https://waze.com/ul?ll=32.598945758239005,35.42126976965217&navigate=yes",
    },
    geocode: false,
  });

  assert.equal(prepared.location.lat, 32.591962);
  assert.equal(prepared.location.lng, 35.414497);
  assert.equal(prepared.location.wazeLat, 32.598945758239005);
  assert.equal(prepared.location.wazeLng, 35.42126976965217);
});

test("prepareEventLocation keeps a typed Waze name when lookup is skipped", async () => {
  const prepared = await prepareEventLocation({
    input: {
      name: "גן האירועים",
      address: "רמת צבי, ישראל",
      lat: 32.591962,
      lng: 35.414497,
      placeId: "ChIJGarden",
      wazeUrl: "שיבולים - גן אירועים",
    },
    geocode: false,
  });

  assert.equal(prepared.location.lat, 32.591962);
  assert.equal(prepared.location.lng, 35.414497);
  assert.equal(prepared.location.wazeUrl, "שיבולים - גן אירועים");
  assert.equal(prepared.location.wazeLat, null);
  assert.equal(prepared.location.wazeLng, null);
});

test("prepareEventLocation reports a warning when geocoding cannot run", async () => {
  const prepared = await prepareEventLocation({
    input: {
      name: "שיבולים גן ארועים",
      address: "שיבולים גן ארועים, רמת צבי, ישראל",
    },
  });

  assert.equal(prepared.pinSource, "none");
  assert.ok(prepared.warning);
  assert.equal(prepared.warning?.code, "NO_API_KEY");
  assert.match(prepared.warning?.message || "", /יעד שגוי|המפה/);
});
