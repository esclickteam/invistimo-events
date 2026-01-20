"use client";

import { ClipboardList, Star, Users } from "lucide-react";
import ContactForm from "@/app/components/event/ContactForm";


export default function EventManagementPage() {
  const scrollToContact = () => {
    document
      .getElementById("contact")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="w-full bg-[#f6f6f6] text-right">
      {/* HERO */}
      <section
        className="relative h-[420px] flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1525268771113-32d9e9021a97')",
        }}
      >
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 max-w-4xl px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            תכנון והפקת אירועים
          </h1>
          <p className="text-lg md:text-xl opacity-90">
            חוסכים לכם זמן, כסף וכאב ראש – עם ניהול חכם ומדויק של האירוע
          </p>

          <button
            onClick={scrollToContact}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition px-6 py-3 rounded-lg font-medium"
          >
            לפרטים נוספים
          </button>
        </div>
      </section>

      {/* ליווי מלא */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-[#1f3b5c] mb-4">
          ליווי מלא באירוע
        </h2>
        <p className="text-gray-700 max-w-3xl mx-auto leading-relaxed">
          אנחנו כאן כדי לעזור לכם לעשות את זה כמו שצריך.
          <br />
          מניהול משימות, דרך תיאום ספקים ועד תפעול בזמן אמת ביום האירוע –
          הכל במקום אחד, בצורה מסודרת, חכמה ורגועה.
        </p>
      </section>

      {/* כרטיסים */}
      <section className="bg-gradient-to-b from-[#1f3b5c] to-[#162b45] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-3xl font-bold text-white text-center mb-12">
            מארגנים חתונה? ככה נוכל לעזור
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ServiceCard
              icon={<ClipboardList size={36} />}
              title="דגשים לאירוע"
              text="צ׳ק ליסט מפורט לתכנון והפקת האירוע – שלא תפספסו כלום"
            />

            <ServiceCard
              icon={<Star size={36} />}
              title="נותני שירות מומלצים"
              text="עוזרים לכם לסגור ספקים במחיר נכון ועם שקט נפשי"
            />

            <ServiceCard
              icon={<Users size={36} />}
              title="משא ומתן מול ספקים"
              text="ניהול מו״מ חכם מול ספקים כדי לחסוך כסף וזמן"
            />
          </div>

          <div className="text-center mt-12">
            <button
              onClick={scrollToContact}
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 transition px-8 py-3 rounded-lg text-white font-medium"
            >
              לפרטים נוספים
            </button>
          </div>
        </div>
      </section>

      {/* טופס יצירת קשר */}
      <ContactForm />
    </div>
  );
}

function ServiceCard({ icon, title, text }) {
  return (
    <div className="bg-white rounded-2xl p-6 text-center shadow-md">
      <div className="flex justify-center text-blue-600 mb-4">{icon}</div>
      <h4 className="text-lg font-bold mb-2">{title}</h4>
      <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
