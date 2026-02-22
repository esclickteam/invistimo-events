"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PublicInviteRenderer from "@/app/components/PublicInviteRenderer";

/* -------------------------------------------------------------
   Types
------------------------------------------------------------- */
interface InvitationData {
  _id: string;
  title?: string;
  shareId?: string;
  canvasData?: any;

  // ➕ חדש
  designMode?: "canvas" | "image";
  simpleImageUrl?: string;
}

type LoadState = "loading" | "ready" | "not_found" | "unauthorized" | "error";

/* -------------------------------------------------------------
   Component
------------------------------------------------------------- */
export default function InvitationPreviewPage() {
  const params = useParams();

  // ✅ useParams יכול להיות string | string[]
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
        credentials: "include", // ✅ חשוב אם ה-API מוגן/קורא cookies
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
    return <div className="p-10 text-center text-xl">טוען...</div>;
  }

  if (state === "unauthorized") {
    return (
      <div className="p-10 text-center text-xl">
        🔒 אין הרשאה לצפות בהזמנה
        <div className="mt-4 text-sm text-gray-500">
          אם את מחוברת ועדיין רואה את זה — ייתכן שה-cookie לא נשלח.
        </div>

        <button
          onClick={fetchInvitation}
          className="mt-6 bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          נסי שוב
        </button>
      </div>
    );
  }

  if (state === "not_found" || !invitation) {
    return (
      <div className="p-10 text-center text-xl">
        ❌ לא נמצאה הזמנה
        <div className="mt-3 text-sm text-gray-500">
          בדקי שה-ID בכתובת נכון ושיש הזמנה קיימת למזהה הזה.
        </div>

        <button
          onClick={fetchInvitation}
          className="mt-6 bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          נסי שוב
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-10 text-center text-xl">
        ❌ שגיאה בטעינה
        <div className="mt-3 text-sm text-gray-500">{errorMsg}</div>

        <button
          onClick={fetchInvitation}
          className="mt-6 bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          נסי שוב
        </button>
      </div>
    );
  }

  /* -------------------------------------------------------------
     Render preview
  ------------------------------------------------------------- */
  const safeTitle = invitation.title?.trim() || "תצוגת הזמנה";
  const shareId = invitation.shareId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <h1 className="text-3xl font-bold mb-2 text-center">{safeTitle}</h1>
      <p className="text-gray-500 mb-8">תצוגת מקדימה</p>

      {/* ⭐ תצוגה אמיתית של הקנבס */}
      <div className="w-full max-w-md bg-white shadow rounded-xl p-6 mb-10 flex justify-center">
  <PublicInviteRenderer
    canvasData={invitation.canvasData}
    designMode={invitation.designMode}
    simpleImageUrl={invitation.simpleImageUrl}
  />
</div>

      {/* ⭐ תצוגת iframe של הדף הציבורי */}
      <div className="text-center w-full flex flex-col items-center">
        <h2 className="text-lg font-medium mb-3">כך ייראה לאורחים:</h2>

        {shareId ? (
          <iframe
            key={shareId}
            src={`/invite/${shareId}`}
            className="w-[360px] sm:w-[400px] h-[560px] sm:h-[600px] border rounded-xl shadow bg-white"
          />
        ) : (
          <div className="text-red-600 font-semibold">
            ⚠ אין shareId להזמנה (לא ניתן להציג עמוד ציבורי)
          </div>
        )}
      </div>

      {/* ⭐ כפתור מעבר לעמוד הציבורי */}
      {shareId && (
        <div className="mt-8">
          <Link
            href={`/invite/${shareId}`}
            target="_blank"
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
          >
            צפי בעמוד הציבורי
          </Link>
        </div>
      )}
    </div>
  );
}
