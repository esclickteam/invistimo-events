import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import { PILLARS } from "@/lib/seo/clusters";
import { guidePath, GUIDES } from "@/lib/seo/guides";
import { breadcrumbNode, graph, organizationNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/info/guides")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function GuidesPage() {
  return (
    <main dir="rtl" className="bg-[#FBF6EE] px-5 py-16 text-[#3F3025] md:py-24">
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode([
            { name: "ראשי", path: "/" },
            { name: "מדריכים", path: "/info/guides" },
          ]),
        ])}
      />
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-[#7A6042]">
          <Link href="/">ראשי</Link>
          <span className="px-1.5 text-[#C7A56B]">/</span>
          מדריכים
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-[#35281F] md:text-5xl">
          מדריכים לאישורי הגעה ולהזמנה
        </h1>
        <p className="mt-5 text-lg leading-8 text-[#5C4A3A]">
          כל מדריך שייך לנושא אחד: אישורי הגעה, הזמנה דיגיטלית, הושבה או ניהול האירוע. המדריך מסביר. עמוד השירות הוא המקום להתקדם לחבילה.
        </p>
        <div className="mt-10 space-y-10">
          {PILLARS.map((pillar) => {
            const guides = GUIDES.filter((guide) =>
              pillar.clusters.some((item) => item.path === guidePath(guide.slug))
            );
            return (
              <section key={pillar.id}>
                <h2 className="text-2xl font-black text-[#35281F]">
                  <Link href={pillar.path}>{pillar.name}</Link>
                </h2>
                <p className="mt-2 leading-7 text-[#5C4A3A]">{pillar.summary}</p>
                {guides.length ? (
                  <ul className="mt-4 space-y-4">
                    {guides.map((guide) => (
                      <li key={guide.slug} className="rounded-3xl border border-[#E6D2AA] bg-white p-5">
                        <h3 className="text-xl font-black text-[#35281F]">
                          <Link href={guidePath(guide.slug)}>{guide.h1}</Link>
                        </h3>
                        <p className="mt-2 leading-7 text-[#5C4A3A]">{guide.description}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 leading-7 text-[#5C4A3A]">
                    הפירוט נמצא בעמוד {pillar.name}, בלי מדריך נפרד שמחזור אותו.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
