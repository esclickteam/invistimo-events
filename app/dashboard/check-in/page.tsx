"use client";

import { Suspense } from "react";
import CheckInHostClient from "./CheckInHostClient";

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm font-bold text-[#7C6A58]">
          טוען Check-in...
        </div>
      }
    >
      <CheckInHostClient />
    </Suspense>
  );
}
