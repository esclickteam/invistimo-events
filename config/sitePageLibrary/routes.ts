import type { PostLoginPageTypeId } from "@/types/sitePageLibrary";

/** נתיבים אוטומטיים לעמודים אחרי התחברות — יחוברו ל-shareId של ההזמנה */
export function getPostLoginRoute(
  pageType: PostLoginPageTypeId,
  shareId: string
): string {
  const base = `/wedding/${encodeURIComponent(shareId)}`;

  const routes: Record<PostLoginPageTypeId, string> = {
    login: `${base}/login`,
    register: `${base}/register`,
    account: `${base}/account`,
    orders: `${base}/orders`,
    dashboard: `${base}/dashboard`,
    profile: `${base}/profile`,
    settings: `${base}/settings`,
    messages: `${base}/messages`,
    "rsvp-status": `${base}/rsvp-status`,
  };

  return routes[pageType];
}

export function getPublicPageRoute(
  categoryId: string,
  shareId: string,
  slug?: string
): string {
  const pageSlug = slug || categoryId;
  return `/wedding/${encodeURIComponent(shareId)}/${encodeURIComponent(pageSlug)}`;
}
