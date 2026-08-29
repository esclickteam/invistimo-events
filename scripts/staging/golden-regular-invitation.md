# Golden Regular Invitation Fixture (Staging)

**Purpose:** Prove Wedding Website work never mutates the Regular Invitation product.

## Fixture identity (fill on Staging after seed)

| Field | Value |
|---|---|
| Customer email | _(staging golden)_ |
| Event id | |
| Invitation id | |
| shareId | |
| Invite URL | `https://staging.invistimo.com/invite/<shareId>` |
| Guest count | |
| RSVP yes/no/pending | |
| Seating tables | |

## Rules

1. This customer must **not** have a published WeddingWebsite (or may have none at all).
2. `invitationSettings.rsvpSiteMode` should remain `standard` unless intentionally testing dual product UI.
3. Before and after every Wedding Website PR:

```text
shareId        IDENTICAL
invite URL     IDENTICAL
eventId        IDENTICAL
invitationId   IDENTICAL
guest count    IDENTICAL
RSVP counts    IDENTICAL
seating        IDENTICAL
```

4. Opening `/w/<shareId>` for this fixture must **404** (unless a draft was created and previewed — still must not change `/invite`).

## Automated checks

- `npx tsx scripts/tests/wedding-website-separation.test.ts`
- Manual CUSTOMER A flow in product brief §29
