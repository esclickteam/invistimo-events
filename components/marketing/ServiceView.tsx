import PublicContentPage from "@/components/marketing/PublicContentPage";
import { serviceNode } from "@/lib/seo/jsonld";
import type { ServicePage } from "@/lib/seo/services";

export default function ServiceView({ service }: { service: ServicePage }) {
  return (
    <PublicContentPage
      eyebrow={service.eyebrow}
      title={service.h1}
      lede={service.lede}
      sections={service.sections}
      faqs={service.faqs}
      related={service.related}
      breadcrumbs={service.breadcrumbs}
      extraJsonLd={[
        serviceNode({
          name: service.h1,
          description: service.description,
          path: service.path,
          serviceType: service.serviceType,
        }),
      ]}
    />
  );
}
