import test from "node:test";
import assert from "node:assert/strict";

import {
  decideMissingPinWrite,
  isPlausibleGuestEventPin,
  isValidWorldPin,
} from "../../lib/guestPinWrite";
import { readFileSync } from "node:fs";
import path from "node:path";

const ramatZvi = { lat: 32.5927, lng: 35.4143 };
const netanya = { lat: 32.2764, lng: 34.8582 };

test("world pin validation rejects empty, zero and out-of-range values", () => {
  assert.equal(isValidWorldPin(null, null), null);
  assert.equal(isValidWorldPin(0, 0), null);
  assert.equal(isValidWorldPin(91, 35), null);
  assert.equal(isValidWorldPin(32, 200), null);
  assert.deepEqual(isValidWorldPin("32.5927", "35.4143"), ramatZvi);
});

test("guest pins outside Israel are treated as implausible", () => {
  assert.equal(isPlausibleGuestEventPin(ramatZvi), true);
  assert.equal(isPlausibleGuestEventPin(netanya), true);
  assert.equal(isPlausibleGuestEventPin({ lat: 40.71, lng: -74.01 }), false);
});

test("an existing pin is never overwritten", () => {
  const decision = decideMissingPinWrite({
    existing: ramatZvi,
    guest: netanya,
    server: netanya,
  });
  assert.deepEqual(decision, { action: "keep", pin: ramatZvi });
});

test("only the server geocode is written, never the guest pin", () => {
  const fill = decideMissingPinWrite({
    existing: null,
    guest: netanya,
    server: ramatZvi,
  });
  assert.deepEqual(fill, { action: "fill", pin: ramatZvi });

  const noServer = decideMissingPinWrite({
    existing: null,
    guest: ramatZvi,
    server: null,
  });
  assert.deepEqual(noServer, { action: "reject", error: "NO_SERVER_PIN" });
});

test("server geocoding never reads the public browser key", () => {
  const resolveMapPin = readFileSync(
    path.join(process.cwd(), "lib/resolveMapPin.ts"),
    "utf8"
  );
  const serverKey = readFileSync(
    path.join(process.cwd(), "lib/googleMapsServerKey.ts"),
    "utf8"
  );
  assert.match(serverKey, /GOOGLE_MAPS_API_KEY/);
  assert.doesNotMatch(serverKey, /process\.env\.NEXT_PUBLIC_/);
  assert.match(resolveMapPin, /getGoogleMapsServerKey/);
  assert.doesNotMatch(resolveMapPin, /process\.env\.NEXT_PUBLIC_/);
});
