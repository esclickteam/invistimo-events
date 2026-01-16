export default function PlanningTab() {
  return (
    <div className="space-y-6 max-w-3xl">
      <section className="border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">🎯 הגדרת האירוע</h3>

        <input className="border rounded p-2 w-full" placeholder="מטרת האירוע" />
        <input className="border rounded p-2 w-full" placeholder="אופי / וייב" />
        <input className="border rounded p-2 w-full" placeholder="גודל משוער" />
        <textarea
          className="border rounded p-2 w-full"
          placeholder="רגישויות / דגשים"
        />
      </section>

      <section className="border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">🎨 קונספט</h3>
        <textarea
          className="border rounded p-2 w-full"
          placeholder="תיאור קונספט עיצובי"
        />
      </section>

      <section className="border rounded-xl p-4 space-y-2">
        <h3 className="font-semibold">📅 אבני דרך</h3>
        <input className="border rounded p-2 w-full" placeholder="סגירת אולם – תאריך יעד" />
        <input className="border rounded p-2 w-full" placeholder="סגירת DJ – תאריך יעד" />
      </section>
    </div>
  );
}
