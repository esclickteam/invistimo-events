export type ArticleCover = { src: string; alt: string };

/**
 * One cover per guide. Existing product photos are used once each.
 * The rest are original photographs generated for this magazine.
 */
const COVERS: Record<string, string> = {
  "wedding-planning": "/marketing/luxury/editorial-couple-garden.webp",
  "wedding-seating-arrangements": "/marketing/luxury/editorial-rings-flowers.webp",
  "seating-plan": "/marketing/luxury/editorial-details.webp",
  "send-digital-invitation": "/marketing/blog/send-digital-invitation.webp",
  "wedding-website-guide": "/marketing/blog/wedding-website-guide.webp",
  "save-the-date-vs-invitation": "/marketing/blog/save-the-date-vs-invitation.webp",
  "seating-live-day-of": "/marketing/blog/seating-live-day-of.webp",
  "event-day-checklist": "/marketing/blog/event-day-checklist.webp",
  "when-to-send-save-the-date": "/marketing/invites/invite-save-the-date-maya-itai.webp",
  "wedding-website-vs-digital-invitation": "/marketing/invites/invite-wedding-mia-alon.webp",
  "rsvp-corporate-events": "/marketing/invites/invite-corporate.webp",
  "bit-paybox-wedding-invitation": "/marketing/credit-gifts/hero-envelope.jpg",

  "when-to-send-rsvp": "/marketing/blog/when-to-send-rsvp.webp",
  "wedding-vendors-contracts": "/marketing/blog/wedding-vendors-contracts.webp",
  "event-management-vs-production": "/marketing/blog/event-management-vs-production.webp",
  "whatsapp-invitation-wording": "/marketing/blog/whatsapp-invitation-wording.webp",
  "whatsapp-vs-sms-rsvp": "/marketing/blog/whatsapp-vs-sms-rsvp.webp",
  "how-phone-rsvp-works": "/marketing/blog/how-phone-rsvp-works.webp",
  "guest-list": "/marketing/blog/guest-list.webp",
  "guests-who-dont-reply": "/marketing/blog/guests-who-dont-reply.webp",
  "tracking-rsvp-responses": "/marketing/blog/tracking-rsvp-responses.webp",
  "last-minute-guest-changes": "/marketing/blog/last-minute-guest-changes.webp",
  "rsvp-reminder-rounds": "/marketing/blog/rsvp-reminder-rounds.webp",
  "how-to-choose-rsvp-company": "/marketing/blog/how-to-choose-rsvp-company.webp",
  "seating-families-groups": "/marketing/blog/seating-families-groups.webp",
  "reduce-meal-waste": "/marketing/blog/reduce-meal-waste.webp",
  "table-number-message": "/marketing/blog/table-number-message.webp",
  "venue-guest-check-in": "/marketing/blog/venue-guest-check-in.webp",
  "seating-cards-vs-qr": "/marketing/blog/seating-cards-vs-qr.webp",
  "wedding-alcohol-calculator": "/marketing/blog/wedding-alcohol-calculator.webp",
  "wedding-venue-guest-guarantee": "/marketing/blog/wedding-venue-guest-guarantee.webp",
  "cost-rsvp-wedding": "/marketing/blog/cost-rsvp-wedding.webp",
  "personal-rsvp-link": "/marketing/blog/personal-rsvp-link.webp",
  "plus-ones-and-kids-rsvp": "/marketing/blog/plus-ones-and-kids-rsvp.webp",
  "overseas-guests-rsvp": "/marketing/blog/overseas-guests-rsvp.webp",
  "manage-guests-after-rsvp": "/marketing/blog/manage-guests-after-rsvp.webp",
  "import-guest-list": "/marketing/blog/import-guest-list.webp",
  "wedding-guest-list-excel": "/images/guides/guest-list/guest-list-table.png",
};

export function coverFor(slug: string, alt: string): ArticleCover | null {
  const src = COVERS[slug];
  return src ? { src, alt } : null;
}

export function coverSrc(slug: string) {
  return COVERS[slug] || "";
}
