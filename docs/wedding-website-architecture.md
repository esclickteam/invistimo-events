# Wedding Website Product — Architecture & Plan

**Status:** Staging-first implementation  
**Hard rule:** Regular `/invite/[shareId]` is a protected core product. Wedding Website is a **separate** product surface.

---

## 1) Architecture proposal (short)

```
User / Event / Invitation (existing, unchanged)
        │
        ├── /invite/[shareId]     → Standard Invitation + RSVP (PROTECTED)
        ├── /e/[shareId]          → Public event info page (existing)
        │
        └── WeddingWebsite (NEW model, 1:1 with Invitation)
                 │
                 ├── templateId (one of 10)
                 ├── content overrides (story, FAQ, gallery, …)
                 ├── section visibility toggles
                 ├── status: draft | published
                 └── public URL: /w/[shareId]
                        │
                        ├── reads Event + Invitation snapshots
                        ├── merges WeddingWebsite.content
                        └── RSVP via existing InvitationGuest.token
                            → POST /api/invitationGuests/respondByToken/[token]
```

### Separation rules

| Product | Route | Changes allowed |
|---|---|---|
| Regular invitation | `/invite/[shareId]` | **None** (freeze set) |
| Wedding website | `/w/[shareId]` | New layer only |
| Demo gallery | `/wedding-website` | Marketing previews (demo content) |

- Same `shareId` may appear in both URLs — **different routes, different renderers**.
- Choosing a wedding template **never** mutates invitation canvas, guests, RSVP, or send links.
- SMS/WhatsApp builders keep pointing to `/invite/...` unless an explicit future business rule says otherwise.
- No Venue / VenueEvent / VenueMembership required.

### Source of truth for product mode

Existing field (already on Invitation):

```ts
invitationSettings.rsvpSiteMode: "standard" | "personal"
```

- `standard` → customer manages regular invite only  
- `personal` → customer can also manage Wedding Website (template/content/publish)  
- Selecting `personal` does **not** redirect guests or rewrite sent links  
- Published WeddingWebsite is independently reachable at `/w/[shareId]`

No new purchase SKU in MVP. Entitlement for Staging = invitation owner (and later `salesUpsells.weddingWebsite` if productized).

---

## 2) Ten templates — distinct concepts

| # | ID | Name | Visual concept | Colors | Typography | Decorations | Animation language |
|---|---|---|---|---|---|---|---|
| 1 | `eternal-gold` | Eternal Gold — Luxury Classic | Full-bleed hero, sticky classic nav, gold dividers, formal section rhythm | Champagne `#FAF7F2`, gold `#C9A962` | Cormorant Garamond + Heebo | Diamond dividers, grain, thin gold rules | Slow ken-burns hero, fade-up sections |
| 2 | `midnight-velvet` | Midnight Velvet — Elegant Night | Cinematic dark hero, particle gold dust, stacked drama | Near-black `#0D0B10`, gold `#D4AF37` | Playfair Display + Heebo | Particles, vignette, velvet surfaces | Parallax, sparkle drift, soft glow (restrained) |
| 3 | `garden-bloom` | Garden Bloom — Romantic Floral | Soft garden atmosphere, organic curves, floral frames | Soft green `#F4FAF4`, leaf `#6B9E78` | Libre Baskerville + Heebo | SVG leaves/petals, botanical corners | Float petals, gentle bloom reveals |
| 4 | `coastal-breeze` | Coastal Breeze — Mediterranean / Summer | Airy horizontal bands, wave motif, light typography | Sky `#F0F8FF`, sea `#3D8BBA` | Montserrat + Heebo | Wave SVG, horizon lines | Wave motion, shuttle scroll on transport |
| 5 | `desert-rose` | Desert Rose — Soft Warm / Pastel-warm | Diagonal clips, terracotta warmth, desert texture | Sand `#FBF5F0`, rose `#C4705A` | Cormorant Garamond + Heebo | Soft dunes, warm grain | Shimmer accents, diagonal wipe reveals |
| 6 | `minimal-noir` | Minimal Noir — Clean Minimal | Split-name hero, hairline grid, extreme whitespace | White `#FAFAFA`, ink `#111` | Montserrat + Heebo | Hairlines only, no ornaments | Precise fade / slide, almost still |
| 7 | `royal-ivory` | Royal Ivory — Palace Formal | Centered monogram crest, lace-like frames | Ivory `#FDFBF7`, bronze `#B8956B` | Playfair Display + Heebo | Crest, ornate corners | Elegant fade-in, slow scale |
| 8 | `sunset-blush` | Sunset Blush — Soft Pastel Romantic | Gradient dusk sky, soft hearts (tasteful), rounded romance | Blush `#FFF5F7`, rose `#E8788A` | Cormorant Garamond + Heebo | Soft blobs, thin heart line-art | Floating hearts (subtle), gradient shift |
| 9 | `forest-enchanted` | Forest Enchanted — Garden / Nature | Dark woodland full-bleed, firefly accents | Forest `#0F1810`, moss `#7CB87A` | Libre Baskerville + Heebo | Leaves, fireflies, path lines | Firefly drift, path draw on timeline |
| 10 | `modern-glass` | Modern Glass — Bold Premium / Fashion | Asymmetric editorial columns, glass panels | Midnight `#0A0E17`, ice `#7C9CFF` | Montserrat + Heebo | Glass blur panels, neon soft edge | Glass reveal, editorial stagger |

