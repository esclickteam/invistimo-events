import { answerFor, tableFor } from "@/lib/seo/answers";
import FactTableView from "@/components/seo/FactTableView";

/**
 * Server-rendered short answer (and optional fact table) for crawlers and AI.
 * Must stay above client-only marketing chrome so the HTML includes the text.
 */
export default function AnswerFirst({ path }: { path: string }) {
  const answer = answerFor(path);
  const table = tableFor(path);
  if (!answer && !table) return null;

  return (
    <section
      dir="rtl"
      aria-label="תשובה קצרה"
      className="bg-[#FBF6EE] px-5 pb-2 pt-10 text-[#3F3025] md:pt-14"
    >
      <div className="mx-auto max-w-3xl">
        {answer ? (
          <div className="rounded-3xl border border-[#E6D2AA] bg-white px-5 py-5">
            <h2 className="text-xl font-black text-[#35281F]">התשובה הקצרה</h2>
            <p className="mt-3 text-lg leading-8 text-[#3F3025]">{answer}</p>
          </div>
        ) : null}
        {table ? <FactTableView table={table} /> : null}
      </div>
    </section>
  );
}
