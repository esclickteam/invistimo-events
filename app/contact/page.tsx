export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24">
      <h1 className="text-4xl font-bold mb-10 text-center">
        יצירת קשר
      </h1>

      {/* פתיח */}
      <section className="relative pr-6 mb-12">
        <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
        <p>
          נשמח לעמוד לרשותכם בכל שאלה, בקשה, בירור, פנייה טכנית או פנייה
          בנוגע לשירותי <strong>Invistimo</strong>.
        </p>
        <p className="mt-3">
          מענה יינתן באמצעות דוא״ל חוזר, לכן יש להקפיד להזין כתובת דוא״ל
          תקינה.
        </p>
      </section>

      {/* טופס יצירת קשר */}
      <form className="space-y-6 bg-white rounded-2xl p-8 shadow-sm border border-[#eadfce]">
        <div>
          <label className="block text-sm font-semibold mb-1">
            שם מלא
          </label>
          <input
            type="text"
            required
            className="w-full rounded-xl border border-[#d6c7b6] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#c7a17a]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">
            כתובת דוא״ל
          </label>
          <input
            type="email"
            required
            placeholder="example@email.com"
            className="w-full rounded-xl border border-[#d6c7b6] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#c7a17a]"
          />
          <p className="text-xs mt-1 text-[#7b6754]">
            מענה יינתן לכתובת זו – אנא ודאו שהיא תקינה
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">
            נושא הפנייה
          </label>
          <input
            type="text"
            className="w-full rounded-xl border border-[#d6c7b6] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#c7a17a]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">
            תוכן ההודעה
          </label>
          <textarea
            rows={5}
            required
            className="w-full rounded-xl border border-[#d6c7b6] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#c7a17a]"
          />
        </div>

        <button
          type="submit"
          className="w-full mt-4 rounded-full border-2 border-[#c7a17a] px-8 py-3 font-semibold hover:bg-[#c7a17a] hover:text-white transition"
        >
          שליחת פנייה
        </button>
      </form>

      {/* פרטי קשר ישירים */}
      <section className="relative pr-6 mt-14">
        <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
        <p>
          ניתן לפנות אלינו גם ישירות בדוא״ל:
        </p>
        <p className="mt-2 font-semibold">
          support@invistimo.com
        </p>
      </section>
    </div>
  );
}
