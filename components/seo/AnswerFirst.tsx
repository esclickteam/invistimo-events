import { answerFor, tableFor } from "@/lib/seo/answers";
import FactTableView from "@/components/seo/FactTableView";

/**
 * Server-rendered short answer (and optional fact table) for crawlers and AI.
 * Must stay above client-only marketing chrome so the HTML includes the text.
 * Compact full-bleed strip — avoids a floating empty-looking card in the first viewport.
 */
export default function AnswerFirst({ path }: { path: string }) {
  const answer = answerFor(path);
  const table = tableFor(path);
  if (!answer && !table) return null;

  return (
    <section
      dir="rtl"
      aria-label="תשובה קצרה"
      className="border-b border-[#E6D2AA]/70 bg-[#FFFDF8] px-5 py-5 text-[#3F3025] md:px-8"
    >
      <div className="mx-auto max-w-6xl">
        {answer ? (
          <>
            <h2 className="text-sm font-black tracking-wide text-[#A67C3D]">התשובה הקצרה</h2>
            <p className="mt-2 max-w-4xl text-base leading-8 text-[#3F3025] md:text-lg">{answer}</p>
          </>
        ) : null}
        {table ? (
          <div className="mt-5">
            <FactTableView table={table} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
