"use client";

import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const whatsappText = encodeURIComponent(
    "היי, אשמח לקבל עזרה עם Invistimo ✨\nרוצה להבין איזו חבילה מתאימה לאירוע שלי."
  );

  const whatsappUrl = `https://wa.me/972555039072?text=${whatsappText}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error("שליחת ההודעה נכשלה");
      }

      setSuccess("הפנייה נשלחה בהצלחה! ניצור עמכם קשר בהקדם.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error("Contact error:", err);
      setError("אירעה שגיאה בעת שליחת הפנייה. אנא נסו שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F7EFE6] text-[#3E2D20]"
    >
      {/* רקע יוקרתי */}
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* כתמי אור */}
      <div className="pointer-events-none absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-80px] left-[8%] h-80 w-80 rounded-full bg-[#CDA37D]/18 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />

      {/* עיטורים */}
      <div className="pointer-events-none absolute top-20 left-10 h-28 w-28 rounded-full border border-[#D8B98D]/25" />
      <div className="pointer-events-none absolute bottom-16 right-10 h-24 w-24 rounded-full border border-[#D8B98D]/20" />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
        {/* Hero */}
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#D8B98D] bg-[#FFF8EE] shadow-[0_10px_30px_rgba(186,140,76,0.13)]">
            <span className="text-2xl text-[#B88945]">✦</span>
          </div>

          <p className="font-serif text-[34px] tracking-[0.22em] text-[#8A6338] sm:text-[46px]">
            INVISTIMO
          </p>

          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-l from-transparent via-[#C9A46A] to-transparent" />

          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#A07C52]">
            Contact & Support
          </p>

          <h1 className="mt-7 text-4xl font-black text-[#3E2D20] sm:text-5xl">
            יצירת קשר
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#7B6754]">
            נשמח לעמוד לרשותכם בכל שאלה, בקשה, בירור, פנייה טכנית או מידע על
            חבילות ושירותי Invistimo.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          {/* צד מידע */}
          <aside className="space-y-5">
            {/* וואטסאפ */}
            <div
              className="
                relative overflow-hidden rounded-[34px]
                border border-[#D9C0A0]
                bg-[#FFFDF9]/94
                p-6
                shadow-[0_24px_70px_rgba(91,64,35,0.12)]
                backdrop-blur-xl
                sm:p-7
              "
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#FFF4E2_0%,transparent_45%)]" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-[#D8B16A]/18 blur-3xl" />

              <div className="relative z-10">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_14px_30px_rgba(37,211,102,0.25)]">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.02 5C10.05 5 5.22 9.83 5.22 15.8C5.22 17.71 5.72 19.58 6.67 21.23L5 27L10.93 25.45C12.49 26.3 14.24 26.75 16.02 26.75C21.99 26.75 26.82 21.92 26.82 15.95C26.82 9.98 21.99 5 16.02 5Z"
                      fill="white"
                    />
                    <path
                      d="M13.14 11.15C12.86 10.53 12.57 10.52 12.31 10.51C12.1 10.5 11.86 10.5 11.62 10.5C11.38 10.5 10.98 10.59 10.64 10.96C10.3 11.34 9.35 12.2 9.35 13.95C9.35 15.7 10.67 17.39 10.85 17.63C11.03 17.87 13.27 21.47 16.78 22.84C19.69 23.98 20.29 23.75 20.93 23.69C21.57 23.63 22.99 22.84 23.28 22.05C23.57 21.26 23.57 20.58 23.48 20.43C23.39 20.28 23.14 20.19 22.77 20.01C22.41 19.83 20.59 18.93 20.26 18.81C19.93 18.69 19.69 18.63 19.45 18.99C19.21 19.35 18.54 20.13 18.33 20.37C18.12 20.61 17.9 20.64 17.54 20.46C17.17 20.28 15.98 19.9 14.56 18.63C13.45 17.64 12.69 16.42 12.48 16.06C12.27 15.7 12.46 15.51 12.64 15.33C12.8 15.17 13 14.91 13.18 14.7C13.36 14.49 13.42 14.34 13.54 14.1C13.66 13.86 13.6 13.65 13.51 13.47C13.42 13.29 12.76 11.52 13.14 11.15Z"
                      fill="#25D366"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-black text-[#3E2D20]">
                  צריכים מענה מהיר?
                </h2>

                <p className="mt-3 text-sm leading-7 text-[#7B6754]">
                  אפשר לעבור ישירות לוואטסאפ ולדבר איתנו על חבילות, הרשמה,
                  אישורי הגעה, הושבה או כל שאלה אחרת.
                </p>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    mt-6 flex w-full items-center justify-center gap-2
                    rounded-[20px]
                    bg-[#25D366]
                    px-5 py-4
                    text-base font-black text-white
                    shadow-[0_16px_32px_rgba(37,211,102,0.22)]
                    transition
                    hover:-translate-y-0.5
                    hover:shadow-[0_20px_38px_rgba(37,211,102,0.3)]
                  "
                >
                  <span>WhatsApp</span>
                  <span>מעבר לצ׳אט עם נציג</span>
                </a>
              </div>
            </div>

            {/* שעות פעילות */}
            <div
              className="
                rounded-[30px]
                border border-[#E1CEB4]
                bg-[#FFFDF9]/82
                p-6
                shadow-[0_18px_48px_rgba(91,64,35,0.09)]
                backdrop-blur-xl
              "
            >
              <h2 className="text-xl font-black text-[#3E2D20]">
                שעות הפעילות שלנו
              </h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-[18px] border border-[#E8D9C7] bg-white/70 px-4 py-3">
                  <span className="font-bold text-[#5A3E25]">ימים א׳–ה׳</span>
                  <span className="text-[#7B6754]">09:00–18:00</span>
                </div>

                <div className="flex items-center justify-between rounded-[18px] border border-[#E8D9C7] bg-white/70 px-4 py-3">
                  <span className="font-bold text-[#5A3E25]">
                    שישי וערבי חג
                  </span>
                  <span className="text-[#7B6754]">09:00–12:00</span>
                </div>
              </div>

              <p className="mt-4 text-center text-xs leading-5 text-[#9C866D]">
                פניות מחוץ לשעות הפעילות ייענו בהקדם האפשרי.
              </p>
            </div>

            {/* אימייל */}
            <div
              className="
                rounded-[30px]
                border border-[#E1CEB4]
                bg-[#FFF8EE]/75
                p-6
                text-center
                shadow-[0_18px_48px_rgba(91,64,35,0.08)]
              "
            >
              <p className="text-sm text-[#7B6754]">ניתן לפנות גם בדוא״ל</p>
              <a
                href="mailto:support@invistimo.com"
                className="mt-2 block text-lg font-black text-[#A86F2B] underline-offset-4 hover:underline"
              >
                support@invistimo.com
              </a>
            </div>
          </aside>

          {/* טופס */}
          <form
            onSubmit={handleSubmit}
            className="
              relative overflow-hidden
              rounded-[34px]
              border border-[#D9C0A0]
              bg-[#FFFDF9]/94
              p-6
              shadow-[0_24px_70px_rgba(91,64,35,0.13)]
              backdrop-blur-xl
              sm:p-8
            "
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.25))]" />
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[#F2DEC4]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-[#EED7BC]/25 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-7">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#A07C52]">
                  Contact Form
                </p>

                <h2 className="mt-2 text-3xl font-black text-[#3E2D20]">
                  שליחת פנייה
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#7B6754]">
                  מלאו את הפרטים ונחזור אליכם בהקדם לכתובת הדוא״ל שהזנתם.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#4C3724]">
                    שם מלא
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="
                      w-full rounded-[18px] border border-[#DDCBB3]
                      bg-white/90 px-4 py-3.5
                      text-[#3E2D20] shadow-sm outline-none transition
                      placeholder:text-[#AF9B87]
                      focus:border-[#C9A46A]
                      focus:ring-4 focus:ring-[#D8B16A]/15
                    "
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#4C3724]">
                    כתובת דוא״ל
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="
                      w-full rounded-[18px] border border-[#DDCBB3]
                      bg-white/90 px-4 py-3.5
                      text-[#3E2D20] shadow-sm outline-none transition
                      placeholder:text-[#AF9B87]
                      focus:border-[#C9A46A]
                      focus:ring-4 focus:ring-[#D8B16A]/15
                    "
                  />
                </div>
              </div>

              <p className="mt-2 text-xs text-[#9C866D]">
                מענה יינתן לכתובת זו — אנא ודאו שהיא תקינה.
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <label className="text-sm font-bold text-[#4C3724]">
                  נושא הפנייה
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="לדוגמה: שאלה לגבי חבילות / הרשמה / תשלום"
                  className="
                    w-full rounded-[18px] border border-[#DDCBB3]
                    bg-white/90 px-4 py-3.5
                    text-[#3E2D20] shadow-sm outline-none transition
                    placeholder:text-[#AF9B87]
                    focus:border-[#C9A46A]
                    focus:ring-4 focus:ring-[#D8B16A]/15
                  "
                />
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <label className="text-sm font-bold text-[#4C3724]">
                  תוכן ההודעה
                </label>
                <textarea
                  rows={6}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="כתבו כאן את הפנייה שלכם..."
                  className="
                    w-full resize-none rounded-[18px]
                    border border-[#DDCBB3]
                    bg-white/90 px-4 py-3.5
                    text-[#3E2D20] shadow-sm outline-none transition
                    placeholder:text-[#AF9B87]
                    focus:border-[#C9A46A]
                    focus:ring-4 focus:ring-[#D8B16A]/15
                  "
                />
              </div>

              {success && (
                <div className="mt-5 rounded-[18px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                  {success}
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="
                  mt-6 w-full rounded-[20px]
                  bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F]
                  px-6 py-4
                  text-base font-black text-white
                  shadow-[0_16px_32px_rgba(168,111,43,0.24)]
                  transition duration-200
                  hover:-translate-y-0.5
                  hover:shadow-[0_20px_38px_rgba(168,111,43,0.3)]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {loading ? "שולח..." : "שליחת פנייה"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}