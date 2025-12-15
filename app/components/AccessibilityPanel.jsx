"use client";

export default function AccessibilityPanel({ onClose }) {
  const toggleClass = (cls) =>
    document.body.classList.toggle(cls);

  const increaseFont = () =>
    document.documentElement.style.fontSize = "110%";

  const reset = () => {
    document.documentElement.style.fontSize = "";
    document.body.className = "";
  };

  return (
    <div className="fixed bottom-24 right-6 w-72 bg-white rounded-2xl shadow-xl border border-[#eadfce] p-4 z-[9999]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm">תפריט נגישות</h3>
        <button onClick={onClose} className="text-sm">✕</button>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <button onClick={increaseFont} className="access-btn">הגדלת טקסט</button>
        <button onClick={() => toggleClass("high-contrast")} className="access-btn">
          ניגודיות גבוהה
        </button>
        <button onClick={() => toggleClass("grayscale")} className="access-btn">
          שחור־לבן
        </button>
        <button onClick={() => toggleClass("highlight-links")} className="access-btn">
          הדגשת קישורים
        </button>

        <a
          href="/accessibility"
          className="access-btn text-center"
        >
          הצהרת נגישות
        </a>

        <button
          onClick={reset}
          className="mt-2 text-xs underline text-[#7b6754]"
        >
          איפוס
        </button>
      </div>
    </div>
  );
}
