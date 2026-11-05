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
        html[data-ww-embed="1"] #userwayAccessibilityIcon,
        html[data-ww-embed="1"] #userwayAccessibilityIconRoot,
        html[data-ww-embed="1"] #userwayAccessibilityIconWrapper,
        html[data-ww-embed="1"] .userway_buttons_wrapper,
        html[data-ww-embed="1"] .uwy,
        html[data-ww-embed="1"] .uai,
        html[data-ww-embed="1"] .uwaw-widget-launcher,
        html[data-ww-embed="1"] button[aria-label*="Accessibility"],
        html[data-ww-embed="1"] button[aria-label*="נגישות"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>
      <script
        dangerouslySetInnerHTML={{
          __html:
            '(function(){try{var e=new URLSearchParams(location.search).get("embed");if(e==="1"||e==="true")document.documentElement.setAttribute("data-ww-embed","1");}catch(err){}})();',
        }}
      />
      {children}
    </>
  );
}
