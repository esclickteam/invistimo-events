import type { ReactNode } from "react";
import "./wedding-website.css";

import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

const route = findCoreRoute("/wedding-website")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: route.path,
});

export default function WeddingWebsiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
