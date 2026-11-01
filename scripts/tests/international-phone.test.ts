import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { SAVE_THE_DATE_TEMPLATE_NAME } from "../../lib/whatsapp/approvedTemplates";
import {
  guestPhoneQueryValues,
  parseGuestPhone,
  phoneFieldError,
  phoneSearchMatches,
  prepareGuestImportPhone,
  sameGuestPhone,
  selectWhatsappRecipients,
  toSmsDigits,
  toWhatsappDigits,
  toWhatsappRecipient,
  unsupportedWhatsappSummary,
} from "../../lib/phones/international";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const EXAMPLES = [
  { label: "ישראל", input: "+972526850711", to: "972526850711", callingCode: "972" },
  { label: "ארצות הברית", input: "+12109444809", to: "12109444809", callingCode: "1" },
  { label: "בריטניה", input: "+447911123456", to: "447911123456", callingCode: "44" },
  { label: "צרפת", input: "+33612345678", to: "33612345678", callingCode: "33" },
  { label: "גרמניה", input: "+4915123456789", to: "4915123456789", callingCode: "49" },
  { label: "איטליה", input: "+393331234567", to: "393331234567", callingCode: "39" },
];

test("example international numbers are valid WhatsApp recipients", () => {
  for (const example of EXAMPLES) {
    const recipient = toWhatsappRecipient(example.input);
    assert.equal(recipient.ok, true, example.label);
    if (!recipient.ok) continue;
    assert.equal(recipient.to, example.to, example.label);
    assert.equal(recipient.callingCode, example.callingCode, example.label);
    assert.equal(recipient.e164, example.input, example.label);
    assert.equal(toWhatsappDigits(recipient.to), example.to, example.label);
  }
});

test("the stored US number passes Save The Date recipient filtering", () => {
  const guests = [
    { _id: "us", phone: "12109444809" },
    { _id: "blank", phone: "" },
    { _id: "junk", phone: "12345" },
    { _id: "il", phone: "052-685-0711" },
  ];

  const { accepted, rejected } = selectWhatsappRecipients(guests);
  const us = accepted.find((item) => item.guest._id === "us");
  const il = accepted.find((item) => item.guest._id === "il");

  assert.ok(us);
  assert.equal(us?.to, "12109444809");
  assert.equal(us?.e164, "+12109444809");
  assert.equal(us?.country, "US");
  assert.notEqual(us?.to, "97212109444809");
  assert.equal(il?.to, "972526850711");
  assert.equal(il?.e164, "+972526850711");
  assert.equal(rejected.some((item) => item.guest._id === "junk"), true);
  assert.equal(
    rejected.find((item) => item.guest._id === "blank")?.reason,
    "missing"
  );

  assert.equal(SAVE_THE_DATE_TEMPLATE_NAME, "save_the_date_image_he");
  assert.deepEqual(
    {
      messaging_product: "whatsapp",
      to: us?.to,
      type: "template",
      template: { name: SAVE_THE_DATE_TEMPLATE_NAME },
    },
    {
      messaging_product: "whatsapp",
      to: "12109444809",
      type: "template",
      template: { name: "save_the_date_image_he" },
    }
  );
});

test("Israeli local forms stay Israeli and are not confused with other countries", () => {
  for (const input of ["0526850711", "526850711", "972526850711", "+972 52-685-0711"]) {
    const parsed = parseGuestPhone(input);
    assert.equal(parsed.ok, true, input);
    if (!parsed.ok) continue;
    assert.equal(parsed.e164, "+972526850711", input);
    assert.equal(parsed.country, "IL", input);
  }

  const explicitIsrael = parseGuestPhone("12109444809", {
    country: "IL",
    countryExplicit: true,
  });
  assert.equal(explicitIsrael.ok, false);

  const frenchLocal = parseGuestPhone("0612345678");
  assert.equal(frenchLocal.ok, false);

  const frenchSelected = parseGuestPhone("0612345678", {
    country: "FR",
    countryExplicit: true,
  });
  assert.equal(frenchSelected.ok, true);
  if (frenchSelected.ok) assert.equal(frenchSelected.e164, "+33612345678");

  const pastedOverIsrael = parseGuestPhone("+1 (210) 944-4809", {
    country: "IL",
    countryExplicit: true,
  });
  assert.equal(pastedOverIsrael.ok, true);
  if (pastedOverIsrael.ok) {
    assert.equal(pastedOverIsrael.e164, "+12109444809");
    assert.equal(pastedOverIsrael.country, "US");
  }
});

