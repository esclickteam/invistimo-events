import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "אתרי הזמנה אינטראקטיביים | INVISTIMO Preview",
  description:
    "קולקציית תבניות הזמנה דיגיטליות אינטראקטיביות — Preview בלבד, לא לפרודקשן.",
  robots: { index: false, follow: false, nocache: true },
};

export default function InteractiveInvitesPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
