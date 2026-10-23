import { notFound } from "next/navigation";
import RichGuidePage from "@/components/marketing/RichGuidePage";
import { getGuide, GUIDES, guidePath } from "@/lib/seo/guides";
import { pageMetadata } from "@/lib/seo/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const path = guidePath(guide.slug);
  return pageMetadata({
    title: `${guide.title} | Invistimo`,
    description: guide.description,
    path,
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const path = guidePath(guide.slug);
  return <RichGuidePage guide={guide} path={path} />;
}
