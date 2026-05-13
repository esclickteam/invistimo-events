"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

/* -------------------------------------------------------------
   Types
------------------------------------------------------------- */
interface InvitationData {
  _id: string;
  title?: string;
  shareId?: string;
}

type LoadState = "loading" | "ready" | "not_found" | "unauthorized" | "error";

/* -------------------------------------------------------------
   Component
------------------------------------------------------------- */
export default function InvitationPreviewPage() {
  const params = useParams();

  const id = useMemo(() => {
    const raw = (params as any)?.id;
    if (!raw) return undefined;
    return Array.isArray(raw) ? raw[0] : (raw as string);
  }, [params]);

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const fetchInvitation = useCallback(async () => {
    if (!id) {
      setInvitation(null);
      setState("not_found");
      return;
    }

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.status === 401) {
        setInvitation(null);
        setState("unauthorized");
        return;
      }

      if (res.status === 404) {
        setInvitation(null);
        setState("not_found");
        return;
      }

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.invitation) {
        setInvitation(data.invitation);
        setState("ready");
      } else {
        setInvitation(null);
        setState("error");
        setErrorMsg(data?.error || "שגיאה בטעינת ההזמנה");
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setInvitation(null);
      setState("error");
      setErrorMsg("שגיאת רשת / שרת");
    }
  }, [id]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  /* -------------------------------------------------------------
     UI states
  ------------------------------------------------------------- */
  if (state === "loading") {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F1EA] flex items-center justify-center px-4"
      >
        <div className="rounded-[28px] border border-[#E3D6C3] bg-white px-8 py-7 text-center shadow-[0_18px_50px_rgba(30,27,46,0.08)]">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#E3D6C3] border-t-[#B8844F]" />
          <p className="text-lg font-black text-[#241A14]">טוען תצוגה מקדימה...</p>
        </div>
      </div>
    );
  }

  if (state === "unauthorized") {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F1EA] flex items-center justify-center px-4"
      >
        <div className="w-full max-w-[520px] rounded-[30px] border border-[#E3D6C3] bg-white px-7 py-8 text-center shadow-[0_18px_50px_rgba(30,27,46,0.08)]">
          <h1 className="text-2xl font-black text-[#241A14]">
            🔒 אין הרשאה לצפות בהזמנה
          </h1>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#8A7B69]">
            אם את מחוברת ועדיין רואה את זה — ייתכן שה-cookie לא נשלח.
          </p>

          <button
            type="button"
            onClick={fetchInvitation}
            className="mt-6 h-[46px] rounded-2xl bg-[#B8844F] px-7 text-sm font-black text-white transition hover:bg-[#9F6F3F]"
          >
            נסי שוב
          </button>
        </div>
      </div>
    );
  }

  if (state === "not_found" || !invitation) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F1EA] flex items-center justify-center px-4"
      >
        <div className="w-full max-w-[520px] rounded-[30px] border border-[#E3D6C3] bg-white px-7 py-8 text-center shadow-[0_18px_50px_rgba(30,27,46,0.08)]">
          <h1 className="text-2xl font-black text-[#241A14]">
            ❌ לא נמצאה הזמנה
          </h1>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#8A7B69]">
            בדקי שה-ID בכתובת נכון ושיש הזמנה קיימת למזהה הזה.
          </p>

          <button
            type="button"
            onClick={fetchInvitation}
            className="mt-6 h-[46px] rounded-2xl bg-[#B8844F] px-7 text-sm font-black text-white transition hover:bg-[#9F6F3F]"
          >
            נסי שוב
          </button>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#F6F1EA] flex items-center justify-center px-4"
      >
        <div className="w-full max-w-[520px] rounded-[30px] border border-[#E3D6C3] bg-white px-7 py-8 text-center shadow-[0_18px_50px_rgba(30,27,46,0.08)]">
          <h1 className="text-2xl font-black text-[#241A14]">
            ❌ שגיאה בטעינה
          </h1>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#8A7B69]">
            {errorMsg}
          </p>

          <button
            type="button"
            onClick={fetchInvitation}
            className="mt-6 h-[46px] rounded-2xl bg-[#B8844F] px-7 text-sm font-black text-white transition hover:bg-[#9F6F3F]"
          >
            נסי שוב
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     Render preview
  ------------------------------------------------------------- */
  const safeTitle = invitation.title?.trim() || "תצוגת הזמנה";
  const shareId = invitation.shareId;

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-[#F6F1EA]
        px-4
        py-7
        md:px-8
        md:py-9
      "
    >
      <main className="mx-auto flex w-full max-w-[720px] flex-col items-center">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-[#241A14] md:text-4xl">
            {safeTitle}
          </h1>

          <p className="mt-2 text-sm font-semibold text-[#8A7B69]">
            תצוגה מקדימה של עמוד ההזמנה כפי שיופיע לאורחים
          </p>
        </header>

        {shareId ? (
          <>
            <section
              className="
                w-full
                overflow-hidden
                rounded-[34px]
                border
                border-[#E3D6C3]
                bg-white
                shadow-[0_22px_65px_rgba(30,27,46,0.10)]
              "
            >
              <iframe
                key={shareId}
                src={`/invite/${shareId}`}
                title="תצוגה מקדימה להזמנה"
                className="
                  block
                  h-[780px]
                  w-full
                  border-0
                  bg-white
                  md:h-[820px]
                "
              />
            </section>

            
          </>
        ) : (
          <div className="w-full rounded-[28px] border border-red-200 bg-red-50 px-6 py-7 text-center">
            <p className="text-base font-black text-red-700">
              ⚠ אין shareId להזמנה
            </p>
            <p className="mt-2 text-sm font-semibold text-red-600">
              לא ניתן להציג עמוד ציבורי בלי מזהה שיתוף.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}