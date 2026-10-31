import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CONTACT_FORM_LEAD_PROVIDER,
  CONTACT_FORM_LEAD_SOURCE,
  buildContactLeadNotes,
  buildContactLeadPayload,
  isValidContactPhone,
  normalizeContactPhone,
} from "../../lib/contact/contactPhone";

test("normalizeContactPhone keeps local Israeli numbers and strips +972", () => {
  assert.equal(normalizeContactPhone("050-123-4567"), "0501234567");
  assert.equal(normalizeContactPhone("+972 50 123 4567"), "0501234567");
  assert.equal(normalizeContactPhone("0097231234567"), "031234567");
  assert.equal(normalizeContactPhone("03-1234567"), "031234567");
});

test("isValidContactPhone accepts mobile, voip, and landline", () => {
  assert.equal(isValidContactPhone("0501234567"), true);
  assert.equal(isValidContactPhone("0721234567"), true);
  assert.equal(isValidContactPhone("03-1234567"), true);
  assert.equal(isValidContactPhone("12345"), false);
  assert.equal(isValidContactPhone(""), false);
});

test("contact lead payload is a CRM record and does not describe an outbound send", () => {
  const payload = buildContactLeadPayload({
    name: "דנה לוי",
    email: "dana@example.com",
    phone: "0501234567",
    subject: "אישורי הגעה",
    message: "אשמח לפרטים",
  });

  assert.equal(payload.status, "lead");
  assert.equal(payload.leadStatus, "new");
  assert.equal(payload.leadSource, CONTACT_FORM_LEAD_SOURCE);
  assert.equal(payload.leadProvider, CONTACT_FORM_LEAD_PROVIDER);
  assert.equal(payload.formName, "טופס יצירת קשר");
  assert.equal(payload.phone, "0501234567");
  assert.equal(payload.interestedService, "אישורי הגעה");
  assert.equal("whatsapp" in payload, false);
  assert.equal("sms" in payload, false);
  assert.match(buildContactLeadNotes({
    name: "דנה לוי",
    email: "dana@example.com",
    phone: "0501234567",
    subject: "אישורי הגעה",
    message: "אשמח לפרטים",
  }), /לא נשלחה הודעה אוטומטית/);
});

test("contact lead opening does not send WhatsApp, SMS, or a message record", () => {
  const root = path.resolve(__dirname, "../..");
  const leadSource = readFileSync(
    path.join(root, "lib/contact/openContactLead.ts"),
    "utf8"
  );
  const routeSource = readFileSync(path.join(root, "app/api/contact/route.ts"), "utf8");

  for (const source of [leadSource, routeSource]) {
    assert.doesNotMatch(
      source,
      /CustomerLeadMessage|sendRsvp|sendSms|lib\/whatsapp|lib\/sms/
    );
  }

  assert.match(routeSource, /openContactFormLead/);
  assert.match(leadSource, /CustomerFile\.create/);
});
