#!/usr/bin/env node
/**
 * Verify the live Gal & Yonatan invitation after deploy.
 *
 * Opening /api/invite/... should persist a pin server-side when
 * GOOGLE_MAPS_API_KEY is set. A second fetch must return the same pin.
 * Waze must use ll=, never q=, and must not resolve to Netanya.
 * Google Maps must show a readable place label, not bare coordinates.
 */
const SHARE_ID = process.env.INVITE_SHARE_ID || "Ty4ZfA_Owk";
const BASE = (process.env.SITE_URL || "https://www.invistimo.com").replace(
  /\/$/,
  ""
);
const NETANYA = { lat: 32.2764, lng: 34.8582 };
const RAMAT_ZVI = { lat: 32.5915, lng: 35.4145 };

function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function firstText(...values) {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return "";
}

/** Mirror lib/navigationLinks getGoogleMapsLinkForTarget for production checks. */
function buildGoogleMapsLink(location) {
  const label = firstText(
    location.placeName,
    location.name,
    location.formattedAddress,
    location.address
  );
  const placeId = firstText(location.placeId);
  const lat = location.lat;
  const lng = location.lng;

  if (placeId && label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      label
    )}&query_place_id=${encodeURIComponent(placeId)}`;
  }
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      placeId
    )}&query_place_id=${encodeURIComponent(placeId)}`;
  }
  if (label && lat != null && lng != null) {
    return `https://www.google.com/maps/place/${encodeURIComponent(
      label
    )}/@${lat},${lng},17z`;
  }
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lat},${lng}`
    )}`;
  }
  return null;
}

async function fetchInvite() {
  const url = `${BASE}/api/invite/${SHARE_ID}?preview=staff`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`invite HTTP ${res.status}`);
  return res.json();
}

function locationOf(data) {
  return data?.invitation?.location || {};
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

async function main() {
  console.log(`Checking ${BASE}/invite/${SHARE_ID}`);

  const first = await fetchInvite();
  const pin1 = locationOf(first);
  console.log("first fetch", {
    title: first?.invitation?.title,
    location: pin1,
  });

  if (pin1.lat == null || pin1.lng == null) {
    fail("opening the invitation did not complete a pin");
    return;
  }
  ok(`pin present ${pin1.lat},${pin1.lng}`);

  const second = await fetchInvite();
  const pin2 = locationOf(second);
  if (pin2.lat !== pin1.lat || pin2.lng !== pin1.lng) {
    fail(
      `refresh changed the pin from ${pin1.lat},${pin1.lng} to ${pin2.lat},${pin2.lng}`
    );
  } else {
    ok("refresh kept the same pin");
  }

  const waze = `https://waze.com/ul?ll=${pin2.lat},${pin2.lng}&navigate=yes`;
  const google = buildGoogleMapsLink(pin2);
  console.log({ waze, google });

  if (!/[?&]ll=/.test(waze) || /[?&]q=/.test(waze)) {
    fail("expected Waze ll= without q=");
  } else {
    ok("Waze uses ll= without q=");
  }

  if (!google) {
    fail("could not build a Google Maps link");
  } else if (
    /query=\d+\.\d+%2C\d+\.\d+/.test(google) ||
    /query=\d+\.\d+,\d+\.\d+/.test(google)
  ) {
    fail("Google Maps link is still bare coordinates with no place label");
  } else if (google.includes("query_place_id=")) {
    ok("Google Maps uses query_place_id with a place label");
  } else if (
    google.includes("/maps/place/") &&
    google.includes(`@${pin2.lat},${pin2.lng}`)
  ) {
    ok("Google Maps uses a place label pinned to the same coordinates");
  } else {
    fail(`unexpected Google Maps link shape: ${google}`);
  }

  const label = firstText(
    pin2.placeName,
    pin2.name,
    pin2.formattedAddress,
    pin2.address
  );
  if (!label || /^\d+\.\d+/.test(label)) {
    fail("location has no readable place label for Google Maps");
  } else {
    ok(`Google Maps label: ${label}`);
  }

  if (distanceKm({ lat: pin2.lat, lng: pin2.lng }, NETANYA) < 20) {
    fail("pin is in Netanya");
  } else {
    ok("pin is not Netanya");
  }

  if (distanceKm({ lat: pin2.lat, lng: pin2.lng }, RAMAT_ZVI) > 30) {
    fail("pin is not near Ramat Zvi / Gilboa");
  } else {
    ok("pin is near Ramat Zvi");
  }

  process.exit(process.exitCode || 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
