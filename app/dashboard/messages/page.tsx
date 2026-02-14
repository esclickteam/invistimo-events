"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type User = {
  isActive?: boolean;
};

export default function MessagesGate() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkUser() {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();
        const user: User | undefined = data?.user;

        if (!user) {
          router.replace("/login");
          return;
        }

        // 🟢 לקוחות קיימים (legacy)
        if (user.isActive === true) {
          if (!cancelled) {
            router.replace("/dashboard/messages/legacy");
          }
          return;
        }

        // 🆕 לקוחות חדשים
        if (!cancelled) {
          router.replace("/dashboard/messages/new");
        }
      } catch {
        router.replace("/login");
      }
    }

    checkUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
