import Image from "next/image";
import Link from "next/link";
import DemoVideo from "@/components/marketing/DemoVideo";
import DeviceFrame from "@/components/marketing/DeviceFrame";

export type TimelineItem = { when: string; title: string; text: string };
export type TipBox = { title: string; text: string; tone?: "tip" | "warning" | "example" };
export type MessageExample = { label: string; body: string };
export type Mistake = { wrong: string; right: string };
export type GuideGalleryItem = {
  type: "image" | "video";
  src: string;
  alt?: string;
  caption?: string;
  device?: "laptop" | "phone";
  poster?: string;
};

const toneClass: Record<NonNullable<TipBox["tone"]>, string> = {
  tip: "border-[#0F766E] bg-[#F2F4F7]",
  warning: "border-[#C4896A] bg-[#FFF5F0]",
  example: "border-[#8AA6C7] bg-[#F4F8FC]",
};

export function GuideProblem({ text }: { text: string }) {
  return (
    <section className="border-y border-[#D5DBE3]/80 bg-[#FFFFFF] px-5 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-black tracking-wide text-[#0F766E]">למה זה בכלל כואב</p>
        <p className="mt-3 text-lg leading-9 text-[#1A222D] md:text-xl">{text}</p>
      </div>
    </section>
  );
}

export function GuideToc({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  if (items.length < 3) return null;
  return (
    <nav aria-label="תוכן העניינים" className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <p className="text-sm font-black text-[#0F766E]">במדריך הזה</p>
      <ol className="mt-4 space-y-2 border-r-2 border-[#D5DBE3] pr-4">
        {items.map((item, index) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="text-base font-bold text-[#3D4754] hover:text-[#0F766E]">
              <span className="ml-2 text-[#0F766E]">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function GuideTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <section id="timeline" className="px-5 py-12 md:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-black text-[#0B0E13]">לוח זמנים מומלץ</h2>
        <p className="mt-3 leading-8 text-[#3D4754]">
          לא יום קסם מהמערכת — מסגרת עבודה מול האולם והאורחים. התאימו לפי האירוע שלכם.
        </p>
        <ol className="relative mt-10 space-y-0 border-r-2 border-[#D5DBE3] pr-6">
          {items.map((item, index) => (
            <li key={item.title} className="relative pb-10 last:pb-0">
              <span
                className="absolute -right-[1.4rem] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#0B0E13] text-[11px] font-black text-[#F2F4F7]"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="text-sm font-black tracking-wide text-[#0F766E]">{item.when}</p>
              <h3 className="mt-1 text-xl font-black text-[#0B0E13]">{item.title}</h3>
              <p className="mt-2 leading-8 text-[#3D4754]">{item.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function GuideTips({ tips }: { tips: TipBox[] }) {
  return (
    <section id="tips" className="px-5 py-10 md:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <h2 className="text-3xl font-black text-[#0B0E13]">טיפים ודגשים</h2>
        {tips.map((tip) => (
          <aside
            key={tip.title}
            className={`rounded-2xl border px-5 py-4 ${toneClass[tip.tone || "tip"]}`}
          >
            <h3 className="font-black text-[#0B0E13]">{tip.title}</h3>
            <p className="mt-2 leading-8 text-[#3D4754]">{tip.text}</p>
          </aside>
        ))}
      </div>
    </section>
  );
}

export function GuideMessageExamples({ items }: { items: MessageExample[] }) {
  return (
    <section id="examples" className="bg-[#0B0E13] px-5 py-12 text-[#F2F4F7] md:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-black">דוגמאות ניסוח</h2>
        <p className="mt-3 leading-8 text-[#C8CED6]">
          טקסטים לדוגמה בלבד — לא תבניות חובה במערכת. התאימו לסגנון שלכם.
        </p>
        <ul className="mt-8 space-y-5">
          {items.map((item) => (
            <li key={item.label} className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="text-sm font-black text-[#0F766E]">{item.label}</p>
              <p className="mt-3 whitespace-pre-line leading-8 text-[#F2F4F7]">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function GuideMistakes({ items }: { items: Mistake[] }) {
  return (
    <section id="mistakes" className="px-5 py-12 md:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-black text-[#0B0E13]">טעויות נפוצות</h2>
        <ul className="mt-8 space-y-6">
          {items.map((item) => (
            <li key={item.wrong} className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[#E8C4B4] bg-[#FFF5F0] px-4 py-4">
                <p className="text-xs font-black text-[#A85A3A]">פחות מומלץ</p>
                <p className="mt-2 leading-7 text-[#3D4754]">{item.wrong}</p>
              </div>
              <div className="rounded-2xl border border-[#C7D9B8] bg-[#F7FBF2] px-4 py-4">
                <p className="text-xs font-black text-[#5A7A3A]">עדיף ככה</p>
                <p className="mt-2 leading-7 text-[#3D4754]">{item.right}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function GuideGallery({ items }: { items: GuideGalleryItem[] }) {
  return (
    <section id="gallery" className="px-5 py-12 md:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-black text-[#0B0E13]">איך זה נראה במערכת</h2>
        <p className="mt-3 max-w-2xl leading-8 text-[#3D4754]">
          תצוגות אמיתיות של הממשק — כדי שתראו בדיוק איך העבודה נראית לפני שמתחילים.
        </p>
        <ul className="mt-10 grid gap-10 md:grid-cols-2">
          {items.map((item) => (
            <li key={`${item.src}-${item.caption || ""}`}>
              {item.type === "video" ? (
                <DemoVideo src={item.src} poster={item.poster} caption={item.caption} />
              ) : item.device ? (
                <figure>
                  <DeviceFrame src={item.src} alt={item.alt || ""} variant={item.device} />
                  {item.caption ? (
                    <figcaption className="mt-3 text-sm font-semibold text-[#6B7583]">
                      {item.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ) : (
                <figure>
                  <div className="overflow-hidden rounded-2xl border border-[#D5DBE3]/60 bg-[#17120E]">
                    <Image
                      src={item.src}
                      alt={item.alt || ""}
                      width={1200}
                      height={750}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                  {item.caption ? (
                    <figcaption className="mt-3 text-sm font-semibold text-[#6B7583]">
                      {item.caption}
                    </figcaption>
                  ) : null}
                </figure>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm font-semibold text-[#6B7583]">
          רוצים ללחוץ בעצמכם?{" "}
          <Link href="/try" className="font-black text-[#0F766E] underline-offset-4 hover:underline">
            פתיחת הדמו האינטראקטיבי
          </Link>
        </p>
      </div>
    </section>
  );
}
