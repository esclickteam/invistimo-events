# Venues Mini Management System — Audit + Architecture

**Status:** Design approved for implementation (no production merge/deploy in this phase)  
**Branch:** `cursor/venues-mini-management-2a24`  
**Date:** 2026-08-09

---

## A. Product context

Invistimo already has a mature client Event stack (RSVP, invitations, seating, messaging) and a separate Invistimo Staff stack (softphone, payroll hours, sales, Form 101).

The Venues Owner Suite (`/venues/dashboard`, `role: venue_owner`) is a B2B surface that today is partially wired: halls/menus/CRM/calendar exist, but staff is mock, files are filename-only, sidebar is dead, and CRM vs calendar use two different event models.

---

## B. Issue register (Issue / Root cause / Current behavior / Proposed fix / Risk)

### VEN-001 — Dual event truth (CRITICAL)

| | |
|---|---|
| **Issue** | CRM close and hall overview use `VenueEvent`; calendar, event detail, client invite/registration use `Event`. |
| **Root cause** | Two parallel implementations without a linkage field. CRM `closeEvent` creates only `VenueEvent`. Calendar POST creates only `Event` with `venueOwnerId` / `venueHallId` / `venueAccessStatus: "linked"`. |
| **Current behavior** | Closing a lead writes `VenueLead.eventId = VenueEvent._id` and claims “נוצר ביומן”, but calendar does not list it. Hall overview links to `/venues/dashboard/events/[id]` which loads `Event` → 404. |
| **Proposed fix** | Keep **Event** as Invistimo operational event (optional venue linkage). Keep **VenueEvent** as venue-tenant booking record with required `linkedEventId` after conversion. Conversion atomically creates/links both. Never make `venueId` required on `Event`. |
| **Risk** | Medium if done carefully (additive fields). High if we force `venueId` on all Events or delete VenueEvent prematurely. |

### VEN-002 — Lead conversion not idempotent

| | |
|---|---|
| **Issue** | Double-click / retry on `closeEvent` creates multiple VenueEvents. |
| **Root cause** | No check of `lead.status === "closed"` / existing `lead.eventId` before create. |
| **Current behavior** | Each POST creates a new VenueEvent and overwrites `lead.eventId`. |
| **Proposed fix** | If lead already closed with `eventId`, return existing ids. Use unique partial index / transaction where possible. |
| **Risk** | Low. |

### VEN-003 — Status vocabulary mismatch

| | |
|---|---|
| **Issue** | Calendar UI expects `lead/proposal/closed/confirmed/preparing/live/done/cancelled`; Event API only allows `active/archived`. |
| **Root cause** | UI typed for VenueEvent lifecycle; API switched to Event.status. |
| **Current behavior** | UI filters/KPIs for lifecycle statuses stay near zero; `"confirmed"` coerced to `"active"`. |
| **Proposed fix** | Source of truth for venue lifecycle = `VenueEvent.status`. Event keeps `active/archived` for Invistimo. Shared mapper for UI. |
| **Risk** | Low–medium (UI remap). |

### VEN-004 — Dead owner sidebar

| | |
|---|---|
| **Issue** | Sidebar buttons have no `href` / navigation. |
| **Root cause** | Cosmetic nav array without routes. |
| **Current behavior** | Only hall cards / some CTAs navigate. |
| **Proposed fix** | Real routes + permission-gated items (see nav plan). |
| **Risk** | Low. |

### VEN-005 — Staff page is 100% mock

| | |
|---|---|
| **Issue** | `workersInitial` hardcoded; `saveMock` fakes success. |
| **Root cause** | Prototype UI without VenueEmployee model/API. |
| **Current behavior** | Refresh loses all shifts/workers. |
| **Proposed fix** | New `VenueEmployee` (ops record) + optional login via `VenueMembership` → User. Persist shifts via API. |
| **Risk** | Medium (new models); zero impact on Invistimo Staff if namespaced. |

### VEN-006 — Proposal/contract filename-only

