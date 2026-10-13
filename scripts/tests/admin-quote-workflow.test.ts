import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { servicePrice } from "../../lib/pricing/packageQuote";
import {
  appendSendHistory,
  buildQuoteUserCommercials,
  describeDealGap,
  editorView,
  hydrateAdminQuoteForm,
  isSignedAgreement,
  planQuoteUserAction,
  publishPendingRevision,
  saveDocumentEdit,
  shouldSkipDuplicateSms,
  toUserPlan,
  userLinkStatus,
} from "../../lib/adminQuoteWorkflow";

const root = path.resolve(__dirname, "../..");

function read(relative: string) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

const storedQuote = {
  type: "quote",
  token: "quote-token",
  status: "sent",
  client: {
    fullName: "נועה כהן",
    email: "noa@example.com",
    phone: "0501234567",
    idNumber: "",
    address: "",
  },
  event: {
    name: "חתונת נועה",
    date: "2026-08-12",
    city: "תל אביב",
    venueName: "גן הפקאן",
  },
  selectedPackage: {
    key: "personal",
    title: "Invistimo Personal",
    records: 450,
    price: 4800,
    actualPrice: 4800,
  },
  upsells: [
    {
      key: "venueSeating",
      title: "הושבה באולם",
      price: 1600,
      actualPrice: 1600,
      staffCount: 2,
    },
  ],
  totals: {
    discountAmount: 300,
    fullPaymentDiscount: 0,
    grossAmountAfterDiscount: 6100,
    grossAmountBeforeDiscount: 6400,
    paymentMode: "split",
    stripeAmount: 4000,
    paymentSchedule: { immediateTotal: 4000, eventDayTotal: 2100 },
    quotePricingDisplay: "showUpsellPrices",
  },
  quote: { createdAt: "2026-05-01", expiresAt: "2026-05-05" },
  builderState: {
    version: 1,
    clientName: "נועה כהן",
    clientEmail: "noa@example.com",
    clientPhone: "0501234567",
    customerIdNumber: "",
    clientAddress: "",
    eventName: "חתונת נועה",
    eventDate: "2026-08-12",
    eventCity: "תל אביב",
    venueName: "גן הפקאן",
    seatingScheduleTimes: {
      receptionStartTime: "18:00",
      plannedChuppahTime: "19:30",
      plannedSeatingStartTime: "20:00",
      teamArrivalTime: "17:00",
    },
    rsvpSiteMode: "standard",
    selectedPlanKey: "personal",
    callsType: "human",
    records: "450",
    selectedUpsells: {
      digitalSeating: false,
      creditGifts: false,
      venueSeating: true,
      eventDayManager: false,
      personalRepresentative: false,
      thirdRsvpRound: false,
      preRsvpMessages: false,
      suppliersBudgetSystem: false,
      alcoholManagement: false,
      transportationManagement: false,
    },
    preRsvpUpsellMode: "save_the_date_only",
    venueSeatingStaffCount: 2,
    alcoholManagementStaffCount: 1,
    suppliersBudgetFree: false,
    paymentMode: "split",
    customInitialPayment: "4000",
    adminPackagePriceOverride: 4800,
    adminUpsellPriceOverrides: { venueSeating: 1600 },
    adminDiscountType: "amount",
    adminDiscountValue: 300,
    adminCustomTotalEnabled: false,
    adminCustomTotal: "",
    adminSpecialOfferExpiresAt: "",
    quotePricingDisplay: "showUpsellPrices",
    quoteCreatedAt: "2026-05-01",
    quoteExpiresAt: "2026-05-05",
    documentType: "quote",
  },
};

