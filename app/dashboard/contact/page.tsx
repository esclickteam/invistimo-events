"use client";

import ContactPage from "@/app/contact/page";

/* ============================================================
   Dashboard Contact Page
   אותו טופס "יצירת קשר" – בתוך הדשבורד
============================================================ */
export default function DashboardContactPage() {
  return (
    <div className="pt-16">
      {/* pt-16 כדי לפנות מקום להידר של הדשבורד */}
      <ContactPage />
    </div>
  );
}
