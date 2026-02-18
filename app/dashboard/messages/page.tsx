"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type User = {
  isActive?: boolean;
};

export default function MessagesGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function checkUser() {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const data = await res.json();
        const user: User | undefined = data?.user;

        if (!user) {
          if (!cancelled) router.replace("/login");
          return;
        }

        // 🔒 לקוחות ישנים → תמיד legacy
        if (user.isActive === true) {
          if (!cancelled && pathname !== "/dashboard/messages/legacy") {
            router.replace("/dashboard/messages/legacy");
          }
          return;
        }

        // 🆕 כל השאר → new
        if (!cancelled && pathname !== "/dashboard/messages/new") {
          router.replace("/dashboard/messages/new");
        }

      } catch {
        if (!cancelled) router.replace("/login");
      }
    }

    checkUser();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return null;
}
