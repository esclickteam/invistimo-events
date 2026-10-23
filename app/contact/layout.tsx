import JsonLd from "@/components/seo/JsonLd";
import { graph, organizationNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/contact")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={graph([organizationNode()])} />
      {children}
    </>
  );
}
