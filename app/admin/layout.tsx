// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const nav = [
    { href: "/admin", label: "סקירה" },
    { href: "/admin/users", label: "משתמשים" },
    { href: "/admin/invitations", label: "אירועים" },
    { href: "/admin/calls", label: "שירות שיחות" },
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
              className={`px-4 py-2 rounded-lg transition ${
                pathname === item.href
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
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
