"use client";

import { useEffect } from "react";
import SeatingPage from "@/app/dashboard/seating/page";
import { useSeatingStore } from "@/store/seatingStore";

export default function DemoSeatingPage() {
  const initDemo = useSeatingStore((s) => s.initDemo);

  useEffect(() => {
    initDemo(); // 👈 מכניס 2 אורחים + שולחן דמו
  }, [initDemo]);

  return <SeatingPage />; // ❗ אותו עמוד בדיוק
}
