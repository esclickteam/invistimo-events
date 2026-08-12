/**
 * READ-ONLY Production pre-APPLY proposal for false venueAccessStatus=linked.
 * Never writes. Refuses APPLY.
 *
 *   ALLOW_PROD_READ=1 MONGO_URI=... npx tsx scripts/staging/prod-false-link-pre-apply-proposal.ts
 */
import mongoose from "mongoose";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const uri =
  process.env.MONGO_URI ||
  readFileSync("/tmp/prod-mongo-uri.txt", "utf8").trim();

if (process.env.ALLOW_PROD_READ !== "1") {
  throw new Error("Refusing to run without ALLOW_PROD_READ=1");
}
if (process.env.APPLY === "1") {
  throw new Error("This script is READ-ONLY. APPLY is forbidden here.");
}

function clean(v: unknown) {
  return String(v || "").trim();
}

function asId(v: unknown) {
  if (v == null || v === "") return null;
  return clean(v);
}

const VENUE_META_KEYS = [
  "venueAccessStatus",
  "venueLinkedAt",
  "venueOwnerId",
  "venueHallId",
  "venueHallName",
  "venueClientInvitationId",
  "venueClientEventId",
  "venueClientUserId",
  "venueClientRecordsCount",
  "venueClientPaymentStatus",
  "venueClientInviteToken",
  "venueClientInviteStatus",
  "venueClientInviteSentAt",
  "venueClientInviteUsedAt",
  "venueClientInviteUsedByUserId",
  "venueClientInviteUsedEmail",
  "venueClientInviteLockedAt",
  "venueClientInviteLockedByUserId",
  "venueClientInviteLockedEmail",
  "venueClientInviteExpiresAt",
  "venueClientSelectedSeatingTemplateId",
  "venueClientSelectedSeatingTemplateName",
  "venueClientRegistrationLink",
  "venueClientVenueOwnerId",
  "venueClientVenueHallId",
  "venueClientVenueHallName",
  "venueClientEventTitle",
  "venueClientEventDate",
  "venueClientEventTime",
  "venueClientPackageType",
  "venueClientPaymentSessionId",
  "venueClientStripeSessionId",
  "venueClientPaymentAmount",
  "venueClient",
];

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db!;
  if (db.databaseName !== "invite") {
    throw new Error(`Expected production invite, got ${db.databaseName}`);
  }
  console.log(JSON.stringify({ db: db.databaseName, mode: "READ_ONLY", APPLY: false }));

  const halls = await db.collection("venuehalls").find({}).toArray();
  const hallKeys = new Set<string>();
  for (const h of halls) {
    if (h.id) hallKeys.add(clean(h.id));
    hallKeys.add(clean(h._id));
  }

  const venueEvents = await db.collection("venueevents").find({}).toArray();
  const veByLinked = new Map<string, any>();
  for (const ve of venueEvents) {
    if (ve.linkedEventId) veByLinked.set(clean(ve.linkedEventId), ve);
  }

  const linked = await db
    .collection("events")
    .find({ venueAccessStatus: "linked" })
    .toArray();

  const rows: any[] = [];

  for (const e of linked) {
    const id = clean(e._id);
    const ve = veByLinked.get(id);
    const hallRaw = clean(e.venueHallId);
    const veHall = ve ? clean(ve.hallId || ve.venueId) : "";
    const hallDocExists = Boolean(hallRaw && hallKeys.has(hallRaw));
    const hasVe = Boolean(ve) && clean(ve.linkedEventId) === id;
    const trueLink = hasVe && (hallDocExists || (veHall && hallKeys.has(veHall)));

    const presentVenueFields: Record<string, unknown> = {};
    for (const k of VENUE_META_KEYS) {
      const val = (e as any)[k];
      if (val === undefined || val === null || val === "") continue;
      presentVenueFields[k] =
        val instanceof Date
          ? val.toISOString()
          : typeof val === "object" && val?._bsontype === "ObjectId"
            ? clean(val)
            : val;
      if (
        presentVenueFields[k] &&
        typeof presentVenueFields[k] === "object" &&
        (presentVenueFields[k] as any)._bsontype === "ObjectId"
      ) {
        presentVenueFields[k] = clean(presentVenueFields[k]);
      }
    }

    const invitation = await db.collection("invitations").findOne(
      {
        $or: [
          { eventId: e._id },
          { eventId: id },
          { productionEventId: e._id },
          { linkedEventId: e._id },
        ],
      },
      {
        projection: {
          _id: 1,
          shareId: 1,
          ownerId: 1,
          eventId: 1,
          venueHallId: 1,
          venueOwnerId: 1,
        },
      }
    );

    let guestCount = 0;
    if (invitation?._id) {
      guestCount = await db.collection("invitationguests").countDocuments({
        invitationId: invitation._id,
      });
    }

    let seatingDocId: string | null = null;
    for (const name of ["seatings", "seatingplans", "eventseatings", "seating"]) {
      try {
        const s = await db.collection(name).findOne(
          { $or: [{ eventId: e._id }, { eventId: id }] },
          { projection: { _id: 1 } }
        );
        if (s?._id) {
          seatingDocId = clean(s._id);
          break;
        }
      } catch {
        /* collection may not exist */
      }
    }

    const realVenueEventRelation = hasVe;
    const realLinkedEventId = hasVe;
    // Real VenueHall relation = only with VenueEvent.linkedEventId (deterministic).
    // A hall id string alone is NOT a real venue-suite relation.
    const realVenueHallRelation = Boolean(trueLink);
    const regularEventYes = !trueLink;

    const eligible =
      regularEventYes &&
      !realVenueHallRelation &&
      !realVenueEventRelation &&
      !realLinkedEventId &&
      clean(e.venueAccessStatus) === "linked";

    const otherVenueFields = Object.keys(presentVenueFields).filter(
      (k) => k !== "venueAccessStatus"
    );

    rows.push({
      eventId: id,
      title: e.title || null,
      email: e.email || null,
      userId: asId(e.userId),
      status: e.status || null,
      paymentStatus: e.paymentStatus || null,
      date: e.date || null,
      classification: trueLink ? "TRUE_VENUE_LINK" : "FALSE_VENUE_LINK_CANDIDATE",
      checks: {
        REGULAR_EVENT: regularEventYes ? "YES" : "NO",
        REAL_VenueHall_relation: realVenueHallRelation ? "YES" : "NO",
        REAL_VenueEvent_relation: realVenueEventRelation ? "YES" : "NO",
        REAL_linkedEventId: realLinkedEventId ? "YES" : "NO",
        hallIdStringPresent: Boolean(hallRaw),
        hallIdResolvesToVenueHallDoc: hallDocExists,
        eligibleForMetadataCleanup: eligible,
      },
      before: {
        venueAccessStatus: e.venueAccessStatus || null,
        venueLinkedAt: e.venueLinkedAt
          ? new Date(e.venueLinkedAt).toISOString()
          : null,
        venueHallId: hallRaw || null,
        venueHallName: e.venueHallName || null,
        venueOwnerId: asId(e.venueOwnerId),
        VenueEvent_relation: hasVe
          ? {
              venueEventId: clean(ve._id),
              hallId: veHall,
              linkedEventId: clean(ve.linkedEventId),
            }
          : null,
        VenueHall_relation: hallDocExists
          ? {
              hallId: hallRaw,
              note: "VenueHall document exists by id string, but NO VenueEvent.linkedEventId — NOT a real Venue-suite link",
            }
          : null,
      },
      presentVenueMetadataFields: Object.keys(presentVenueFields),
      customerAnchors: {
        invitationId: asId(invitation?._id),
        shareId: invitation?.shareId || null,
        invitationOwnerId: asId(invitation?.ownerId),
        guestCount,
        seatingDocId,
      },
      proposedMinimalAfter: {
        fieldsChanged: ['venueAccessStatus: "linked" → "none"'],
        venueAccessStatus: "none",
        fieldsNOTChangedInMinimalPlan: otherVenueFields,
      },
    });
  }

  const falseCandidates = rows.filter(
    (r) => r.classification === "FALSE_VENUE_LINK_CANDIDATE"
  );
  const eligible = falseCandidates.filter(
    (r) => r.checks.eligibleForMetadataCleanup
  );
  const ineligible = falseCandidates.filter(
    (r) => !r.checks.eligibleForMetadataCleanup
  );
  const trueLinks = rows.filter((r) => r.classification === "TRUE_VENUE_LINK");

  const extraFieldCounts: Record<string, number> = {};
  for (const r of eligible) {
    for (const k of r.proposedMinimalAfter.fieldsNOTChangedInMinimalPlan) {
      extraFieldCounts[k] = (extraFieldCounts[k] || 0) + 1;
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    database: db.databaseName,
    mode: "READ_ONLY_PRE_APPLY_PROPOSAL",
    APPLY: false,
    policy: {
      REGULAR_CUSTOMER_DATA_MODIFIED: "NO",
      ONLY_FALSE_VENUE_METADATA_WILL_CHANGE: "YES",
      minimalChange: 'Event.venueAccessStatus: "linked" → "none"',
      willNotTouch: [
        "Event._id",
        "User",
        "Invitation",
        "InvitationGuests",
        "RSVP",
        "Seating",
        "arrival data",
        "event date/time/status/payment/package",
        "shareId / public invitation link",
        "customer ownership (userId)",
        "no new Event",
        "no ID changes",
        "no Regular→Venue conversion",
      ],
      note: "Hall id / venueOwnerId strings without VenueEvent are NOT real venue links. Minimal plan changes ONLY venueAccessStatus. Other venue* fields listed for explicit approval before any unset.",
    },
    totals: {
      linkedEvents: linked.length,
      trueVenueLinks_excluded: trueLinks.length,
      falseCandidates: falseCandidates.length,
      eligibleMinimalCleanup: eligible.length,
      ineligible: ineligible.length,
    },
    extraVenueFieldsPresentOnEligible_notChangedInMinimalPlan: extraFieldCounts,
    examples3: eligible.slice(0, 3).map((r) => ({
      BEFORE: {
        eventId: r.eventId,
        title: r.title,
        email: r.email,
        venueAccessStatus: r.before.venueAccessStatus,
        VenueEvent_relation: r.before.VenueEvent_relation,
        VenueHall_relation: r.before.VenueHall_relation,
        checks: r.checks,
        customerAnchors: r.customerAnchors,
      },
      AFTER_PROPOSED: {
        fieldsChanged: r.proposedMinimalAfter.fieldsChanged,
        venueAccessStatus: "none",
        allOtherFields: "UNCHANGED",
        otherVenueMetadataLeftInPlaceUnlessApproved:
          r.proposedMinimalAfter.fieldsNOTChangedInMinimalPlan,
      },
    })),
    allEligible: eligible.map((r) => ({
      eventId: r.eventId,
      title: r.title,
      email: r.email,
      checks: r.checks,
      venueAccessStatus: r.before.venueAccessStatus,
      VenueEvent_relation: r.before.VenueEvent_relation,
      hallIdString: r.before.venueHallId,
      hallDocExistsButNoVenueEvent: Boolean(r.before.VenueHall_relation),
      otherVenueFieldsPresent:
        r.proposedMinimalAfter.fieldsNOTChangedInMinimalPlan,
      invitationId: r.customerAnchors.invitationId,
      shareId: r.customerAnchors.shareId,
      guestCount: r.customerAnchors.guestCount,
    })),
    ineligibleRows: ineligible,
    trueLinksExcluded: trueLinks.map((r) => ({
      eventId: r.eventId,
      title: r.title,
      VenueEvent_relation: r.before.VenueEvent_relation,
    })),
  };

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const jsonPath =
    "/opt/cursor/artifacts/PROD-FALSE-LINK-PRE-APPLY-PROPOSAL.json";
  writeFileSync(jsonPath, JSON.stringify(out, null, 2));

  const extraLines =
    Object.entries(extraFieldCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `- \`${k}\`: on ${n}/${eligible.length} eligible events`)
      .join("\n") || "- (none besides venueAccessStatus)";

  const examplesMd = out.examples3
    .map(
      (ex, i) => `### Example ${i + 1}

**BEFORE**
- eventId: \`${ex.BEFORE.eventId}\`
- title / email: ${ex.BEFORE.title} / ${ex.BEFORE.email}
- venueAccessStatus: \`${ex.BEFORE.venueAccessStatus}\`
- VenueEvent relation: \`${JSON.stringify(ex.BEFORE.VenueEvent_relation)}\`
- VenueHall relation: \`${JSON.stringify(ex.BEFORE.VenueHall_relation)}\`
- checks: \`${JSON.stringify(ex.BEFORE.checks)}\`
- invitationId / shareId / guests: \`${ex.BEFORE.customerAnchors.invitationId}\` / \`${ex.BEFORE.customerAnchors.shareId}\` / ${ex.BEFORE.customerAnchors.guestCount}

**AFTER PROPOSED**
- field changed: \`venueAccessStatus: "linked" → "none"\`
- everything else: **UNCHANGED**
- other venue* fields left as-is unless you approve unset: ${
        ex.AFTER_PROPOSED.otherVenueMetadataLeftInPlaceUnlessApproved.join(
          ", "
        ) || "(none)"
      }
`
    )
    .join("\n");

  const md = `# Production false-link PRE-APPLY proposal (READ ONLY)

**APPLY = NO** — not executed.

## Policy confirmation
- **REGULAR CUSTOMER DATA MODIFIED = NO**
- **ONLY FALSE VENUE METADATA WILL CHANGE = YES** (only if you later approve APPLY)

## Two customer types (unchanged)
1. **Regular Invistimo customers** — Event + Invitation + Guests + RSVP + Seating; not venue-linked; must stay exactly as they are.
2. **Venue Suite customers** — Lead → Event + VenueEvent + real VenueHall relation; only these are Venue-linked.

Cleanup proposal touches **only false Venue metadata stamp on Regular Events**.

## Minimal change proposed
\`\`\`js
Event.updateOne(
  { _id: eventId, venueAccessStatus: "linked" },
  { $set: { venueAccessStatus: "none" } }
)
\`\`\`

**Exactly one field:** \`venueAccessStatus\`: \`"linked"\` → \`"none"\`

### Will NOT touch
- Event identity (\`_id\`), User, Invitation, InvitationGuests, RSVP, Seating, arrival
- event date/time/status/payment/package
- shareId / public invitation link / customer ownership
- No new Event, no ID changes, no Regular→Venue conversion

## Eligibility (every candidate)
REGULAR EVENT = YES · REAL VenueHall relation = NO · REAL VenueEvent relation = NO · REAL linkedEventId = NO

## Totals (Production \`invite\`)
- linkedEvents: ${out.totals.linkedEvents}
- trueVenueLinks (excluded): ${out.totals.trueVenueLinks_excluded}
- false candidates: ${out.totals.falseCandidates}
- **eligible for minimal cleanup: ${out.totals.eligibleMinimalCleanup}**
- ineligible: ${out.totals.ineligible}

## Other Venue metadata on eligible rows (NOT changed in minimal plan)
${extraLines}

> Approve explicitly if you also want these unset. Minimal plan leaves them.

## 3 examples

${examplesMd}

## Artifacts
- JSON: \`${jsonPath}\`
`;

  const mdPath = "/opt/cursor/artifacts/PROD-FALSE-LINK-PRE-APPLY-PROPOSAL.md";
  writeFileSync(mdPath, md);

  console.log(
    JSON.stringify(
      {
        jsonPath,
        mdPath,
        totals: out.totals,
        extraFieldCounts,
        examples3: out.examples3,
        policy: out.policy,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
