import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/credit-gifts")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function CreditGiftsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
