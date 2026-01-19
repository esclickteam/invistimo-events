"use client";

import { Suspense } from "react";
import SeatingCanvas from "@/app/components/seating/SeatingCanvas";

/* ============================================================
   TYPES
============================================================ */
type SeatingEditorProps = {
  background: string | null;
  readOnly?: boolean;
  showStats?: boolean;
};

/* ============================================================
   EXPORT — WRAPPER ONLY
============================================================ */
 export default function SeatingEditor({
  background,
  readOnly = false,
  showStats = false,
}: SeatingEditorProps) {
  return (
    <Suspense fallback={null}>
      <SeatingCanvas
        background={background}
        mode={readOnly ? "viewer" : "editor"}
        showStats={showStats}
      />
    </Suspense>
  );
}
