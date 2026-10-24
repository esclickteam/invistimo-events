import DeviceFrame from "@/components/marketing/DeviceFrame";
import FactTableView from "@/components/seo/FactTableView";
import {
  answerFor,
  answerHeadingFor,
  answerVisualFor,
  tableFor,
} from "@/lib/seo/answers";

type AnswerFirstProps = {
  path: string;
  /** When true, omit the package comparison table (caller already renders it). */
  hideTable?: boolean;
  /** Dark surface for pages like wedding-website. */
  tone?: "light" | "dark";
  className?: string;
};

/**
 * Visible mid-page overview for visitors and crawlers.
 * Human heading + indexable copy; not visually hidden and not a robot-style SEO label.
 */
export default function AnswerFirst({
  path,
  hideTable = false,
  tone = "light",
  className = "",
}: AnswerFirstProps) {
  const answer = answerFor(path);
  const heading = answerHeadingFor(path);
  const visual = answerVisualFor(path);
  const table = hideTable ? null : tableFor(path);
  if (!answer && !table) return null;

  const isDark = tone === "dark";

  return (
    <section
      id="overview"
      dir="rtl"
      aria-labelledby={`overview-heading-${path.replace(/\W+/g, "-")}`}
      className={`px-5 py-14 md:px-8 md:py-16 ${
        isDark ? "border-y border-white/10 bg-[#12100E] text-white" : "bg-[#FFFDF8]/80 text-[#3F3025]"
      } ${className}`}
    >
      <div
        className={`mx-auto grid max-w-6xl items-center gap-10 ${
          visual ? "lg:grid-cols-[1.05fr_0.95fr]" : ""
        }`}
      >
        <div className={visual ? "" : "mx-auto max-w-3xl"}>
          <p
            className={`text-sm font-black tracking-[0.16em] ${
              isDark ? "text-[#C9A962]" : "text-[#8B642B]"
            }`}
          >
            סקירה
          </p>
          <h2
            id={`overview-heading-${path.replace(/\W+/g, "-")}`}
            className={`mt-3 text-3xl font-black md:text-4xl ${
              isDark ? "text-white" : "text-[#2A211A]"
            }`}
          >
            {heading}
          </h2>
          {answer ? (
            <p
              className={`mt-5 text-lg leading-9 md:text-xl ${
                isDark ? "text-white/75" : "text-[#5C4A3A]"
              }`}
            >
              {answer}
            </p>
          ) : null}
          {table ? (
            <div className={`mt-8 ${isDark ? "rounded-2xl bg-white p-4 text-[#3F3025]" : ""}`}>
              <FactTableView table={table} />
            </div>
          ) : null}
        </div>

        {visual ? (
          <DeviceFrame src={visual.src} alt={visual.alt} variant={visual.device} />
        ) : null}
      </div>
    </section>
  );
}
