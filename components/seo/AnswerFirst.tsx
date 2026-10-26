/**
 * Previously rendered a dedicated short-answer chrome box for AEO.
 * That pattern was removed site-wide: answers stay in PAGE_ANSWERS /
 * answers.json / natural page copy + JSON-LD — not in a dedicated SEO box.
 *
 * Kept as a no-op so old imports do not break during migration; new pages
 * must not rely on this component for visible chrome.
 */
export default function AnswerFirst(_props: { path: string }) {
  return null;
}
