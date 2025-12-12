"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/dashboard");
    }, 1200);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f2eb]">
      <div className="bg-white rounded-3xl shadow-lg p-10 text-center max-w-md">
        <h1 className="text-3xl font-serif text-[#5c4632] mb-4">
          התשלום הושלם בהצלחה 🎉
        </h1>

        <p className="text-[#7b6754] mb-6">
          מעבירים אותך לדשבורד…
        </p>

        <div className="animate-pulse text-[#d4b28c] font-semibold">
          Loading…
        </div>
      </div>
    </div>
  );
}
