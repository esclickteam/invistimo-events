import JsonLd from "@/components/seo/JsonLd";
import { graph, organizationNode, serviceNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/seating-explained")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function SeatingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          serviceNode({
            name: "סידורי הושבה",
            description: route.description,
            path: route.path,
            serviceType: "סידורי הושבה",
          }),
        ])}
      />
      {children}
    </>
  );
}
