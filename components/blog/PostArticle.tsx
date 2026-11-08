import Link from "next/link";
import { formatReadingTime } from "@/lib/blog/reading";
import { BLOG_HUB_PATH, categoryPath, type BlogCategoryId } from "@/lib/blog/taxonomy";

export type PostBlock =
  | { type: "p"; text: string }
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; id: string; text: string };

export function blocksFromBody(body: string): PostBlock[] {
  const chunks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const blocks: PostBlock[] = [];
  let heading = 0;
  for (const chunk of chunks) {
    const text = chunk.trim();
    if (!text) continue;
    if (text.startsWith("### ")) {
      heading += 1;
      blocks.push({ type: "h3", id: `s-${heading}`, text: text.slice(4).trim() });
    } else if (text.startsWith("## ")) {
      heading += 1;
      blocks.push({ type: "h2", id: `s-${heading}`, text: text.slice(3).trim() });
    } else {
      blocks.push({ type: "p", text });
    }
  }
  return blocks;
}

export default function PostArticle({
  title,
  excerpt,
  body,
  image,
  imageAlt,
  readingMinutes,
  categoryTitle,
  categoryId,
  faqs,
  related,
}: {
  title: string;
  excerpt: string;
  body: string;
  image?: string;
  imageAlt: string;
  readingMinutes: number;
  categoryTitle: string;
  categoryId: BlogCategoryId;
  faqs: { q: string; a: string }[];
  related: { href: string; title: string }[];
}) {
  const blocks = blocksFromBody(body);
  const toc = blocks.filter((block) => block.type === "h2" || block.type === "h3");

  return (
    <article dir="rtl" className="bg-[#FBF6EE] text-[#3F3025]">
      <header className="mx-auto max-w-3xl px-5 pb-6 pt-14 md:px-8 md:pt-20">
        <p className="text-sm font-semibold text-[#7A6042]">
          <Link href="/" className="hover:text-[#8A642E]">ראשי</Link>
          <span className="px-1.5 text-[#C7A56B]">/</span>
          <Link href={BLOG_HUB_PATH} className="hover:text-[#8A642E]">בלוג</Link>
          <span className="px-1.5 text-[#C7A56B]">/</span>
          <Link href={categoryPath(categoryId)} className="hover:text-[#8A642E]">{categoryTitle}</Link>
        </p>
        <h1 className="mt-6 text-4xl font-black leading-tight text-[#35281F] md:text-5xl">{title}</h1>
        <p className="mt-4 text-sm font-bold text-[#7A6042]">{formatReadingTime(readingMinutes)}</p>
        <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">{excerpt}</p>
      </header>

      {image ? (
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={imageAlt} className="aspect-[16/9] w-full object-cover" />
        </div>
      ) : null}

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:px-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {toc.length ? (
          <nav aria-label="תוכן עניינים" className="lg:sticky lg:top-28 lg:self-start">
            <details open className="border border-[#E6D2AA] bg-[#FFFDF8] p-4 lg:open">
              <summary className="cursor-pointer text-sm font-black text-[#8A642E] lg:hidden">תוכן עניינים</summary>
              <p className="hidden text-sm font-black text-[#8A642E] lg:block">תוכן עניינים</p>
              <ol className="mt-3 space-y-2">
                {toc.map((item) => (
                  <li key={item.id} className={item.type === "h3" ? "pr-3" : ""}>
                    <a href={`#${item.id}`} className="text-sm font-semibold text-[#35281F] hover:text-[#8A642E]">
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}

        <div className="max-w-3xl">
          {blocks.map((block, index) => {
            if (block.type === "h2") {
              return (
                <h2 id={block.id} key={block.id} className="mt-10 scroll-mt-28 text-2xl font-black text-[#35281F]">
                  {block.text}
                </h2>
              );
            }
            if (block.type === "h3") {
              return (
                <h3 id={block.id} key={block.id} className="mt-6 scroll-mt-28 text-xl font-black text-[#35281F]">
                  {block.text}
                </h3>
              );
            }
            return (
              <p key={`p-${index}`} className="mt-4 text-base leading-8 text-[#5C4A3A] md:text-lg">
                {block.text}
              </p>
            );
          })}

          {faqs.length ? (
            <section id="faq" className="mt-12">
              <h2 className="text-2xl font-black text-[#35281F]">שאלות נפוצות</h2>
              <div className="mt-4 space-y-3">
                {faqs.map((faq) => (
                  <details key={faq.q} className="border border-[#E6D2AA] bg-white px-4 py-3">
                    <summary className="cursor-pointer font-bold text-[#35281F]">{faq.q}</summary>
                    <p className="mt-2 leading-7 text-[#5C4A3A]">{faq.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {related.length ? (
            <section className="mt-12">
              <h2 className="text-2xl font-black text-[#35281F]">מאמרים קשורים</h2>
              <ul className="mt-4 space-y-2">
                {related.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="font-bold text-[#8A642E] hover:text-[#42182F]">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-12 border border-[#42182F] bg-[#42182F] px-6 py-8 text-[#FFF8F0]">
            <h2 className="text-2xl font-black">להמשיך עם Invistimo</h2>
            <p className="mt-3 leading-8 text-[#F6E7D4]">
              הזמנות, אישורי הגעה וסידורי הושבה במקום אחד. המחיר נקבע לפי החבילה ומספר הרשומות.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center bg-[#C9A45C] px-6 font-black text-[#1C1612]">
                לחבילות ומחירים
              </Link>
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center border border-[#E6D2AA] px-6 font-black">
                יצירת קשר
              </Link>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
