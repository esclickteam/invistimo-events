import type { ReactNode } from "react";
import "./wedding-website.css";

export const metadata = {
  title: "אתרי חתונה | Invistimo",
  description: "10 תבניות פרימium לאתרי חתונה ואישורי הגעה — תצוגה מקדימה",
};

export default function WeddingWebsiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
