import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
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
          הסברים לפי איך ש־Invistimo עובדת: סדר ההודעות, הרשימה, ההושבה והמחיר. בלי מספרים שלא מופיעים במערכת.
        </p>
        <ul className="mt-10 space-y-4">
          {GUIDES.map((guide) => (
            <li key={guide.slug} className="rounded-3xl border border-[#E6D2AA] bg-white p-5">
              <h2 className="text-xl font-black text-[#35281F]">
                <Link href={guidePath(guide.slug)}>{guide.h1}</Link>
              </h2>
              <p className="mt-2 leading-7 text-[#5C4A3A]">{guide.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
