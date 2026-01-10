// app/admin/layout.tsx

// 🔒 קריטי לספארי iOS – מונע snapshot / BFCache
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Link from "next/link";
import React from "react";

/* =====================================================
   TYPES
===================================================== */
interface DecodedToken {
  userId: string;
  iat?: number;
  exp?: number;
}

/* =====================================================
   ADMIN LAYOUT (SERVER)
===================================================== */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* --------------------------------------------------
     DB
  -------------------------------------------------- */
  await connectDB();

  /* --------------------------------------------------
     AUTH TOKEN
  -------------------------------------------------- */
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  // ❌ לא מחובר
  if (!token) {
    redirect("/login");
  }

  /* --------------------------------------------------
     VERIFY JWT
  -------------------------------------------------- */
  let decoded: DecodedToken;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as DecodedToken;
  } catch (err) {
    console.error("❌ Invalid JWT:", err);
    redirect("/login");
  }

  if (!decoded?.userId) {
    redirect("/login");
  }

  /* --------------------------------------------------
     LOAD USER
  -------------------------------------------------- */
  const user = await User.findById(decoded.userId)
    .select("_id email role")
    .lean();

  // ❌ משתמש לא קיים
  if (!user) {
    redirect("/login");
  }

  // ❌ משתמש בלי role – מצב לא חוקי
  if (!user.role) {
    console.error("❌ User without role:", user._id);
    redirect("/login");
  }

  // ❌ לא אדמין
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  /* --------------------------------------------------
     NAV
  -------------------------------------------------- */
  const nav = [
    { href: "/admin", label: "סקירה" },
    { href: "/admin/users", label: "משתמשים" },
    // { href: "/admin/logs", label: "לוגים" },
    // { href: "/admin/settings", label: "הגדרות" },
  ];

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
  return (
    <div className="min-h-screen flex bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l p-6">
        <h2 className="text-xl font-bold mb-8">🛡️ Admin Panel</h2>

        <nav className="flex flex-col gap-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 rounded-lg transition text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-10">{children}</main>
    </div>
  );
}
