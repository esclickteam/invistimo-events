import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { INVISTIMO_WHATSAPP_PHONE } from "../../lib/pricing/packageQuote";
import {
  BUSINESS_WHATSAPP_PHONE,
  classifyPublicClick,
  sanitizeEventParams,
} from "../../lib/seo/analytics";

const root = path.resolve(process.cwd());

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function callBlock(source: string, needle: string) {
  const start = source.indexOf(needle);
  assert.notEqual(start, -1, needle);
  return source.slice(start, start + 240);
}

test("business WhatsApp number used for inquiries matches the public contact number", () => {
  assert.equal(BUSINESS_WHATSAPP_PHONE, INVISTIMO_WHATSAPP_PHONE);
});

test("clicks are classified without the link query or personal fields", () => {
  const prefilled = classifyPublicClick(
    "https://wa.me/972555039072?text=" + encodeURIComponent("שם: דנה\nטלפון: 0501234567"),
    "/contact",
    { placement: "contact_hero" }
  );
  assert.equal(prefilled?.name, "click_whatsapp");
  assert.deepEqual(prefilled?.params, { page_path: "/contact", placement: "contact_hero" });
  assert.equal(JSON.stringify(prefilled).includes("0501234567"), false);
  assert.equal(JSON.stringify(prefilled).includes("דנה"), false);

  assert.equal(
    classifyPublicClick("https://wa.me/?text=" + encodeURIComponent("מדריך"), "/info/guides"),
    null
  );
  assert.equal(classifyPublicClick("https://wa.me/972501234567", "/"), null);

  const packageClick = classifyPublicClick(
    "https://wa.me/972555039072?text=" + encodeURIComponent("חבילה: Voice\nכמות רשומות: 200"),
    "/pricing",
    { packageId: "voice", placement: "package_card" }
  );
  assert.equal(packageClick?.name, "click_package");
  assert.equal(packageClick?.params.package_id, "voice");
  assert.equal(packageClick?.params.page_path, "/pricing");
  assert.equal(JSON.stringify(packageClick).includes("200"), false);

  const register = classifyPublicClick("/register?plan=basic&email=person@example.com", "/pricing");
  assert.equal(register?.name, "click_register");
  assert.deepEqual(register?.params, { page_path: "/pricing", placement: "link" });

  const contact = classifyPublicClick("/contact#form", "/faq");
  assert.equal(contact?.name, "click_contact");
  assert.equal(contact?.params.channel, "form");
  assert.equal(contact?.params.destination, undefined);

  const mail = classifyPublicClick("mailto:support@invistimo.com", "/contact");
  assert.equal(mail?.name, "click_contact");
  assert.equal(mail?.params.channel, "email");
  assert.equal(JSON.stringify(mail).includes("support@"), false);

  assert.equal(classifyPublicClick("/pricing", "/"), null);
});

test("event params drop personal data and unknown keys", () => {
  assert.deepEqual(
    sanitizeEventParams({
      method: "contact",
      page_path: "/contact?email=person@example.com",
      email: "person@example.com",
      phone: "0501234567",
      name: "Dana",
      message: "hello",
      package_id: "not-a-package",
      currency: "USD",
    }),
    { method: "contact", page_path: "/contact" }
  );
});

test("completed inquiries stay separate from button clicks in the public handlers", () => {
  const quote = read("app/(marketing)/services/alcohol-management/QuoteForm.tsx");
  assert.match(quote, /generate_lead/);
  assert.match(quote, /alcohol_management_quote/);
  assert.match(quote, /if \(!data\.blocked\)/);
  assert.match(quote, /placement: "alcohol_quote"/);
  assert.doesNotMatch(quote, /whatsapp_inquiry/);
  assert.doesNotMatch(quote, /alcohol_management_whatsapp/);

  const contact = read("app/contact/page.tsx");
  assert.match(contact, /method: "contact"/);
  assert.match(contact, /if \(!data\.blocked\)/);
  assert.doesNotMatch(callBlock(contact, 'trackPublicEvent("generate_lead"'), /\b(name|email|phone|message)\b/);

  const eventFit = read("app/components/event/ContactForm.jsx");
  assert.match(eventFit, /if \(!data\.blocked\)/);

  const support = read("app/components/SupportBot.jsx");
  assert.match(support, /method: "support_widget"/);
  assert.doesNotMatch(callBlock(support, 'trackPublicEvent("generate_lead"'), /fullName|phone|email/);

  const register = read("app/(auth)/register/RegisterForm.tsx");
  assert.match(register, /trackSignupConversion\(isVenueClientRegistration \? "venue" : "site"\)/);

  const payment = read("app/payment/success/page.tsx");
  assert.match(payment, /trackPurchaseConversion\(\)/);
  assert.doesNotMatch(callBlock(payment, "trackPurchaseConversion("), /user|email|phone/);

  const pricing = read("app/pricing/page.tsx");
  assert.match(pricing, /data-package-id=\{packageId\}/);
  assert.match(pricing, /data-package-id=\{selectedQuote\.packageId\}/);

  const analytics = read("lib/seo/analytics.ts");
  assert.match(analytics, /send_page_view: false/);
  assert.match(analytics, /anonymize_ip: true/);
  assert.doesNotMatch(analytics, /allow_ad_personalization_signals: true/);
});
