// app/admin/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connectDB();

  // 🔑 חובה await
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  // ❌ לא מחובר
  if (!token) {
    redirect("/login");
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    redirect("/login");
  }

  const user = await User.findById(decoded.userId).lean();

  // ❌ משתמש לא קיים
  if (!user) {
    redirect("/login");
  }

  // ❌ לא אדמין
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const nav = [
    { href: "/admin", label: "סקירה" },
    { href: "/admin/users", label: "משתמשים" },
    
    
  ];

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
