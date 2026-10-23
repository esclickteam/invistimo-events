import ServiceView from "@/components/marketing/ServiceView";
import { getService } from "@/lib/seo/services";
import { pageMetadata } from "@/lib/seo/site";

const service = getService("/rsvp/chatuna")!;

export const metadata = pageMetadata({
  title: service.title,
  description: service.description,
  path: service.path,
});

export default function WeddingRsvpPage() {
  return <ServiceView service={service} />;
}
