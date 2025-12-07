"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ⭐ טיפוס ל־params
interface InvitationPageParams {
  id: string;
}

// ⭐ טיפוס להזמנה עצמה
interface InvitationData {
  _id: string;
  title: string;
  shareId: string;
  canvasData: any;
}

export default function InvitationPreviewPage({
  params,
}: {
  params: InvitationPageParams;
}) {
  console.log("🔍 PARAMS:", params);

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🚀 useEffect — params.id =", params.id);

    if (!params.id) {
      console.warn("⚠ params.id is undefined!");
      setInvitation(null);
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        console.log(`🌐 Fetching → /api/invitations/${params.id}`);

        const res = await fetch(`/api/invitations/${params.id}`);
        console.log("📡 Status:", res.status);

        const data = await res.json();
        console.log("📦 DATA FROM SERVER:", data);

        if (data.success && data.invitation) {
          setInvitation(data.invitation);
        } else {
          setInvitation(null);
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setInvitation(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  // UI -------------------------------------------------------

  if (loading)
    return <div className="p-10 text-center text-xl">טוען...</div>;

  if (!invitation)
    return (
      <div className="p-10 text-center text-xl">
        ❌ לא נמצאה הזמנה  
        <br />
        <span className="text-sm text-gray-500">
          בדקי בקונסול מה הגיע ב־params.id
        </span>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-2">{invitation.title}</h1>
      <p className="text-gray-500 mb-8">תצוגת מקדימה</p>

      <div className="w-full max-w-md bg-white shadow rounded-xl p-6 mb-10">
        <pre className="text-gray-600 text-sm overflow-auto whitespace-pre-wrap">
          {JSON.stringify(invitation.canvasData, null, 2)}
        </pre>
      </div>

      <div className="text-center">
        <h2 className="text-lg font-medium mb-3">כך ייראה לאורחים:</h2>

        {invitation.shareId ? (
          <iframe
            key={invitation.shareId}
            src={`/invite/${invitation.shareId}`}
            className="w-[400px] h-[600px] border rounded-xl shadow"
          ></iframe>
        ) : (
          <div className="text-red-600 font-semibold">
            ⚠ אין shareId להזמנה
          </div>
        )}
      </div>

      {invitation.shareId && (
        <div className="mt-8">
          <Link
            href={`/invite/${invitation.shareId}`}
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
