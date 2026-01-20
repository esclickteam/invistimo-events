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
    <div className="w-full text-right bg-[#f6f7f9]">
      {/* HERO */}
      <section className="relative h-[440px] flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1525268771113-32d9e9021a97')",
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#143A5A]/90 to-[#0F2A44]/95" />

        <div className="relative z-10 max-w-4xl px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            תכנון והפקת אירועים
          </h1>

          <p className="text-lg md:text-xl text-white/90">
            חוסכים לכם זמן, כסף וכאב ראש – עם ניהול חכם ומדויק של האירוע
          </p>

          <button
            onClick={scrollToContact}
            className="
              mt-8 inline-flex items-center gap-2
              bg-[#3B82F6] hover:bg-[#2563EB]
              transition
              px-7 py-3 rounded-xl
              font-semibold text-white
              shadow-lg shadow-blue-500/20
            "
          >
            לפרטים נוספים
          </button>
        </div>
      </section>

      {/* CARDS */}
      <section className="bg-gradient-to-b from-[#143A5A] to-[#0F2A44] py-20">
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

          <div className="text-center mt-14">
            <button
              onClick={scrollToContact}
              className="
                inline-flex items-center gap-2
                bg-[#3B82F6] hover:bg-[#2563EB]
                transition
                px-9 py-3 rounded-xl
                text-white font-semibold
                shadow-lg shadow-blue-500/20
              "
            >
              לפרטים נוספים
            </button>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <ContactForm />
    </div>
  );
}

function ServiceCard({ icon, title, text }) {
  return (
    <div
      className="
        bg-white rounded-2xl p-7 text-center
        shadow-lg shadow-black/5
        border border-white/10
        hover:-translate-y-1 hover:shadow-xl
        transition
      "
    >
      <div className="flex justify-center text-[#3B82F6] mb-4">
        {icon}
      </div>

      <h4 className="text-lg font-bold mb-2 text-[#0F2A44]">
        {title}
      </h4>

      <p className="text-gray-600 text-sm leading-relaxed">
        {text}
      </p>
    </div>
  );
}