| | |
|---|---|
| **Issue** | CRM stores `proposalFileName` / `contractFileName` only; file input sends `.name`. |
| **Root cause** | Upload never wired. |
| **Current behavior** | No persistent file URL. |
| **Proposed fix** | Real upload (Cloudinary/Blob already in project) + metadata fields on lead/file entity, scoped by venueId. |
| **Risk** | Low. |

### VEN-007 — Hall images temporary blob

| | |
|---|---|
| **Issue** | `URL.createObjectURL` preview; UI warns image won’t persist. |
| **Root cause** | No upload endpoint for hall image. |
| **Proposed fix** | Upload → store URL on `VenueHall.image`. |
| **Risk** | Low. |

### VEN-008 — Seating templates incomplete CRUD

| | |
|---|---|
| **Issue** | Live API: GET+POST only. PUT/DELETE missing. Orphan routes under `app/venues/dashboard/seating-templates` use dead `lib/auth` cookie. |
| **Root cause** | Incomplete feature + leftover routes. |
| **Proposed fix** | Full CRUD under `/api/venues/dashboard/...`, delete/fix orphan routes, verify hall ownership. |
| **Risk** | Low. |

### VEN-009 — Unauthenticated sensitive endpoints

| | |
|---|---|
| **Issue** | `hall-payments` and `client-contract` lack auth/tenant checks. |
| **Root cause** | Routes written without guard. |
| **Proposed fix** | Shared venue guard + Event ownership (`venueOwnerId` / membership). |
| **Risk** | Security — must fix before merge. |

### VEN-010 — `/venues` not in middleware

| | |
|---|---|
| **Issue** | Protected path list omits `/venues`. |
| **Root cause** | Middleware never updated for Owner Suite. |
| **Proposed fix** | Add `/venues` (except public registration paths) to protected dashboards. |
| **Risk** | Low. |

### VEN-011 — No Venue users / memberships

| | |
|---|---|
| **Issue** | Only `role: venue_owner` on User. No multi-venue membership, no venue employee logins, no custom permissions. |
| **Root cause** | Product never built tenant RBAC. `employeeScope: "venue"` exists on User but is unused. |
| **Proposed fix** | New `VenueMembership` (user ↔ venue/hall, role, permissions). Do **not** reuse Invistimo `staff` / Employee* models. |
| **Risk** | Medium (auth changes); mitigated by additive membership + keep `venue_owner` working. |

### VEN-012 — Tenant key is ownerId, not hall, for employees

| | |
|---|---|
| **Issue** | All venue data scoped by `ownerId` (+ hallId). Multi-hall owner is one user; no per-hall staff isolation model for logins. |
| **Root cause** | Owner-centric design. |
| **Proposed fix** | Treat each `VenueHall` as a tenant (`venueId = hall.id`). Memberships are per hall. Owner gets OWNER membership on each owned hall. Switcher changes active hall context. |
| **Risk** | Medium — requires careful migration of existing owner access. |

### VEN-013 — Invistimo Staff collision risk

| | |
|---|---|
| **Issue** | User asked not to mix Invistimo employees with venue employees. |
| **Root cause** | Shared `User` model + vague `employeeScope: "venue"`. |
| **Proposed fix** | Explicit models: `VenueMembership`, `VenueEmployee`. Never write Invistimo `staffType` / softphone / payroll for venue users. Venue login users use a dedicated role strategy (see below). |
| **Risk** | High if we overload `role: staff`. |

### VEN-014 — Client contract upload vs CRM

| | |
|---|---|
| **Issue** | Event client-contract has Cloudinary upload but no auth; CRM has auth but no upload. |
| **Root cause** | Divergent implementations. |
| **Proposed fix** | Shared upload helper + auth on both. |
| **Risk** | Low–medium. |

---

## C. Dependency audit — Event (must not break)

| Consumer | Uses Event? | Venue fields? |
|---|---|---|
| Client dashboard / RSVP / guests | Yes | No (regular events) |
| Invitations | Yes (`eventId`) | Optional venue client fields |
| Seating APIs | Yes | Works for regular + venue-linked |
| Producer / production | Yes | Independent |
| Venue calendar / event detail | Yes | `venueOwnerId`, `venueHallId`, `venueAccessStatus` |
| Venue client registration | Yes | Invite token on Event |
| Venue CRM close | **No** (VenueEvent only) | — |
| Hall overview KPIs | **VenueEvent** | — |

