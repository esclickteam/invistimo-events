import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildEventCoreSyncFromInvitation,
  detectGuestEventDetailsMismatch,
  eventTypeHeadline,
  isPlaceholderEventTime,
  isPlaceholderEventTitle,
  mergeGiftsForMigration,
  normalizeCentralGifts,
  pickGuestFacingDate,
  pickGuestFacingTime,
  pickGuestFacingTitle,
  resolveCentralEventDetails,
  resolveCentralGifts,
  validateCentralGifts,
  isValidIsraeliPhone,
} from "../../lib/eventDetails/centralEventDetails";

describe("central event gifts", () => {
  it("validates enabled gift methods require data", () => {
    const errors = validateCentralGifts(
      normalizeCentralGifts({
        creditEnabled: true,
        creditUrl: "",
        payboxEnabled: true,
        payboxUrl: "not-a-url",
        bitEnabled: true,
        bitPhone: "123",
      })
    );
    assert.equal(errors.length, 3);
  });

  it("accepts valid Israeli phone and http gift urls", () => {
    assert.equal(isValidIsraeliPhone("0501234567"), true);
    const gifts = normalizeCentralGifts({
      creditEnabled: true,
      creditUrl: "https://pay.example/credit",
      payboxEnabled: true,
      payboxUrl: "www.paybox.com/x",
      bitEnabled: true,
      bitPhone: "+972501234567",
    });
    assert.equal(validateCentralGifts(gifts).length, 0);
    assert.equal(gifts.bitPhone, "0501234567");
    assert.equal(gifts.payboxUrl, "https://www.paybox.com/x");
  });

  it("prefers Event.gifts over invitation mirrors", () => {
    const resolved = resolveCentralGifts(
      {
        gifts: {
          creditEnabled: true,
          creditUrl: "https://event.example/credit",
          payboxEnabled: false,
          payboxUrl: "",
          bitEnabled: true,
          bitPhone: "0501111111",
        },
      },
      {
        giftOptions: {
          creditEnabled: true,
          creditUrl: "https://invite.example/credit",
          payboxEnabled: true,
          payboxUrl: "https://invite.example/paybox",
        },
        publicEventPage: {
          gifts: { bitPhone: "0502222222", creditUrl: "https://public/credit" },
        },
      }
    );

    assert.equal(resolved.creditUrl, "https://event.example/credit");
    assert.equal(resolved.payboxEnabled, false);
    assert.equal(resolved.bitPhone, "0501111111");
  });

  it("hides disabled gift methods from guests", () => {
    const resolved = resolveCentralGifts(
      {
        gifts: {
          creditEnabled: false,
          creditUrl: "https://hidden/credit",
          payboxEnabled: false,
          payboxUrl: "https://hidden/paybox",
          bitEnabled: false,
          bitPhone: "0501234567",
        },
      },
      null
    );
    assert.equal(resolved.creditUrl, "");
    assert.equal(resolved.payboxUrl, "");
    assert.equal(resolved.bitPhone, "");
  });

  it("builds event-type headlines", () => {
    assert.equal(
      eventTypeHeadline("wedding", "נועה ואדם", "החתונה"),
      "החתונה של נועה ואדם"
    );
    assert.equal(
      eventTypeHeadline("bar-mitzvah", "יואב", "בר מצווה"),
      "בר המצווה של יואב"
    );
    assert.equal(eventTypeHeadline("other", "", "ערב חברה"), "ערב חברה");
  });

  it("migration merge documents credit conflicts", () => {
    const result = mergeGiftsForMigration(
      { giftCreditUrl: "https://a.example/c" },
      {
        giftOptions: { creditEnabled: true, creditUrl: "https://b.example/c" },
        publicEventPage: { gifts: { creditUrl: "https://c.example/c" } },
      }
    );
    assert.ok(result.conflicts.includes("creditUrl"));
    assert.equal(result.gifts.creditEnabled, true);
  });

  it("resolveCentralEventDetails reads hosts and times from Event", () => {
    const details = resolveCentralEventDetails(
      {
        title: "החתונה שלנו",
        eventType: "wedding",
        hostsNames: "נועה ואדם",
        date: "2026-12-01",
        time: "19:00",
        receptionTime: "18:30",
        ceremonyTime: "19:30",
        city: "תל אביב",
        location: { name: "אולם הדר", address: "רחוב 1, תל אביב" },
        gifts: {
          creditEnabled: true,
          creditUrl: "https://pay.example",
          payboxEnabled: false,
          payboxUrl: "",
          bitEnabled: false,
          bitPhone: "",
        },
      },
      { title: "ישן", publicEventPage: { gifts: { bitPhone: "0509999999" } } }
    );

    assert.equal(details.hostsNames, "נועה ואדם");
    assert.equal(details.receptionTime, "18:30");
    assert.equal(details.ceremonyTime, "19:30");
    assert.equal(details.gifts.bitEnabled, false);
    assert.equal(details.gifts.creditUrl, "https://pay.example");
  });

  it("never shows Event shell defaults when the invitation has real guest details", () => {
    const event = {
      title: "הזמנה חדשה",
      eventType: "wedding",
      date: "2026-08-18",
      time: "00:00",
      location: {
        name: "יסמין מתחם אירועים, חלוצי התעשיה, חיפה, ישראל",
        address: "יסמין מתחם אירועים, חלוצי התעשיה, חיפה, ישראל",
      },
    };
    const invitation = {
      title: "דויד חיים מלול - בר מצווה",
      eventType: "bar-mitzvah",
      eventDate: "2026-10-11T00:00:00.000Z",
      eventTime: "19:30",
      location: {
        name: "יסמין מתחם אירועים, חלוצי התעשיה, חיפה, ישראל",
        address: "יסמין מתחם אירועים, חלוצי התעשיה, חיפה, ישראל",
      },
    };

    const details = resolveCentralEventDetails(event, invitation);
    assert.equal(details.title, "דויד חיים מלול - בר מצווה");
    assert.equal(details.eventType, "bar-mitzvah");
    assert.equal(details.date, "2026-10-11");
    assert.equal(details.time, "19:30");
    assert.equal(isPlaceholderEventTitle(details.title), false);
    assert.equal(isPlaceholderEventTime(details.time), false);

    const mismatches = detectGuestEventDetailsMismatch(event, invitation);
    assert.ok(mismatches.some((row) => row.field === "title"));
    assert.ok(mismatches.some((row) => row.field === "date"));
    assert.ok(mismatches.some((row) => row.field === "time"));
    assert.equal(
      mismatches.find((row) => row.field === "title")?.guestWouldSee,
      "דויד חיים מלול - בר מצווה"
    );
  });

  it("syncs Event core from the live invitation and skips placeholder shells", () => {
    const synced = buildEventCoreSyncFromInvitation({
      title: "דויד חיים מלול - בר מצווה",
      eventType: "bar-mitzvah",
      eventDate: "2026-10-11T00:00:00.000Z",
      eventTime: "19:30",
      location: {
        name: "יסמין מתחם אירועים",
        address: "חלוצי התעשיה 67, חיפה",
        lat: 32.8171584,
        lng: 35.0564512,
      },
    });

    assert.equal(synced.title, "דויד חיים מלול - בר מצווה");
    assert.equal(synced.date, "2026-10-11");
    assert.equal(synced.time, "19:30");
    assert.equal(synced.eventType, "bar-mitzvah");
    assert.equal(synced["location.name"], "יסמין מתחם אירועים");

    const skipped = buildEventCoreSyncFromInvitation({
      title: "הזמנה חדשה",
      eventTime: "00:00",
    });
    assert.equal(skipped.title, undefined);
    assert.equal(skipped.time, undefined);
  });

  it("prefers a later client edit over the Event creation shell", () => {
    const before = {
      title: "הזמנה חדשה",
      date: "2026-08-18",
      time: "00:00",
    };
    const afterEdit = {
      title: "בר המצווה של דויד",
      eventDate: "2026-11-05",
      eventTime: "20:00",
    };

    assert.equal(pickGuestFacingTitle(before, afterEdit), "בר המצווה של דויד");
    assert.equal(pickGuestFacingDate(before, afterEdit), "2026-11-05");
    assert.equal(pickGuestFacingTime(before, afterEdit), "20:00");

    const synced = buildEventCoreSyncFromInvitation(afterEdit);
    const resolved = resolveCentralEventDetails(
      { ...before, ...synced, date: synced.date, time: synced.time },
      afterEdit
    );
    assert.equal(resolved.title, "בר המצווה של דויד");
    assert.equal(resolved.date, "2026-11-05");
    assert.equal(resolved.time, "20:00");
  });
});
