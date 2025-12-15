import FAQAccordion from "../components/FAQAccordion";

export const metadata = {
  title: "שאלות ותשובות | Invistimo",
  description:
    "שאלות ותשובות נפוצות על מערכת Invistimo – הזמנות דיגיטליות, אישורי הגעה, ניהול אורחים והפקת אירועים.",
};

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24">
      {/* כותרת ראשית */}
      <h1 className="text-4xl font-bold text-center mb-12">
        שאלות ותשובות
      </h1>

      {/* פתיח */}
      <section className="relative pr-6 mb-14">
        <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
        <p className="text-lg">
          ריכזנו עבורכם את השאלות הנפוצות ביותר בנוגע לשימוש במערכת{" "}
          <strong>Invistimo</strong>, לתהליכי עבודה, לחבילות ולפיצ’רים.
        </p>
        <p className="mt-3">
          לא מצאתם תשובה? ניתן לפנות אלינו דרך עמוד{" "}
          <strong>יצירת קשר</strong> ונשמח לעזור.
        </p>
      </section>

      {/* אקורדיון שאלות */}
      <FAQAccordion />
    </div>
  );
}