test("duplicate phone forms collapse to one E.164 identity", () => {
  assert.equal(sameGuestPhone("+12109444809", "12109444809"), true);
  assert.equal(sameGuestPhone("0012109444809", "+1 210-944-4809"), true);
  assert.equal(sameGuestPhone("0526850711", "+972526850711"), true);
  assert.equal(sameGuestPhone("+12109444809", "+972526850711"), false);

  const values = guestPhoneQueryValues("+12109444809");
  assert.ok(values.includes("+12109444809"));
  assert.ok(values.includes("12109444809"));

  const israeli = guestPhoneQueryValues("0526850711");
  assert.ok(israeli.includes("0526850711"));
  assert.ok(israeli.includes("+972526850711"));
  assert.ok(israeli.includes("972526850711"));
});

test("excel import keeps international numbers and skips duplicate or invalid rows", () => {
  const seen = new Set<string>(["+972526850711"]);
  assert.deepEqual(prepareGuestImportPhone("052-685-0711", seen), {
    status: "duplicate",
    e164: "+972526850711",
  });
  assert.deepEqual(prepareGuestImportPhone("+12109444809", seen), {
    status: "ok",
    e164: "+12109444809",
  });
  assert.deepEqual(prepareGuestImportPhone("12109444809", seen), {
    status: "duplicate",
    e164: "+12109444809",
  });
  assert.equal(prepareGuestImportPhone("12345", seen).status, "invalid");
  assert.equal(prepareGuestImportPhone("", seen).status, "empty");
  assert.deepEqual(
    prepareGuestImportPhone("0612345678", seen, "צרפת"),
    { status: "ok", e164: "+33612345678" }
  );
  assert.equal(prepareGuestImportPhone("0612345678", new Set()).status, "invalid");
});

test("search matches Israeli local input against stored E.164", () => {
  assert.equal(phoneSearchMatches("+972526850711", "0526850711"), true);
  assert.equal(phoneSearchMatches("+12109444809", "2109444809"), true);
  assert.equal(phoneSearchMatches("+12109444809", "0526850711"), false);
});

test("WhatsApp rejects landlines and countries where WhatsApp is unavailable", () => {
  const landline = toWhatsappRecipient("03-1234567");
  assert.equal(landline.ok, false);
  assert.equal(toSmsDigits("03-1234567"), "97231234567");

  const cuba = toWhatsappRecipient("+5351234567");
  assert.equal(cuba.ok, false);
  if (!cuba.ok) assert.equal(cuba.reason, "unsupported_country");
  assert.match(unsupportedWhatsappSummary([cuba.ok ? { reason: "missing", message: "" } : cuba]), /WhatsApp/);

  const stored = parseGuestPhone("+5351234567");
  assert.equal(stored.ok, true);
});

test("phone field reports an invalid national number and accepts a full international one", () => {
  assert.equal(phoneFieldError("", "IL"), "");
  assert.equal(phoneFieldError("12109444809", "IL").length > 0, true);
  assert.equal(phoneFieldError("+12109444809", "IL"), "");
  assert.equal(phoneFieldError("2109444809", "US"), "");
  assert.equal(phoneFieldError("0526850711", "IL"), "");
});