test("edit hydration keeps stored records, package, addon, price and discount", () => {
  const catalogPrice = servicePrice("personal", 450);
  assert.notEqual(catalogPrice, 4800);

  const form = hydrateAdminQuoteForm(storedQuote);
  assert.equal(form.records, "450");
  assert.equal(form.selectedPlanKey, "personal");
  assert.equal(form.selectedUpsells.venueSeating, true);
  assert.equal(form.adminPackagePriceOverride, 4800);
  assert.equal(form.adminUpsellPriceOverrides.venueSeating, 1600);
  assert.equal(form.adminDiscountType, "amount");
  assert.equal(form.adminDiscountValue, 300);
  assert.equal(form.callsType, "human");
  assert.equal(form.eventName, "חתונת נועה");
  assert.notEqual(form.adminPackagePriceOverride, catalogPrice);
});

test("a quote without builder state still locks the saved price", () => {
  const { builderState: _builder, ...withoutBuilder } = storedQuote;
  const form = hydrateAdminQuoteForm(withoutBuilder);
  assert.equal(form.records, "450");
  assert.equal(form.selectedPlanKey, "personal");
  assert.equal(form.adminPackagePriceOverride, 4800);
  assert.equal(form.selectedUpsells.venueSeating, true);
  assert.equal(form.adminDiscountValue, 300);
});

test("saving a sent quote keeps the published copy and does not send SMS", () => {
  const saved = saveDocumentEdit(
    storedQuote,
    {
      selectedPackage: { ...storedQuote.selectedPackage, price: 5000 },
      totals: { ...storedQuote.totals, grossAmountAfterDiscount: 6300 },
      builderState: {
        ...storedQuote.builderState,
        adminPackagePriceOverride: 5000,
      },
    },
    "admin-1",
  );
  assert.equal(saved.ok, true);
  if (!saved.ok || saved.mode !== "revision") {
    assert.fail("expected an unpublished revision");
  }
  assert.equal(storedQuote.selectedPackage.price, 4800);
  assert.equal(
    (saved.draftRevision.selectedPackage as { price?: number }).price,
    5000,
  );

  const withDraft = { ...storedQuote, draftRevision: saved.draftRevision };
  const reloaded = hydrateAdminQuoteForm(withDraft);
  assert.equal(reloaded.adminPackagePriceOverride, 5000);
  assert.equal(reloaded.records, "450");
  assert.equal(reloaded.selectedUpsells.venueSeating, true);
  assert.equal(
    (editorView(withDraft).selectedPackage as { price?: number }).price,
    5000,
  );
  assert.equal(withDraft.sms, undefined);
});

test("explicit publish archives the sent copy and then a quote SMS is separate from an agreement", () => {
  const draft = saveDocumentEdit(
    storedQuote,
    { selectedPackage: { ...storedQuote.selectedPackage, price: 5100 } },
    "admin-1",
  );
  assert.equal(draft.ok, true);
  if (!draft.ok) return;

  const published = publishPendingRevision(
    { ...storedQuote, draftRevision: draft.draftRevision, sms: { message: "quote" } },
    "admin-1",
  );
  assert.equal(published.changed, true);
  if (!published.changed) return;
  assert.equal(published.doc.selectedPackage.price, 5100);
  assert.equal(published.doc.versionHistory[0].selectedPackage.price, 4800);
  assert.equal(published.doc.draftRevision, null);

  const quoteSms = shouldSkipDuplicateSms({
    sms: null,
    nextMessage: "הצעת מחיר",
    nextPhone: "0501234567",
    idempotencyKey: "quote-1",
  });
  assert.equal(quoteSms.skip, false);

  const agreement = {
    type: "agreement",
    token: "agreement-token",
    status: "draft",
    sourceQuoteToken: "quote-token",
    sms: null,
    sendHistory: [],
  };
  const agreementSms = shouldSkipDuplicateSms({
    sms: agreement.sms,
    sendHistory: agreement.sendHistory,
    nextMessage: "הסכם לחתימה",
    nextPhone: "0501234567",
    idempotencyKey: "agreement-1",
  });
  assert.equal(agreementSms.skip, false);
  assert.notEqual(agreement.token, storedQuote.token);
});

