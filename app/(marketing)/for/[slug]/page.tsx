import { notFound } from "next/navigation";
import EventLandingView from "@/components/marketing/EventLandingView";
import {
  allEventLandingSlugs,
  getEventLanding,
} from "@/lib/seo/eventLandings";
import { pageMetadata } from "@/lib/seo/site";

export function generateStaticParams() {
  return allEventLandingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landing = getEventLanding(slug);
  if (!landing) return {};
  return pageMetadata({
    title: landing.title,
    description: landing.description,
    path: landing.path,
  });
}

export default async function EventLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landing = getEventLanding(slug);
  if (!landing) notFound();
  return <EventLandingView landing={landing} />;
}
