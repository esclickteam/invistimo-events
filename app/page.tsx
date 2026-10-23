import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HomePageClient from "./HomePageClient";
import AnswerFirst from "@/components/seo/AnswerFirst";
import JsonLd from "@/components/seo/JsonLd";
import { getDashboardPathFromAuthCookies } from "@/lib/auth/getDashboardRedirectPath";
import { graph, organizationNode, softwareNode, websiteNode } from "@/lib/seo/jsonld";
import { findCoreRoute, pageMetadata } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

const route = findCoreRoute("/")!;

export const metadata = pageMetadata({
  title: route.title,
  description: route.description,
  path: "/",
});

export default async function HomePage() {
  const cookieStore = await cookies();

  const dashboardPath = getDashboardPathFromAuthCookies({
    authToken: cookieStore.get("authToken")?.value,
    producerAuthToken: cookieStore.get("producerAuthToken")?.value,
    adminAuthToken: cookieStore.get("adminAuthToken")?.value,
    role: cookieStore.get("role")?.value,
    impersonationRole: cookieStore.get("impersonationRole")?.value,
    originalTargetRole: cookieStore.get("originalTargetRole")?.value,
  });

  if (dashboardPath) {
    redirect(dashboardPath);
  }

  return (
    <>
      <JsonLd
        data={graph([
          organizationNode(),
          websiteNode(),
          softwareNode(route.description, "/"),
        ])}
      />
      <AnswerFirst path="/" />
      <HomePageClient />
    </>
  );
}
