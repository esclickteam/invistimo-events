"use client";

import { useEffect } from "react";
import SeatingPage from "@/app/dashboard/seating/page";
import { useSeatingStore } from "@/store/seatingStore";

export default function DemoSeatingPage() {
  const setTables = useSeatingStore((s) => s.setTables);

  useEffect(() => {
    // בונים טבלאות דמו לפי ה־guests של הדשבורד
    setTables([
      {
        id: "t1",
        name: "1",
        seats: 10,
        seatedGuests: [{ guestId: "5" }], // יוסי כהן
      },
      {
        id: "t2",
        name: "2",
        seats: 10,
        seatedGuests: [{ guestId: "7" }], // אלון פרץ
      },
      {
        id: "t3",
        name: "3",
        seats: 10,
        seatedGuests: [
          { guestId: "3" }, // דניאל לוי
          { guestId: "9" }, // תמר כהן
        ],
      },
      {
        id: "t5",
        name: "5",
        seats: 10,
        seatedGuests: [{ guestId: "1" }], // אורן לוי
      },
    ]);
  }, [setTables]);

  return <SeatingPage />;
}
