"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function InvitationPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/invitations/${params.id}`);
        const data = await res.json();

        console.log("📦 DATA FROM SERVER:", data);

        // ⭐⭐ קריטי — לוודא שהבקשה הצליחה
        if (data.success && data.invitation) {
          setInvitation(data.invitation);
        } else {
          // נתונים לא תקינים או קריאה אוטומטית של Next עם id=undefined
          setInvitation(null);
        }
      } catch (err) {
        console.error("❌ Error loading invitation:", err);
        setInvitation(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  if (loading)
    return <div className="p-10 text-center text-xl">טוען...</div>;

  if (!invitation)
    return <div className="p-10 text-center text-xl">לא נמצאה הזמנה</div>;

  const shareId = invitation?.shareId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-2">{invitation?.title}</h1>
      <p className="text-gray-500 mb-8">תצוגת מקדימה</p>

      {/* תצוגת הקאנבס ששמרת */}
      <div className="w-full max-w-md bg-white shadow rounded-xl p-6 mb-10">
        <pre className="text-gray-600 text-sm overflow-auto whitespace-pre-wrap">
          {JSON.stringify(invitation?.canvasData, null, 2)}
        </pre>
      </div>

      {/* תצוגת עמוד האורחים */}
      <div className="text-center">
        <h2 className="text-lg font-medium mb-3">כך ייראה לאורחים:</h2>

        {shareId ? (
          <iframe
            key={shareId}
            src={`/invite/${shareId}`}
            className="w-[400px] h-[600px] border rounded-xl shadow"
          ></iframe>
        ) : (
          <div className="text-red-600 font-semibold">
            ⚠ לא נמצא ShareId להזמנה — ייתכן שהשמירה לא החזירה נתונים מלאים.
          </div>
        )}
      </div>

      {/* כפתור לצפייה ציבורית */}
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
