#!/usr/bin/env node
/**
 * Acceptance smoke tests against a running server (default http://localhost:3010)
 */
import { createHash, randomBytes } from "crypto";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = process.env.APP_URL || "http://localhost:3010";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

let passed = 0;
let failed = 0;
const cookieJar = new Map();

function noteCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    cookieJar.set(k, v);
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(method, urlPath, { json, headers, body, raw } = {}) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(cookieJar.size ? { Cookie: cookieHeader() } : {}),
      ...headers,
    },
    body: raw ?? (json ? JSON.stringify(json) : body),
  });
  noteCookies(res);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { res, data };
}

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function tinyJpeg() {
  // 1x1 pixel jpeg
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAAFBgAEBwIDCJH/xAA2EAABAwMCBAMFBQEAAAAAAAAAAQIDBAURBiExEkFRBxNhcYEikbHBFDKh0fAVQmLh/8QAGQEAAwEBAQAAAAAAAAAAAAAAAQIDBAAF/8QAHxEAAgIDAQADAQAAAAAAAAAAAAECEQMhEjFBUQQi/9oADAMBAAIRAxEAPwC1RRRUggooooAKKKKACiiigD//2Q==",
    "base64"
  );
}

async function main() {
  console.log(`Acceptance against ${BASE}\n`);

  // Health: marketing
  {
    const { res } = await req("GET", "/");
    assert(res.ok, "Marketing page loads");
  }

  // Login owner
  {
    const { res, data } = await req("POST", "/api/auth/login", {
      json: { email: "owner@album.local", password: "OwnerDemo!23" },
    });
    assert(res.ok && data.ok, "Owner login");
  }

  // Tenants + events
  let eventId;
  let slug = "mia-alon-wedding";
  {
    const { data } = await req("GET", "/api/portal/tenants");
    assert(data.ok && data.data.tenants.length >= 1, "Owner has tenant");
    const { data: ev } = await req("GET", "/api/portal/events");
    assert(ev.ok && ev.data.events.length >= 1, "Owner has events");
    const demo = ev.data.events.find((e) => e.slug === slug) || ev.data.events[0];
    eventId = demo.id;
    slug = demo.slug;
  }

  // Public album
  {
    const { res, data } = await req("GET", `/api/public/album/${slug}`);
    assert(res.ok && data.ok, "Public album API");
    assert(typeof data.data.canUpload === "boolean", "canUpload flag present");
    assert(data.data.event.faceAiAvailable === false, "Face AI not falsely live");
  }

  // Change upload mode to EVERYONE then upload as guest (clear cookies for guest)
  {
    await req("PATCH", `/api/portal/events/${eventId}`, {
      json: { uploadMode: "EVERYONE", requireApproval: true },
    });
    // keep owner cookie for now — upload still allowed under EVERYONE
  }

  // Multipart upload
  {
    const file = tinyJpeg();
    const checksum = createHash("sha256").update(file).digest("hex");
    const init = await req("POST", "/api/upload/init", {
      json: {
        eventId,
        fileName: `accept-${randomBytes(4).toString("hex")}.jpg`,
        mimeType: "image/jpeg",
        totalBytes: file.length,
        checksumSha256: checksum,
      },
    });
    assert(init.data.ok, `Upload init (${init.data.error || "ok"})`);
    if (init.data.ok && !init.data.data.duplicate) {
      const { uploadId, uploadToken, mediaId } = init.data.data;
      const chunk = await req("PUT", "/api/upload/chunk", {
        headers: {
          "x-upload-id": uploadId,
          "x-upload-token": uploadToken,
          "x-upload-offset": "0",
          "Content-Type": "application/octet-stream",
        },
        raw: file,
      });
      assert(chunk.data.ok, "Upload chunk");
      const complete = await req("POST", "/api/upload/complete", {
        json: { uploadId, uploadToken },
      });
      assert(complete.data.ok, `Upload complete → ${complete.data.data?.status}`);
      // Approve
      const mod = await req("PATCH", `/api/portal/events/${eventId}/media`, {
        json: { action: "approve", mediaIds: [mediaId] },
      });
      assert(mod.data.ok, "Approve media");
      const album = await req("GET", `/api/public/album/${slug}`);
      assert(
        album.data.data.media.some((m) => m.id === mediaId),
        "Approved media appears in gallery"
      );

      // Delete cascade
      const del = await req("PATCH", `/api/portal/events/${eventId}/media`, {
        json: { action: "delete", mediaIds: [mediaId] },
      });
      assert(del.data.ok, "Delete media");
    }
  }

  // Permission enforcement: OWNERS_ONLY blocks anonymous
  {
    await req("PATCH", `/api/portal/events/${eventId}`, {
      json: { uploadMode: "OWNERS_ONLY" },
    });
    cookieJar.clear();
    const file = tinyJpeg();
    const init = await req("POST", "/api/upload/init", {
      json: {
        eventId,
        fileName: "guest-blocked.jpg",
        mimeType: "image/jpeg",
        totalBytes: file.length,
      },
    });
    assert(init.res.status === 403 || init.data.ok === false, "Guest blocked when OWNERS_ONLY");
  }

  // Re-login owner, restore EVERYONE
  {
    await req("POST", "/api/auth/login", {
      json: { email: "owner@album.local", password: "OwnerDemo!23" },
    });
    await req("PATCH", `/api/portal/events/${eventId}`, {
      json: { uploadMode: "EVERYONE" },
    });
  }

  // Greeting
  {
    cookieJar.clear();
    const g = await req("POST", `/api/public/album/${slug}/greetings`, {
      json: { authorName: "אורח בדיקה", body: "מזל טוב!" },
    });
    assert(g.data.ok, "Guestbook greeting create");
  }

  // QR
  {
    const r2 = await fetch(`${BASE}/api/public/qr/${slug}`);
    const ct = r2.headers.get("content-type") || "";
    const buf = Buffer.from(await r2.arrayBuffer());
    const body = buf.toString("utf8");
    assert(r2.status === 200, "QR endpoint");
    assert(ct.includes("svg") && body.includes("ALBUM"), "QR returns SVG");
  }

  // Face search not fake-active
  {
    const face = await req("POST", `/api/public/album/${slug}/face-search`, {
      json: { consentAccepted: true, consentTextVersion: "v1" },
    });
    assert(face.res.status === 503 || face.data.ok === false, "Face search refuses when not live");
  }

  // Admin login
  {
    cookieJar.clear();
    const { data } = await req("POST", "/api/auth/login", {
      json: { email: "admin@album.local", password: "AlbumAdmin!23" },
    });
    assert(data.ok && data.data.user.role === "SUPER_ADMIN", "Admin login");
    const ov = await req("GET", "/api/admin/overview");
    assert(ov.data.ok, "Admin overview");
  }

  // Tenant isolation: register second user, try access first event
  {
    cookieJar.clear();
    const email = `iso-${Date.now()}@album.local`;
    await req("POST", "/api/auth/register", {
      json: { name: "Iso User", email, password: "IsoTest!234", tenantName: "Iso Tenant" },
    });
    const forbidden = await req("GET", `/api/portal/events/${eventId}`);
    assert(forbidden.res.status === 403 || forbidden.data.ok === false, "Cross-tenant access denied");
  }

  // Docs / architecture file exists
  assert(existsSync(path.join(root, "docs/ARCHITECTURE.md")), "Architecture doc present");
  assert(existsSync(path.join(root, "docs/ACCEPTANCE.md")), "Acceptance doc present");

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