test("a repeated send of the same document is skipped, a later explicit send is allowed", () => {
  const now = Date.parse("2026-06-01T12:00:00Z");
  const recent = shouldSkipDuplicateSms({
    sms: {
      sentAt: new Date(now - 5_000).toISOString(),
      message: "הצעת מחיר",
      sentTo: "0501234567",
    },
    nextMessage: "הצעת מחיר",
    nextPhone: "0501234567",
    now,
  });
  assert.equal(recent.skip, true);

  const later = shouldSkipDuplicateSms({
    sms: {
      sentAt: new Date(now - 120_000).toISOString(),
      message: "הצעת מחיר",
      sentTo: "0501234567",
    },
    nextMessage: "הצעת מחיר",
    nextPhone: "0501234567",
    now,
  });
  assert.equal(later.skip, false);

  const history = appendSendHistory({}, { idempotencyKey: "same-click" });
  const replay = shouldSkipDuplicateSms({
    sendHistory: history,
    nextMessage: "הצעת מחיר",
    nextPhone: "0501234567",
    idempotencyKey: "same-click",
    now,
  });
  assert.equal(replay.skip, true);
});

test("creating a user from a sent quote copies the deal and creates no payment", () => {
  const decision = planQuoteUserAction({
    quoteEmail: "noa@example.com",
    quoteGross: 6100,
    packageKey: "personal",
    packageTitle: "Invistimo Personal",
    records: 450,
    callsType: "human",
    convertedUserId: null,
    convertedUserExists: false,
  });
  assert.equal(decision.action, "create");
  if (decision.action !== "create") return;
  assert.deepEqual(decision.payments, []);
  assert.equal(decision.commercials.paidAmount, 0);
  assert.equal(decision.commercials.totalDealAmount, 6100);
  assert.equal(decision.commercials.remainingAmount, 6100);
  assert.equal(decision.commercials.guests, 450);
  assert.equal(decision.commercials.priceKey, "personal");
  assert.equal(decision.commercials.plan, "plan2");
  assert.equal(decision.commercials.includeCalls, false);
});

test("an existing email is not duplicated and a deal gap is not overwritten", () => {
  const blocked = planQuoteUserAction({
    quoteEmail: "noa@example.com",
    quoteGross: 6100,
    packageKey: "personal",
    records: 450,
    convertedUserExists: false,
    existingByEmail: {
      id: "user-1",
      email: "noa@example.com",
      totalDealAmount: 9000,
      paidAmount: 2000,
      paymentsCount: 1,
    },
  });
  assert.equal(blocked.action, "reject");
  if (blocked.action !== "reject") return;
  assert.equal(blocked.code, "EMAIL_ALREADY_EXISTS");

  const gap = planQuoteUserAction({
    quoteEmail: "noa@example.com",
    quoteGross: 6100,
    packageKey: "personal",
    records: 450,
    convertedUserExists: false,
    existingByEmail: {
      id: "user-1",
      email: "noa@example.com",
      totalDealAmount: 9000,
      paidAmount: 2000,
      paymentsCount: 1,
    },
    linkExistingUser: true,
    confirmIdentity: true,
    expectedUserId: "user-1",
  });
  assert.equal(gap.action, "reject");
  if (gap.action !== "reject") return;
  assert.equal(gap.code, "DEAL_GAP");
  assert.equal(describeDealGap(6100, 9000)?.activeDealAmount, 9000);

  const linked = planQuoteUserAction({
    quoteEmail: "noa@example.com",
    quoteGross: 6100,
    packageKey: "personal",
    records: 450,
    convertedUserExists: false,
    existingByEmail: {
      id: "user-1",
      email: "noa@example.com",
      totalDealAmount: 9000,
      paidAmount: 2000,
      paymentsCount: 1,
    },
    linkExistingUser: true,
    confirmIdentity: true,
    expectedUserId: "user-1",
    acknowledgeDealGap: true,
  });
  assert.equal(linked.action, "link");
  if (linked.action !== "link") return;
  assert.equal(linked.updateDeal, false);
  assert.deepEqual(linked.payments, []);
});

