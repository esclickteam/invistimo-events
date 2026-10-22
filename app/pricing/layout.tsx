import JsonLd from "@/components/seo/JsonLd";
import { graph, organizationNode, serviceNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/pricing")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          serviceNode({
            name: "חבילות אישורי הגעה",
            description: route.description,
            path: route.path,
            serviceType: "אישורי הגעה",
          }),
        ])}
      />
      {children}
    </>
  );
}
