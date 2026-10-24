import ServiceView from "@/components/marketing/ServiceView";
import { getService } from "@/lib/seo/services";
import { pageMetadata } from "@/lib/seo/site";

const service = getService("/rsvp/sms")!;

export const metadata = pageMetadata({
  title: service.title,
  description: service.description,
  path: service.path,
});

export default function SmsRsvpPage() {
  return <ServiceView service={service} />;
}
