import PricingMarketingExtras, { PRICING_PAGE_FAQS } from "@/components/marketing/PricingMarketingExtras";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, faqNode, graph, organizationNode, serviceNode, softwareNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";
import "./pricing-luxury.css";

const route = findCoreRoute("/pricing")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

const breadcrumbs = [
  { name: "בית", path: "/" },
  { name: "חבילות ומחירים", path: "/pricing" },
];

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          breadcrumbNode(breadcrumbs),
          serviceNode({
            name: "חבילות אישורי הגעה",
            description: route.description,
            path: route.path,
            serviceType: "אישורי הגעה",
          }),
          softwareNode(route.description, "/pricing"),
          faqNode(PRICING_PAGE_FAQS),
        ])}
      />
      {children}
      <PricingMarketingExtras />
    </>
  );
}
