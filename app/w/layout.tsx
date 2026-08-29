import type { ReactNode } from "react";
import "../wedding-website/wedding-website.css";

export const metadata = {
  title: "אתר חתונה | Invistimo",
  description: "אתר חתונה אישי",
};

export default function PublicWeddingWebsiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
