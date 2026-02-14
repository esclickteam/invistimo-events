"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  isActive?: boolean;
};

export default function MessagesGate() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        const user: User = data.user;

        // 🟢 לקוחות קיימים
        if (user?.isActive === true) {
          router.replace("/dashboard/messages/legacy");
          return;
        }

        // 🆕 לקוחות חדשים
        router.replace("/dashboard/messages/new");
      } catch (e) {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkUser();
  }, [router]);

  return null;
}
