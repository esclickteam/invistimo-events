import { answerFor, tableFor } from "@/lib/seo/answers";
import FactTableView from "@/components/seo/FactTableView";

/**
 * Machine-readable short answer for crawlers and AI.
 * Visually hidden from marketing visitors — SEO/AEO stays in HTML + JSON-LD + FAQs.
 */
export default function AnswerFirst({ path }: { path: string }) {
  const answer = answerFor(path);
  const table = tableFor(path);
  if (!answer && !table) return null;

  return (
    <section dir="rtl" aria-label="תשובה קצרה" className="sr-only">
      {answer ? (
        <>
          <h2>התשובה הקצרה</h2>
          <p>{answer}</p>
        </>
      ) : null}
      {table ? <FactTableView table={table} /> : null}
    </section>
  );
}
