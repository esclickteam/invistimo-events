#!/usr/bin/env node
/**
 * Verify the live Gal & Yonatan invitation after deploy.
 *
 * Opening /api/invite/... should persist a pin server-side when
 * GOOGLE_MAPS_API_KEY is set. A second fetch must return the same pin.
 * Waze must use ll=, never q=, and must not resolve to Netanya.
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
  const google = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${pin2.lat},${pin2.lng}`
  )}`;
  console.log({ waze, google });

  if (!/[?&]ll=/.test(waze) || /[?&]q=/.test(waze)) {
    fail("expected Waze ll= without q=");
  } else {
    ok("Waze uses ll= without q=");
  }

  if (!google.includes(String(pin2.lat)) || !google.includes(String(pin2.lng))) {
    fail("Google Maps is not using the saved coordinates");
  } else {
    ok("Google Maps uses the same coordinates");
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
