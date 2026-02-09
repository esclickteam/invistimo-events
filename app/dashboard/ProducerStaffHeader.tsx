"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ProducerStaffHeader() {
  const router = useRouter();
  const { setUser, setIsAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    setUser?.(null);
    setIsAuthenticated?.(false);
    router.replace("/login");
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-[#f3eee9] border-b border-[#e0d8cf] flex items-center justify-between px-6">
      <div className="font-bold text-lg text-[#4b321f]">
        Invistimo – עובד מפיק
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm text-[#4b321f] hover:opacity-80"
      >
        <LogOut className="w-4 h-4" />
        התנתקות
      </button>
    </header>
  );
}
