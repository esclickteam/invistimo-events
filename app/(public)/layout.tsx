import type { ReactNode } from "react";
import Script from "next/script";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />

      {/* ♿ נגישות – רק בדפים ציבוריים */}
      <Script
        src="https://cdn.userway.org/widget.js"
        data-account="HnP2BQ1axC"
        strategy="lazyOnload"
      />
    </>
  );
}
