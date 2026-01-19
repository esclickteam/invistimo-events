"use client";

import { ReactNode, useEffect } from "react";
import { useSeatingStore } from "@/store/seatingStore";
import { LiveSeatingState } from "./types";

type Props = {
  children: ReactNode;
  initial?: LiveSeatingState | null;
};

export function LiveSeatingProvider({ children, initial }: Props) {
  const importSnapshot = useSeatingStore((s) => s.importSnapshot);

  useEffect(() => {
    if (initial) {
      console.log("🟢 LiveSeatingProvider importing snapshot");
      importSnapshot(initial);
    }
  }, [initial, importSnapshot]);

  return <>{children}</>;
}
