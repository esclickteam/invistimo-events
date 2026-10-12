"use client";

type Props = {
  phase: "hidden" | "view" | "closed" | "editing";
  showIdleWarning: boolean;
  saveError: string | null;
  unsavedNote: string | null;
  viewMessage: string;
  onTransfer: () => void;
  onResume: () => void;
  transferBusy: boolean;
  resumeBusy: boolean;
};

export default function SeatingEditOverlays({
  phase,
  showIdleWarning,
  saveError,
  unsavedNote,
  viewMessage,
  onTransfer,
  onResume,
  transferBusy,
  resumeBusy,
}: Props) {
  return (
    <>
      {showIdleWarning && phase === "editing" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100000] flex justify-center px-4">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-[#e7c98a] bg-[#fff8e8] px-4 py-3 text-center text-sm font-bold text-[#7a5a28] shadow-[0_16px_40px_rgba(90,60,20,0.16)]">
            העריכה תיסגר בעוד דקה בגלל חוסר פעילות.
          </div>
        </div>
      )}

      {saveError && phase === "editing" && (
        <div className="fixed inset-x-0 top-[88px] z-[100000] flex justify-center px-4">
          <div className="max-w-lg rounded-2xl border border-[#e7b4a8] bg-[#fff4f1] px-4 py-3 text-center text-sm font-bold text-[#8a3d32] shadow-lg">
            {saveError}
          </div>
        </div>
      )}

      {phase === "view" && (
        <div className="fixed inset-x-0 top-[76px] z-[10000] flex justify-center px-3">
          <div className="mt-3 flex w-full max-w-3xl flex-col items-stretch gap-3 rounded-[24px] border border-[#ead8c5] bg-white/95 p-4 text-right shadow-[0_18px_50px_rgba(90,60,20,0.12)] md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-bold leading-6 text-[#6f5536]">{viewMessage}</p>
            <button
              type="button"
              onClick={onTransfer}
              disabled={transferBusy}
              className="h-11 shrink-0 rounded-2xl bg-[#17203a] px-4 text-sm font-black text-white disabled:opacity-60"
            >
              {transferBusy ? "מעבירים..." : "העבר את העריכה לכאן"}
            </button>
          </div>
        </div>
      )}

      {phase === "closed" && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-[#1c1714]/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] border border-[#ead8c5] bg-white p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
            <h2 className="mb-3 text-2xl font-black text-[#2c2118]">העריכה נסגרה</h2>
            <p className="mb-4 text-sm leading-7 text-[#6f5536]">
              העריכה נסגרה אוטומטית כדי להגן על סידורי ההושבה שלך. כדי להמשיך, יש
              לטעון מחדש את מפת ההושבה המעודכנת.
            </p>
            {unsavedNote && (
              <p className="mb-4 text-sm font-bold leading-6 text-[#8a3d32]">{unsavedNote}</p>
            )}
            <button
              type="button"
              onClick={onResume}
              disabled={resumeBusy}
              className="h-12 rounded-2xl bg-[#171412] px-6 text-sm font-black text-white disabled:opacity-60"
            >
              {resumeBusy ? "טוען..." : "חזרה לעריכת ההושבה"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