test("a broken user link is not repaired by creating another user automatically", () => {
  const broken = planQuoteUserAction({
    quoteEmail: "noa@example.com",
    quoteGross: 6100,
    convertedUserId: "missing-user",
    convertedUserExists: false,
  });
  assert.equal(broken.action, "reject");
  if (broken.action !== "reject") return;
  assert.equal(broken.code, "BROKEN_LINK");
  assert.equal(userLinkStatus({ convertedUserId: "missing-user", userExists: false }), "broken");
  assert.equal(userLinkStatus({ convertedUserId: "user-1", userExists: true }), "created");
  assert.equal(userLinkStatus({ convertedUserId: "", userExists: false }), "none");
});

test("a signed agreement cannot be edited in place", () => {
  const signed = {
    type: "agreement",
    status: "signed",
    signature: { signedAt: "2026-06-02T10:00:00Z", signatureDataUrl: "data:image/png;base64,aQ==" },
    selectedPackage: { price: 6100 },
  };
  assert.equal(isSignedAgreement(signed), true);
  const saved = saveDocumentEdit(signed, { selectedPackage: { price: 100 } }, "admin-1");
  assert.equal(saved.ok, false);
  if (saved.ok) return;
  assert.equal(saved.error, "SIGNED_IMMUTABLE");
  assert.equal(signed.selectedPackage.price, 6100);
});

test("package keys from the quote map onto real user plans", () => {
  assert.equal(toUserPlan("messages"), "plan1");
  assert.equal(toUserPlan("personal"), "plan2");
  assert.equal(toUserPlan("hybrid"), "plan2");
  assert.equal(toUserPlan("voice"), "plan2");
  assert.equal(buildQuoteUserCommercials({
    packageKey: "messages",
    packageTitle: "הודעות",
    records: 450,
    gross: 3000,
  }).plan, "plan1");
});

test(
  "a signed agreement can be archived as a PDF without changing the quote",
  { skip: !fs.existsSync(path.join(root, "node_modules/pdf-lib")) },
  async () => {
    const { buildSignedAgreementPdf } = await import("../../lib/salesAgreementPdf");
    const pdf = await buildSignedAgreementPdf({
      client: { fullName: "נועה כהן", phone: "0501234567", email: "noa@example.com" },
      event: { name: "חתונת נועה", date: "2026-08-12" },
      selectedPackage: { title: "Invistimo Personal", records: 450, price: 4800 },
      totals: { grossAmountAfterDiscount: 6100 },
      signature: { fullName: "נועה כהן", date: "2026-06-01", signatureDataUrl: "" },
    });
    assert.ok(pdf.length > 500);
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  },
);

test("admin edit uses the create-user quote form instead of the sent document page", () => {
  const editPage = read("app/admin/sales/quotes/[token]/edit/page.tsx");
  const newPage = read("app/admin/sales/new/page.tsx");
  const quotesPage = read("app/admin/sales/quotes/page.tsx");
  const form = read("app/components/sales/AdminSalesQuoteForm.tsx");

  assert.match(editPage, /AdminSalesQuoteForm/);
  assert.match(editPage, /mode="edit"/);
  assert.doesNotMatch(editPage, /sales-documents\/\$\{encodeURIComponent\(token\)\}\?edit=1/);
  assert.match(newPage, /AdminSalesQuoteForm/);
  assert.match(newPage, /mode="create"/);
  assert.match(quotesPage, /\/admin\/sales\/quotes\/\$\{encodeURIComponent\(quote\.token\)\}\/edit/);
  assert.doesNotMatch(quotesPage, /sales-documents\/\$\{encodeURIComponent\(quote\.token\)\}\?edit=1/);
  assert.match(form, /mode === "edit"/);
  assert.match(form, /שמירה ללא שליחה/);
  assert.match(form, /הסכם תנאי עסקה/);
  assert.match(form, /תצוגה מקדימה/);
  assert.match(form, /שליחה ישר ב־SMS/);
});
