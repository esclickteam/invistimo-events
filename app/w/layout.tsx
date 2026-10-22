import type { ReactNode } from "react";
import { NOINDEX } from "@/lib/seo/site";

export const metadata = NOINDEX;

export default function PublicWeddingSiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        [data-invistimo-chrome],
        header.site-header,
        footer.site-footer {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  );
}
