import EventManagementPage from "@/app/components/event/EventManagementPage";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import JsonLd from "@/components/seo/JsonLd";
import { graph, organizationNode, serviceNode, softwareNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/event-management");
if (!route) throw new Error("Missing SEO route /event-management");

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          softwareNode(route.description, "/event-management"),
          serviceNode({
            name: "מערכת ניהול אירועים",
            description: route.description,
            path: "/event-management",
            serviceType: "ניהול אירועים",
          }),
        ])}
      />
      <EventManagementPage />
      <ServiceLinks current="/event-management" />
    </>
  );
}
