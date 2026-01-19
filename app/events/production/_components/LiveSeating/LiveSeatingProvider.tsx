"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import { LiveSeatingState } from "./types";

type Props = {
  children: ReactNode;
  initial?: LiveSeatingState | null;
};

export function LiveSeatingProvider({ children, initial }: Props) {
  const importSnapshot = useSeatingStore((s) => s.importSnapshot);

  // ✅ מונע ייבוא כפול
  const importedRef = useRef(false);

  useEffect(() => {
    if (!initial) return;
    if (importedRef.current) return;

    console.log("🟢 LiveSeatingProvider importing snapshot (once)");
    importSnapshot(initial);
    importedRef.current = true;
  }, [initial, importSnapshot]);

  return <>{children}</>;
}
