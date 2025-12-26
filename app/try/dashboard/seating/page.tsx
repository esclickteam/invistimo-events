"use client";

import { useEffect } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";

export default function DemoSeatingPage() {
  const initDemo = useSeatingStore((s) => s.initDemo);

  useEffect(() => {
    initDemo(); // 🔥 כאן הדמו באמת מופעל
  }, [initDemo]);

  return <SeatingEditor background={null} />;
}
