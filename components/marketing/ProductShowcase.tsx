import DeviceFrame from "@/components/marketing/DeviceFrame";

export type ShowcaseItem = {
  src: string;
  alt: string;
  caption?: string;
  device?: "laptop" | "phone";
};

type Props = {
  heading: string;
  lede?: string;
  items: ShowcaseItem[];
  /** Layout variety to avoid identical pages. */
  layout?: "duo" | "trio" | "hero-side" | "phone-pair";
};

/** Product screenshots in device frames — replaces empty decorative heroes. */
export default function ProductShowcase({ heading, lede, items, layout = "duo" }: Props) {
  if (!items.length) return null;

  return (
    <section className="relative px-5 py-12 md:px-8 md:py-16" aria-labelledby={`showcase-${heading.slice(0, 12)}`}>
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <h2 id={`showcase-${heading.slice(0, 12)}`} className="text-3xl font-black text-[#2A211A] md:text-4xl">
            {heading}
          </h2>
          {lede ? <p className="mt-3 text-base leading-8 text-[#5C4A3A] md:text-lg">{lede}</p> : null}
        </div>

        {layout === "hero-side" && items[0] ? (
          <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <DeviceFrame src={items[0].src} alt={items[0].alt} variant={items[0].device || "laptop"} />
            {items[1] ? (
              <div className="space-y-6">
                <DeviceFrame src={items[1].src} alt={items[1].alt} variant={items[1].device || "phone"} />
                {items[1].caption ? (
                  <p className="text-center text-sm font-semibold text-[#7A6042]">{items[1].caption}</p>
                ) : null}
              </div>
            ) : null}
            {items[0].caption ? (
              <p className="text-sm font-semibold text-[#7A6042] lg:col-span-2">{items[0].caption}</p>
            ) : null}
          </div>
        ) : null}

        {layout === "phone-pair" ? (
          <div className="mt-10 flex flex-wrap items-end justify-center gap-8">
            {items.map((item) => (
              <figure key={item.src} className="w-full max-w-[240px]">
                <DeviceFrame src={item.src} alt={item.alt} variant="phone" />
                {item.caption ? (
                  <figcaption className="mt-3 text-center text-sm font-semibold text-[#7A6042]">{item.caption}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}

        {layout === "duo" || layout === "trio" ? (
          <div
            className={`mt-10 grid items-end gap-8 ${
              layout === "trio" ? "md:grid-cols-3" : "md:grid-cols-2"
            }`}
          >
            {items.map((item) => {
              const device = item.device || "laptop";
              return (
                <figure
                  key={`${item.src}-${item.caption || item.alt}`}
                  className={device === "phone" ? "mx-auto w-full max-w-[260px]" : "w-full"}
                >
                  <DeviceFrame src={item.src} alt={item.alt} variant={device} />
                  {item.caption ? (
                    <figcaption className="mt-3 text-center text-sm font-semibold text-[#7A6042] md:text-right">
                      {item.caption}
                    </figcaption>
                  ) : null}
                </figure>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