**Decision:** Do **not** make `venueId` required on `Event`. Regular Events stay unchanged.

---

## D. Invistimo Staff — do not touch

Roles/combos to leave alone:
- `role: staff` + `staffType: general_staff|seating_staff|usher_staff` + `employeeScope: system`
- `role: staff` + `staffType: producer_staff` + `employeeScope: producer`
- Softphone / Call* / EmployeeSale / EmployeeForm101 / EmployeeAgreement* / payroll hours

Venue work must not create, mutate, or redirect these flows.

---

## E. Proposed architecture (backward compatible)

### E1. Tenant = VenueHall

```
VenueHall.id  ===  venueId (tenant key)
ownerId       ===  business owner user (may own many halls)
```

Each hall is an isolated workspace: leads, events, employees, files, menus, seating templates, settings.

### E2. VenueMembership (NEW)

```
VenueMembership {
  userId
  venueId          // VenueHall.id
  ownerId          // denormalized VenueHall.ownerId for queries
  role             // OWNER | MANAGER | EVENT_MANAGER | RECEPTION | SALES | STAFF | VIEWER
  permissions      // string[] custom overrides / grants
  status           // active | disabled
  mustChangePassword?: boolean
  lastLoginAt?
  createdBy
  createdAt / updatedAt
}
```

Unique index: `{ userId, venueId }`.

- Same User can have different roles on different venues.
- Permissions are **never** global on User for venue screens.
- Existing `venue_owner` users get OWNER memberships for each of their halls (migration script, additive).

### E3. Venue login users (NEW usage of User, not Invistimo Staff)

Option chosen for safety:

- Create/login Users with:
  - `role: "user"` (or keep a dedicated flag)
  - `venueUser: true`
  - `employeeScope: "venue"` (now enforced)
  - **no** `staffType`
- Access to `/venues/**` granted only via active `VenueMembership`
- Redirect after login: if memberships exist → venue dashboard / switcher
- **Never** set `role: staff` for venue employees

OWNER remains `role: venue_owner` for backward compatibility; memberships still required after migration backfill.

### E4. VenueEmployee (NEW — ops record, optional login)

```
VenueEmployee {
  venueId
  ownerId
  fullName, phone, email?
  jobTitle               // מלצר / ברמן / מנהל משמרת…
  status                 // active | inactive
  userId?                // optional link to User + VenueMembership
  notes?
  createdBy
}
```

- Shift workers can exist without login.
- “פתח גישה למערכת” creates User + Membership and sets `VenueEmployee.userId`.

This is **not** Invistimo Employee / Staff.

### E5. Event / VenueEvent relation (NON-DESTRUCTIVE)

```
VenueLead
  → close (idempotent)
    → Event.create({
         userId: venueOwner (until client registers),
         venueOwnerId, venueHallId, venueHallName,
         venueAccessStatus: "linked",
         venueLinkedAt,
         ...client fields
       })
    → VenueEvent.create({
         ownerId, hallId (=venueId),
         linkedEventId: Event._id,   // NEW required after conversion
         createdFromLeadId: Lead._id,
         createdBy: actorUserId,
         status: "confirmed" | "closed",
         ...venue lifecycle fields
       })
    → Lead.status = closed; Lead.eventId = Event._id; Lead.venueEventId = VenueEvent._id
```

Rules:
1. **VenueEvent** = venue source of truth for venue UI (calendar KPIs, lifecycle, assigned venue staff, package).
2. **Event** = Invistimo operational record when RSVP/seating/client package needed; linkage optional until conversion creates it.
3. Regular Events without venue fields continue to work; no schema requirement for venueId.
4. Existing orphan VenueEvents (no linkedEventId) get a one-time backfill that creates linked Events **or** are shown read-only until repaired — decide in migration script with dry-run.
5. Calendar/event detail migrate to read VenueEvent → join Event for client features; dual-write during transition.

### E6. Status source of truth

