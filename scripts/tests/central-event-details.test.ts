import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  eventTypeHeadline,
  mergeGiftsForMigration,
  normalizeCentralGifts,
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
});
