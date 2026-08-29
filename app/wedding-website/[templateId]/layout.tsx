import type { ReactNode } from "react";

export default function WeddingTemplateDemoLayout({ children }: { children: ReactNode }) {
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