| Layer | Field | Values |
|---|---|---|
| Venue lifecycle | `VenueEvent.status` | `lead \| proposal \| closed \| confirmed \| preparing \| live \| done \| cancelled` |
| Invistimo event | `Event.status` | `active \| archived` |
| Lead CRM | `VenueLead.status` | existing enum |

Shared constants in `lib/venues/statuses.ts` — no scattered magic strings in new code.

### E7. Permissions

Built-in role → default permission matrix in `lib/venues/permissions.ts`.  
Custom checkboxes override/add on membership.  
Server: `requireVenuePermission(req, venueId, permission)` — never trust client venueId alone; resolve membership from auth userId + requested venueId.

### E8. Auth session

Keep existing JWT (`userId`, `role`, …) + DB reload.  
Active venue is UX cookie / header `x-venue-id` **validated** against membership.  
Add `authVersion` (or reuse password-changedAt) on User to invalidate sessions after reset — additive.

### E9. Navigation

```
/venues/dashboard                         # overview + venue switcher
/venues/dashboard/halls/[venueId]         # hall overview
/venues/dashboard/halls/[venueId]/crm     # leads
/venues/dashboard/halls/[venueId]/calendar# events
/venues/dashboard/halls/[venueId]/customers
/venues/dashboard/halls/[venueId]/seating-templates
/venues/dashboard/halls/[venueId]/staff   # VenueEmployee shifts
/venues/dashboard/halls/[venueId]/employees # memberships & permissions (NEW)
/venues/dashboard/halls/[venueId]/files
/venues/dashboard/halls/[venueId]/reports
/venues/dashboard/halls/[venueId]/settings
/venues/dashboard/events/[eventId]        # venue event detail (resolve via VenueEvent.linkedEventId)
```

Sidebar items hidden without permission; server still enforces.

---

## F. Implementation phases (this PR series)

### Phase 0 — Audit + design (this document) ✅

### Phase 1 — Foundations (safe, additive) — IN PROGRESS on this branch

| Item | Status |
|---|---|
| `VenueMembership`, `VenueEmployee`, `VenueStaffSchedule`, `VenueAuditLog` | ✅ |
| permissions/status constants | ✅ |
| `requireVenueAccess` + lazy OWNER membership backfill | ✅ |
| Middleware protect `/venues` | ✅ |
| Employees & permissions UI + APIs | ✅ |
| Remove staff `saveMock` / wire staff API | ✅ |
| CRM closeEvent → Event + VenueEvent linkage (idempotent) | ✅ |
| Seating template Update/Delete/Duplicate (API) | ✅ |
| Auth on hall-payments + client-contract | ✅ |
| Login redirect for venue users | ✅ |
| Unit/regression tests (`npm run test:venues`) | ✅ 21 pass |
| Venue switcher UI (full) | ⏳ API `my-venues` ready; UI switcher partial |
| Real hall image + CRM binary uploads | ⏳ metadata schema ready; upload wiring pending |
| Hall overview query migrate to linked Event | ⏳ |
| Calendar UI status mapping to VenueEvent lifecycle | ⏳ |
| DB integration tests (tenant A vs B) | ⏳ needs Mongo in CI |
| Session invalidation via authVersion end-to-end | ⏳ field added; login JWT not yet version-checked |

### Phase 2 — Polish
- Reports page, customers page, files library UX
- Richer shift calendar weeks
- Full venue switcher chrome on all hall pages

**READY TO MERGE: NO** — remaining gaps above; no production deploy.

---

## G. Regression safety gates (must all PASS)

| Gate | Criteria |
|---|---|
| Invistimo Staff | Softphone/staff login/roles unchanged; no VenueEmployee writes to staff models |
| Regular Events | Create/edit/RSVP/seating without venue fields |
| Venue Events | Lead→conversion→calendar→detail consistent |
| Multi-Venue Owner | Memberships per hall; switcher; isolation |
| Tenant Isolation | Venue A cannot read Venue B |
| RSVP | Regular + venue-linked client flows |
| Seating | Regular + venue templates |

---

## H. Explicit non-goals for this work

- Wedding website redesign
- Invistimo staff/payroll changes
- Making `Event.venueId` required
- Production data mutation / merge / deploy
