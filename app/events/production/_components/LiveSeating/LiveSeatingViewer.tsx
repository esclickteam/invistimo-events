"use client";

import SeatingEditor from "@/app/dashboard/seating/SeatingEditor";

export default function LiveSeatingViewer() {
  /**
   * ⚠️ Viewer = renderer בלבד
   * ❌ לא fetch
   * ❌ לא init
   * ❌ לא reset
   * ✅ Provider הוא מקור האמת
   */

  return (
    <div className="relative w-full h-full bg-[#faf8f4]">
      <SeatingEditor
        readOnly
        showStats
        background={null}
      />
    </div>
  );
}
