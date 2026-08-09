import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("files DELETE destroys Cloudinary asset and requires files.delete", () => {
  const src = read("app/api/venues/dashboard/halls/[hallId]/files/route.ts");
  assert.match(src, /deleteVenueFileFromCloudinary/);
  assert.match(src, /files\.delete/);
  assert.match(src, /writeVenueAudit/);
  assert.match(src, /export async function POST/);
});

test("hall image replace cleans previous Cloudinary asset", () => {
  const src = read("app/api/venues/dashboard/halls/[hallId]/image/route.ts");
  assert.match(src, /deleteVenueFileFromCloudinary/);
  assert.match(src, /previousFiles/);
});

test("backfill script never invents Events and has dry-run buckets", () => {
  const src = read("scripts/venues/backfill-venue-event-links.ts");
  assert.match(src, /NEVER invent/);
  assert.match(src, /safe_to_link/);
  assert.match(src, /ambiguous/);
  assert.match(src, /no_matching_event/);
  assert.match(src, /conflict_linked_elsewhere/);
  assert.doesNotMatch(src, /@invistimo\.local/);
  assert.doesNotMatch(src, /Event\.create\(/);
});

test("VenueShell includes menus and files nav", () => {
  const src = read("components/venues/VenueShell.tsx");
  assert.match(src, /menus/);
  assert.match(src, /קבצים \/ חוזים/);
  assert.match(src, /router\.refresh/);
});

test("status source of truth exports style helpers", () => {
  const src = read("lib/venues/statuses.ts");
  assert.match(src, /VENUE_EVENT_STATUS_STYLES/);
  assert.match(src, /VENUE_LEAD_STATUS_LABELS/);
  assert.match(src, /getVenueEventStatusStyle/);
});

test("seating templates use requireVenueAccess", () => {
  const src = read("app/api/venues/dashboard/seating-templates/route.ts");
  assert.match(src, /requireVenueAccess/);
  assert.match(src, /seating\.view/);
  assert.match(src, /seating\.edit/);
  assert.match(src, /writeVenueAudit/);
});

test("orphan seating-templates dead auth routes removed", () => {
  assert.equal(
    fs.existsSync(
      path.join(root, "app/venues/dashboard/seating-templates/route.ts")
    ),
    false
  );
  assert.equal(
    fs.existsSync(
      path.join(
        root,
        "app/venues/dashboard/seating-templates/[templateId]/route.ts"
      )
    ),
    false
  );
});

test("employees revoke action bumps authVersion", () => {
  const src = read(
    "app/api/venues/dashboard/halls/[hallId]/employees/route.ts"
  );
  assert.match(src, /action === "revoke"/);
  assert.match(src, /authVersion/);
});

test("preview access docs and smoke script exist", () => {
  assert.equal(fs.existsSync(path.join(root, "docs/venues-preview-access.md")), true);
  assert.equal(
    fs.existsSync(path.join(root, "scripts/venues/preview-smoke.mjs")),
    true
  );
});

test("overview/reports/customers use venueEventsService", () => {
  const overview = read("app/venues/dashboard/halls/[hallId]/page.tsx");
  const reports = read(
    "app/api/venues/dashboard/halls/[hallId]/reports/route.ts"
  );
  const customers = read(
    "app/api/venues/dashboard/halls/[hallId]/customers/route.ts"
  );
  assert.match(overview, /listVenueEventsForHall/);
  assert.match(reports, /listVenueEventsForHall/);
  assert.match(customers, /listVenueEventsForHall/);
});
