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

        // ⭐⭐ תיקון קריטי: לוקחים רק data.invitation
        setInvitation(data.invitation || null);
      } catch (err) {
        console.error("❌ Error loading invitation:", err);
        setInvitation(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  if (loading) return <div className="p-10 text-center">טוען...</div>;
  if (!invitation) return <div className="p-10 text-center">לא נמצאה הזמנה</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-2">{invitation?.title}</h1>
      <p className="text-gray-500 mb-8">תצוגת מקדימה</p>

      {/* תצוגת הקאנבס ששמרת */}
      <div className="w-full max-w-md bg-white shadow rounded-xl p-6 mb-10">
        <pre className="text-gray-600 text-sm overflow-auto">
          {JSON.stringify(invitation?.canvasData, null, 2)}
        </pre>
      </div>

      {/* תצוגת עמוד האורחים */}
      <div className="text-center">
        <h2 className="text-lg font-medium mb-3">כך ייראה לאורחים:</h2>
        <iframe
          src={`/invite/${invitation?.shareId}`}
          className="w-[400px] h-[600px] border rounded-xl shadow"
        ></iframe>
      </div>

      <div className="mt-8">
        <Link
          href={`/invite/${invitation?.shareId}`}
          target="_blank"
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          צפי בעמוד הציבורי
        </Link>
      </div>
    </div>
  );
}
