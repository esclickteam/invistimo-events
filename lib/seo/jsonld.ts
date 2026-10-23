import { absoluteUrl, CONTENT_UPDATED, SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: "אינויסטימו",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/invistimo-logo.png"),
    },
    email: "support@invistimo.com",
    telephone: "+972555039072",
    taxID: "316576578",
    areaServed: { "@type": "Country", name: "IL" },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@invistimo.com",
        telephone: "+972555039072",
        availableLanguage: ["Hebrew", "he"],
        areaServed: "IL",
      },
    ],
    // sameAs is omitted until official, verified public profiles exist.
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "he-IL",
    publisher: { "@id": ORGANIZATION_ID },
    // SearchAction omitted: there is no public on-site search box.
  };
}

export function graph(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function breadcrumbNode(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqNode(faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function serviceNode(input: { name: string; description: string; path: string; serviceType: string }) {
  return {
    "@type": "Service",
    name: input.name,
    serviceType: input.serviceType,
    description: input.description,
    url: absoluteUrl(input.path),
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: "IL" },
    inLanguage: "he-IL",
  };
}

export function softwareNode(description: string, path = "/") {
  return {
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl(path),
    inLanguage: "he-IL",
    description,
    provider: { "@id": ORGANIZATION_ID },
  };
}

export function articleNode(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@type": "Article",
    headline: input.title,
    description: input.description,
    inLanguage: "he-IL",
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: CONTENT_UPDATED.toISOString().slice(0, 10),
    dateModified: CONTENT_UPDATED.toISOString().slice(0, 10),
    author: { "@id": ORGANIZATION_ID },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/invistimo-logo.png"),
      },
    },
  };
}

/**
 * VideoObject only when a public poster and a known upload/publish date exist.
 * Marketing autoplay clips without verified poster/date must not emit this type.
 */
export function videoNode(input: {
  name: string;
  description: string;
  contentUrl: string;
  posterUrl: string;
  uploadDate: string;
  path: string;
}) {
  return {
    "@type": "VideoObject",
    name: input.name,
    description: input.description,
    contentUrl: absoluteUrl(input.contentUrl),
    thumbnailUrl: [absoluteUrl(input.posterUrl)],
    uploadDate: input.uploadDate,
    inLanguage: "he-IL",
    publisher: { "@id": ORGANIZATION_ID },
    mainEntityOfPage: absoluteUrl(input.path),
  };
}
