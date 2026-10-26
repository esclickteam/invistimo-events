"use client";

/**
 * Compatibility wrapper around the FAQ knowledge center.
 * Prefer importing FaqKnowledgeCenter from app/faq/components.
 */
import FaqKnowledgeCenter from "@/app/faq/components/FaqKnowledgeCenter";
import { ALL_FAQ_ITEMS } from "@/lib/seo/publicFaq";

export default function FAQAccordion() {
  return <FaqKnowledgeCenter items={ALL_FAQ_ITEMS} />;
}
