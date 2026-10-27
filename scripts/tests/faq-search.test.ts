import test from "node:test";
import assert from "node:assert/strict";

import {
  faqTextMatches,
  highlightFaqMatch,
  normalizeFaqText,
  buildFaqSearchBlob,
} from "../../lib/seo/faq/search";

test("normalizeFaqText strips niqqud and punctuation", () => {
  assert.equal(normalizeFaqText("  וַואטְסַאפ!!!  "), "וואטסאפ");
});

test("faqTextMatches understands WhatsApp synonyms", () => {
  const hay = buildFaqSearchBlob(["איך שולחים הודעות WhatsApp לאישור הגעה"]);
  assert.equal(faqTextMatches("וואטסאפ", hay), true);
  assert.equal(faqTextMatches("whatsapp", hay), true);
  assert.equal(faqTextMatches("הושבה דינוזאור", hay), false);
});

test("faqTextMatches matches seating intent", () => {
  const hay = buildFaqSearchBlob(["איך משבצים אורחים לשולחנות במפת ההושבה"]);
  assert.equal(faqTextMatches("שיבוץ", hay), true);
  assert.equal(faqTextMatches("seating", hay), true);
});

test("highlightFaqMatch marks query tokens", () => {
  const parts = highlightFaqMatch("איך שולחים אישורי הגעה בוואטסאפ", "וואטסאפ");
  assert.ok(parts.some((p) => p.match));
  assert.equal(parts.map((p) => p.text).join(""), "איך שולחים אישורי הגעה בוואטסאפ");
});
