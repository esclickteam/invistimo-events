"use client";

import { Check, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ee] text-[#4a413a] py-20 px-4">
      {/* Header */}
      <section className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-semibold mb-4">החבילות שלנו</h1>
        <p className="text-lg text-[#8f7a67]">
          בחרו את החבילה שמתאימה לאירוע שלכם – תמיד אפשר לשדרג
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Premium */}
        <Card className="relative bg-gradient-to-b from-[#d1bba3] to-[#c3a98c] text-white rounded-3xl shadow-xl">
          <CardContent className="p-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">חבילת פרימיום</h2>
              <Star className="w-6 h-6" />
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "תזכורות והודעות אוטומטיות",
                "הושבה חכמה וניהול שולחנות",
                "עיצוב הזמנה מתקדם ועריכה חופשית",
                "שליחה מלאה ברשימת המוזמנים",
                "עדכונים וסטטיסטיקות בזמן אמת",
                "ניהול מלא של אישורי הגעה – ללא הגבלה",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="w-5 h-5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="bg-white/20 rounded-2xl p-4 mb-6">
              <label className="block text-sm mb-2">בחרו כמות אורחים</label>
              <select className="w-full rounded-xl p-3 text-[#4a413a]">
                <option>עד 100 אורחים</option>
                <option>עד 300 אורחים</option>
                <option>עד 500 אורחים</option>
                <option>1000+ אורחים</option>
              </select>
            </div>

            <Button className="w-full rounded-full text-lg py-6 bg-[#4a413a] hover:bg-[#3a332d]">
              הרשמה ותשלום לפרימיום
            </Button>

            <p className="text-center text-sm mt-4 opacity-80">תשלום חד־פעמי · ללא מנוי</p>
          </CardContent>
        </Card>

        {/* Basic */}
        <Card className="bg-white rounded-3xl shadow-lg">
          <CardContent className="p-10">
            <h2 className="text-2xl font-semibold mb-2">חבילת בסיס</h2>
            <p className="text-[#8f7a67] mb-6">₪49 בלבד</p>

            <ul className="space-y-4 mb-10">
              {[
                "גישה לעורך הזמנות בסיסי",
                "הזמנה דיגיטלית מעוצבת ומוכנה לשליחה",
                "שליחה ידנית ב‑WhatsApp לכל אורח",
                "קישור אישי עם טופס אישור הגעה",
                "ניהול אישורי הגעה – עד 50 אורחים",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#d1bba3]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full rounded-full text-lg py-6 border-[#d1bba3] text-[#4a413a]"
            >
              הרשמה ותשלום לחבילת בסיס
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