**Hard differentiation:** each template has its own `*Site.tsx` with unique hero, nav, section order, RSVP layout, timeline treatment, footer, and illustration set — not a theme skin over one layout.

---

## 3) Build order

### Phase 1 (MVP — this PR / Staging)
1. `WeddingWebsite` model + APIs  
2. Public `/w/[shareId]` + `/api/w/[shareId]`  
3. Content resolver (Event + Invitation + overrides)  
4. Content context so all 10 templates can render live data  
5. Real RSVP on website (same `respondByToken`)  
6. Dashboard: template pick / edit content / publish / preview  
7. Illustrated transport (shuttle) + location pin motion (shared, theme-aware)  
8. Regression tests: regular invite untouched  

### Phase 2
- Polish all 10 templates + unique illustration language per template  
- Preview cards quality  
- Template switch rules  
- Optional: explicit dual-link business rule for SMS (off by default)  
- Purchase/upsell flag if needed  

---

## 4) Sections per template (varied order)

Core sections available: Hero, Welcome/Story, Countdown, Details, Location+Map/Waze, Schedule, Transport, RSVP, Gallery, FAQ, Gifts, Contact, Footer.

| Template | Distinct flow (high level) |
|---|---|
| Eternal Gold | Hero → Countdown → Invitation → Story → Gallery → Details → Schedule → Location → Transport → RSVP → FAQ → Gifts → Footer |
| Midnight Velvet | Hero (cinematic) → Details strip → Story → Schedule (vertical glow) → Gallery → Location → Transport → RSVP → Gifts → FAQ → Footer |
| Garden Bloom | Hero → Story → How we met → Gallery → Schedule (garden path) → Location → Transport → Dress → RSVP → FAQ → Gifts → Footer |
| Coastal Breeze | Hero → Countdown → Details cards → Location/Waze → Transport (wave+shuttle) → Schedule → Gallery → RSVP → FAQ → Gifts → Footer |
| Desert Rose | Hero (diagonal) → Invitation → Story → Schedule → Gallery → Location → Transport → RSVP → Gifts → FAQ → Footer |
| Minimal Noir | Split hero → Details list → Schedule (minimal) → Location → RSVP (stark) → Gallery grid → FAQ → Footer |
| Royal Ivory | Crest hero → Invitation letter → Schedule → Story → Gallery → Location → Transport → RSVP → FAQ → Gifts → Footer |
| Sunset Blush | Gradient hero → Countdown → Story → Gallery → Schedule → Location → Transport → RSVP → Gifts → FAQ → Footer |
| Forest Enchanted | Dark hero → Story → Schedule (path) → Gallery → Location → Transport → RSVP → FAQ → Gifts → Footer |
| Modern Glass | Editorial hero → Glass details → Gallery mosaic → Schedule → Location → Transport → RSVP → FAQ → Footer |

Section toggles live on `WeddingWebsite.sections`.

---

## 5) Data pull from the real event

`lib/weddingWebsite/resolveWeddingSiteContent.ts` merges:

| Field | Source priority |
|---|---|
| Couple names / title | `WeddingWebsite.content.coupleNames` → `Invitation.title` → `Event.title` |
| Date / time | content override → Invitation → Event |
| Venue name / address | content → Invitation.location → Event.location |
| Lat/lng (map/Waze) | Invitation.location / Event.location |
| Schedule | content.schedule if set → `Invitation.publicEventPage.schedule` |
| Parking / transport | content → publicEventPage.parking + content.transportation |
| Gifts | content.giftsNote + publicEventPage.gifts / giftOptions |
| Gallery | content.galleryUrls → coupleImage → template defaults (only if empty & draft demo) |
| Story / FAQ / dress / contact | WeddingWebsite.content |
| Guest for RSVP | `InvitationGuest` by `?token=` (same as invite) |

No mock data on published sites. Demo gallery (`/wedding-website/*`) keeps `WEDDING_DEMO_CONTENT`.

---

## 6) Animation / illustration technical approach

- **Primary:** CSS + Framer Motion (already in repo)  
- **SVG illustrations:** lightweight inline components under `components/wedding-website/illustrations/`  
  - `ShuttleRide` — horizontal scroll-linked / CSS translate for transport  
  - `MapPinPulse` — location  
  - `TimelineDraw` — schedule accent  
  - `SoftEnvelope` / `GiftBow` — RSVP / gifts  
- **Rules:** `prefers-reduced-motion: reduce` disables non-essential motion; no Lottie in MVP (payload); no CLS (reserved space / transform-only); mobile-friendly  

---

## 7) MVP definition (ready for Staging E2E)

- Create/open WeddingWebsite for a Regular Event invitation  
- Choose template (any of 10)  
- Edit welcome/story/schedule/transport/FAQ/gifts/contact/gallery  
- Publish → `/w/[shareId]` live with real event data  
- Guest `?token=` can RSVP (writes same InvitationGuest)  
- `/invite/[shareId]` unchanged for Golden Regular fixture  
- No Production deploy until Staging gate passes  

---

## 8–10) Staging → E2E → Production gate

See §29–32 in product brief.

**Acceptance gate before Production:**

- REGULAR INVITATION LINK = PASS  
- OLD LINKS STILL WORK = PASS  
- REGULAR RSVP / GUESTS / SEATING = PASS  
- WEDDING WEBSITE + templates + RSVP = PASS  
- REGULAR INVITATION AFFECTED BY WEDDING WEBSITE = **NO**  

Production merge is **blocked** until Staging E2E confirms the above.
