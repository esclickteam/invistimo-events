# Venue Suite — SAFETY CONTRACT

**Status:** Binding for all Venue work  
**Last updated:** 2026-08-11

## Central rule

**VENUE SUITE may only touch customers/events created from a venue or explicitly linked with a real, verified relation.**

Every regular Invistimo user, Regular Event, Regular Invitation, and InvitationGuest is **out of Venues scope**.

---

## 1. Venue Customer (definition)

An event/customer is a Venue Customer **only if all** of the following hold:

1. `VenueHall` exists  
2. `VenueEvent` exists  
3. `VenueEvent.linkedEventId` is valid  
4. `Event` exists and matches that `linkedEventId`

**Not sufficient alone:** `venueAccessStatus`, `venueHallId`, `venueHallName`, `venueOwnerId`, `venueLinkedAt`, `venueClient*`, string metadata, invitation-sync metadata.

If there is no real `VenueEvent` + valid `linkedEventId` → treat as **REGULAR EVENT** for Venue logic.

Helper: `lib/venues/eventVenueLinkInvariant.ts` (`eventHasVerifiedVenueLink`, `assessEventVenueLink`).

---

## 2. Regular customers = PROTECTED

Venue code must never mutate:

- Regular User / Event / Invitation / InvitationGuests  
- RSVP / Seating / Arrival / shareId / public invite link  
- ownership / payment / package  
- regular dashboard / auth / admin impersonation  
- send history / confirmation rounds / reminders / thank-you  

Stale Venue metadata on a Regular Event is **not** authority to mutate customer data.

---

## 3. Venue code may touch only

- VenueHall, VenueMembership, VenueEmployee, VenueLead, VenueEvent  
- VenueFile, VenueStaffSchedule, VenueSeatingTemplate, VenueAuditLog, VenueTask (hall-scoped)  
- Entities created via Venue flow  
- Event **only** when verified linked to VenueEvent  

---

## 4. No global auth changes

Do **not** change shared auth to solve Venues needs:

- `lib/getUserIdFromRequest.ts`  
- `/api/me`  
- regular `/api/events`, `/api/invitations/my`  

Use Venue guards: `requireVenueAccess`, `requireLinkedVenueEventAccess`, `requireVenueDashboardActor`.

If a shared auth change seems required → **STOP** and request explicit approval with file/function, why, why not Venue layer, risked regular flows, test plan.

---

## 5. Protected core files

Venue PRs that change semantics of:

- User model/auth, Event/Invitation/InvitationGuest core  
- RSVP / regular seating / customer dashboard  
- public invitation renderer / send links / admin impersonation  

→ **STOP** before change. Read-only / relation lookups OK. Semantics need explicit approval.

---

## 6–9. Flow & invariants

- Valid path: Venue → Lead → Client/Event → VenueEvent → `linkedEventId` → Venue Customer  
- Invitation sync / admin edit / RSVP / seating / payment / regular update must **not** promote Regular → Venue-linked  
- Regular Event must work with missing venueId / VenueEvent / linkedEventId / VenueMembership  
- Venue access requires **verified VenueEvent link** + **VenueMembership** for that hall  
- Multi-hall = multi-tenant; membership on A ≠ access to B  

---

## 10–13. Staging & fixtures

- Flow: feature branch → Staging → E2E → regression → Production  
- Golden Regular Customer (Staging): no VenueEvent / linkedEventId / VenueMembership  
- Golden Venue Customer: full verified chain  
- Both REGULAR FLOW and VENUE FLOW must PASS every Venue PR  
- Regular regression fail → **MERGE FORBIDDEN**  

Fixtures (password `StagingTest123!`):

| Role | Email |
|------|-------|
| Regular golden | `staging-regular-host@invistimo.test` / `e2e-regular-host@invistimo.test` |
| Venue owner | `staging-owner-a@invistimo.test` / `e2e-owner-a@invistimo.test` |
| Venue customer | `e2e-customer-a@invistimo.test` |

---

## 14–15. Production data & user status

No Production bulk mutations / seed / cleanup / backfill without explicit approval + dry-run + export.

Venue features must not change regular `isActive` / `hasPaid` / global role / `authVersion` (except VenueEmployee/Membership context for that user).

---

## 16–17. PR diff gate & CI

Before merge, report:

- VENUE-ONLY FILES  
- SHARED FILES  
- PROTECTED CORE FILES  

If protected core is non-empty without allowlist → **STOP**.

CI: `scripts/ci/venue-pr-protected-core-guard.mjs` + workflow `.github/workflows/venue-safety.yml`.

Allowlist file (rare): `scripts/ci/venue-protected-core-allowlist.txt` (paths, one per line) — only with human approval noted in PR.

---

## 18. Invitation sync guard

Regular invitation sync must not create VenueEvent, set linked, add Venue ownership, or convert Event to Venue. Covered by `scripts/tests/venue-regular-boundary.test.mjs`.

---

## 19–21. Gates

Staging data integrity: Regular fixture IDs/counts **identical** (delta 0).

Production deploy only if:

- VENUE E2E, REGULAR E2E, TENANT ISOLATION, RBAC  
- GOLDEN REGULAR, INVITATIONGUESTS/RSVP/SEATING preserved  
- FALSE VENUE LINKS = 0  
- PROTECTED CORE UNAPPROVED = 0  

After deploy: read-only smoke only.

---

## 22–24. Incident prevention & cleanup scope

Regression: inactive/`isActive` must not empty Regular dashboards under valid sessions/impersonation (`scripts/tests/regular-customer-event-access.test.mjs`).

Venue cleanup scripts have **no authority** over records without verified Venue relation.

### Final contract line

```
VENUE SCOPE = VERIFIED VENUE CUSTOMERS ONLY
REGULAR USERS / EVENTS / INVITATIONS / GUESTS / RSVP / SEATING = PROTECTED
VENUE CODE MUTATION OF REGULAR CUSTOMER = FORBIDDEN
VENUE PR THAT TOUCHES PROTECTED CORE = REQUIRES EXPLICIT APPROVAL
STAGING REGRESSION = MANDATORY
PRODUCTION IS NOT A TEST ENVIRONMENT
```
