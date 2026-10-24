import PublicContentPage from "@/components/marketing/PublicContentPage";
import { serviceNode } from "@/lib/seo/jsonld";
import type { ServicePage } from "@/lib/seo/services";

export default function ServiceView({ service }: { service: ServicePage }) {
  return (
    <PublicContentPage
      eyebrow={service.eyebrow}
      title={service.h1}
      titleAccent={service.titleAccent}
      lede={service.lede}
      sections={service.sections}
      faqs={service.faqs}
      related={service.related}
      breadcrumbs={service.breadcrumbs}
      path={service.path}
      benefits={service.benefits}
      steps={service.steps}
      media={service.media}
      showEventTypes={service.showEventTypes}
      ctaTitle={service.ctaTitle}
      ctaLede={service.ctaLede}
      primaryCta={service.primaryCta}
      secondaryCta={service.secondaryCta}
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