test("stored international forms stay valid and are not rewritten to Israel", () => {
  const stored = [
    "12109444809",
    "+12109444809",
    "1 (210) 944-4809",
    "+447911123456",
    "+33612345678",
    "+4915123456789",
    "+393331234567",
    "972526850711",
    "0526850711",
  ];

  for (const value of stored) {
    const recipient = toWhatsappRecipient(value);
    assert.equal(recipient.ok, true, value);
    if (!recipient.ok) continue;
    assert.notEqual(recipient.to, `972${value.replace(/\D/g, "")}`, value);
    assert.equal(recipient.to.startsWith("9721210"), false, value);
  }

  assert.equal(toWhatsappDigits("12109444809"), "12109444809");
  assert.equal(toWhatsappDigits("0526850711"), "972526850711");
  assert.equal(sameGuestPhone("+12109444809", "12109444809"), true);
  assert.equal(sameGuestPhone("+33612345678", "33612345678"), true);
  assert.equal(sameGuestPhone("+972526850711", "0526850711"), true);
  assert.equal(sameGuestPhone("+12109444809", "+972526850711"), false);

  const claims = read("lib/guestPhonePolicy.ts");
  assert.match(claims, /patch\.phoneNormalized = key/);
  assert.doesNotMatch(claims, /patch\.phone =/);
  assert.doesNotMatch(claims, /deleteMany\(\{\s*_id:\s*guest/);
  const rsvp = read("app/api/invite/[shareId]/rsvp/route.ts");
  assert.match(rsvp, /token/);
  assert.match(rsvp, /findOne\(\{\s*token,/);
});

test("send paths use the shared normalizer instead of an Israeli-only filter", () => {
  const preRsvp = read("app/api/messages/pre-rsvp/whatsapp/route.ts");
  const sendTemplate = read("app/api/whatsapp/send-template/route.ts");
  const worker = read("workers/sendScheduledSms.ts");
  const media = read("lib/whatsapp/sendRsvpTemplateMedia.ts");
  const thankYou = read("lib/whatsapp/sendThankYouTemplate.ts");
  const table = read("lib/whatsapp/sendTableNumberTemplate.ts");
  const gift = read("lib/whatsapp/sendRsvpWithGiftTemplate.ts");
  const cron = read("app/api/cron/whatsapp/route.ts");
  const smsSend = read("app/api/sms/send/route.ts");
  const messagesSend = read("app/api/messages/send/route.ts");
  const fallback = read("lib/sms/whatsappSmsFallback.ts");
  const sendSms = read("lib/sendSMS.ts");
  const smsReport = read("lib/sms4free/roundReport.ts");
  const employee = read(
    "app/api/employee/call-tasks/[taskId]/send-rsvp-invite/route.ts"
  );

  assert.match(preRsvp, /selectWhatsappRecipients/);
  assert.doesNotMatch(preRsvp, /\^05\\d\{8\}/);
  assert.match(sendTemplate, /toWhatsappDigits/);
  assert.match(worker, /toWhatsappDigits/);
  assert.match(worker, /const phone = normalizePhone\(guest\.phone\)/);
  assert.doesNotMatch(worker, /toIsraeliSmsDigits/);
  assert.match(worker, /import \{ toWhatsappDigits \} from "@\/lib\/phones\/international"/);
  assert.match(media, /toWhatsappDigits/);
  assert.match(thankYou, /toWhatsappDigits/);
  assert.match(table, /toWhatsappDigits/);
  assert.match(gift, /toWhatsappDigits/);
  assert.match(cron, /sendRsvpTemplateMedia/);
  assert.doesNotMatch(smsSend, /lib\/phones\/international|toIsraeliSmsDigits/);
  assert.doesNotMatch(messagesSend, /lib\/phones\/international|toIsraeliSmsDigits/);
  assert.doesNotMatch(sendSms, /lib\/phones\/international|toIsraeliSmsDigits/);
  assert.doesNotMatch(smsReport, /lib\/phones\/international|toIsraeliSmsDigits/);
  assert.doesNotMatch(fallback, /lib\/phones\/international|toIsraeliSmsDigits/);
  assert.match(fallback, /phone\.length === 12 && phone\.startsWith\("9725"\)/);
  assert.match(employee, /normalizeIsraeliSmsPhone/);
  assert.match(employee, /toWhatsappDigits/);
  assert.doesNotMatch(media, /972\$\{p\.slice\(1\)\}/);
  assert.equal((table.match(/import \{ toWhatsappDigits \}/g) || []).length, 1);
});

test("existing Israeli SMS checks do not accept an international number", async () => {
  const { normalizeSmsPhone } = await import("../../lib/sendSMS");
  const { isValidSmsPhone } = await import("../../lib/sms/whatsappSmsFallback");

  assert.equal(normalizeSmsPhone("0521234567"), "972521234567");
  assert.equal(normalizeSmsPhone("052-685-0711"), "972526850711");
  assert.equal(isValidSmsPhone("0521234567"), true);
  assert.equal(isValidSmsPhone("052-685-0711"), true);
  assert.equal(isValidSmsPhone("12109444809"), false);
  assert.equal(isValidSmsPhone("+447911123456"), false);
  assert.equal(isValidSmsPhone("+33612345678"), false);
  assert.equal(isValidSmsPhone("+4915123456789"), false);
  assert.equal(isValidSmsPhone("+393331234567"), false);
});
