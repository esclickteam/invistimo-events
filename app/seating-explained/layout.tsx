import AnswerFirst from "@/components/seo/AnswerFirst";
import JsonLd from "@/components/seo/JsonLd";
import { clusterSiblings } from "@/lib/seo/clusters";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";
import Link from "next/link";

const route = findCoreRoute("/seating-explained")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

const faqs = [
  {
    q: "האם ההושבה כלולה בכל חבילה?",
    a: "לא. הושבה דיגיטלית היא תוספת במחשבון החבילות.",
  },
  {
    q: "איך האורח מקבל את מספר השולחן?",
    a: "אחרי השיבוץ אפשר לשלוח הודעה אישית עם מספר השולחן. גם בתזכורת ה־SMS מופיע מספר שולחן כשיש הושבה.",
  },
];

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "סידורי הושבה", path: "/seating-explained" },
];

export default function SeatingLayout({ children }: { children: React.ReactNode }) {
  const siblings = clusterSiblings("/seating-explained");

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          serviceNode({
            name: "סידורי הושבה",
            description: route.description,
            path: route.path,
            serviceType: "סידורי הושבה",
          }),
          faqNode(faqs),
        ])}
      />
      <AnswerFirst path="/seating-explained" />
      {children}
      {siblings.length ? (
        <section dir="rtl" className="bg-[#FBF6EE] px-6 pb-10 text-[#3F3025]">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-xl font-black text-[#35281F]">באותו נושא</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {siblings.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className="inline-flex min-h-11 items-center rounded-full border border-[#E6D2AA] bg-white px-4 py-2 text-sm font-bold text-[#5E4735]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
