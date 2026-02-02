 "use client";

import { useState, useEffect, Suspense } from "react";

import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import UpgradePlanModal from "./UpgradePlanModal";
import MobileGuests from "./MobileGuests";
import SeatingSidebar from "./SeatingSidebar";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext"; 



import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";
import ExportSeatingPdf from "./ExportSeatingPdf";


/* ⭐ קומפוננטות עליונות */
import ZonesToolbar from "@/app/components/zones/ZonesToolbar";

/* ===============================
   TYPES
=============================== */
type GuestDTO = {
  _id: string;
  name: string;
  guestsCount?: number;
  arrivedCount?: number;
  actualArrivedCount?: number;
  rsvp?: "yes" | "no" | "pending";
  groupId?: string | null; // ⭐ זה התיקון
};

type TableLite = { x: number; y: number };


export default function SeatingPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  

  const pathname = usePathname();
const isProducer = pathname.includes("/events/production");




  /* Drawer אורחים במובייל */
  const [showGuests, setShowGuests] = useState(false);

  /* ===============================
     STORES
  =============================== */
  const init = useSeatingStore((s) => s.init);
  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);
  const setGroups = useSeatingStore((s) => s.setGroups);
  const groups = useSeatingStore((s) => s.groups);
  const { user } = useAuth();



  const background = useSeatingStore((s) => s.background);
  const setBackground = useSeatingStore((s) => s.setBackground);

    const canvasView = useSeatingStore((s) => s.canvasView);
  const setCanvasView = useSeatingStore((s) => s.setCanvasView);

    const setSeatingMode = useSeatingStore((s) => s.setSeatingMode);

    const [blockReason, setBlockReason] =
  useState<"no-plan" | null>(null);




    useEffect(() => {
  if (!isProducer) return;

  console.log("🔥 ENABLE LIVE MODE (SEATING)");
  setSeatingMode("live");
}, [isProducer, setSeatingMode]);




  const setZones = useZoneStore((s) => s.setZones);

  /* ===============================
     LOAD INITIAL DATA
  =============================== */
  useEffect(() => {
    async function load() {
      try {
        /* 🧹 איפוס מוחלט לפני טעינה */
        useSeatingStore.getState().init([], [], null, null);
        useZoneStore.getState().setZones([]);

        /* 1️⃣ מביאים הזמנה רק כדי לקבל eventId */
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();

       


        const eventIdFromApi: string = invData.invitation.eventId;
        setEventId(eventIdFromApi);

        /* 2️⃣ אורחים – לפי eventId */
        const gRes = await fetch(`/api/seating/guests/${eventIdFromApi}`);

if (gRes.status === 403) {
  setBlockReason("no-plan");
  return;
}
     




        const gData = await gRes.json();

        const normalizedGuests = (gData.guests || []).map((g: GuestDTO) => ({
  id: g._id,
  name: g.name,
  rsvp: g.rsvp,
  guestsCount: g.guestsCount,
  arrivedCount: g.arrivedCount,
  actualArrivedCount: g.actualArrivedCount ?? 0,
  groupId: g.groupId ?? null,

  count: g.guestsCount ?? 1, // ✅ תמיד לפי מוזמנים
}));




        /* 3️⃣ שולחנות + אזורים + קנבס */
        const tRes = await fetch(`/api/seating/tables/${eventIdFromApi}`);

if (tRes.status === 403) {
  setBlockReason("no-plan");
  return;
}


const tData = await tRes.json();

/* 3️⃣ INIT – טבלאות + אורחים + קנבס */
init(
  tData.tables || [],
  normalizedGuests,
  tData.background ?? null,
  tData.canvasView ?? null
);

setZones(tData.zones || []);

/* 4️⃣ קבוצות – חייב לבוא אחרי init */
const invitationId = invData.invitation._id;

const grRes = await fetch(`/api/seating/groups/${invitationId}`);
if (grRes.ok) {
  const grData = await grRes.json();
  setGroups(grData.groups || []);
}


      
      } catch (err) {
        console.error("❌ SeatingPage load error:", err);
      }
    }
    

    load();
  }, [init, setZones, setGroups, user?.plan]);



  const tablesLite = tables as unknown as TableLite[];


    /* ===============================
     AUTO FIT (ONE TIME) – only if no saved canvasView
  =============================== */
  useEffect(() => {
  if (!tablesLite?.length) return;

  const isDefault =
    !canvasView ||
    (canvasView.scale === 1 && canvasView.x === 0 && canvasView.y === 0);

  if (!isDefault) return;

  const minX = Math.min(...tablesLite.map((t) => t.x));
  const maxX = Math.max(...tablesLite.map((t) => t.x));
  const minY = Math.min(...tablesLite.map((t) => t.y));
  const maxY = Math.max(...tablesLite.map((t) => t.y));


    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);

    // padding נעים מסביב
    const PAD = 400;

    // הערכה סבירה למסך (ה־Stage שלך כמעט תמיד סביב זה)
    const VIEW_W = 1200;
    const VIEW_H = 700;

    const scale = Math.max(
      0.4,
      Math.min(3, Math.min(VIEW_W / (contentW + PAD), VIEW_H / (contentH + PAD)))
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const x = VIEW_W / 2 - centerX * scale;
    const y = VIEW_H / 2 - centerY * scale;

    console.log("🟣 AutoFit canvasView:", { x, y, scale });

    setCanvasView({ x, y, scale });
  }, [tablesLite, canvasView, setCanvasView]);



  /* ===============================
     BACKGROUND
  =============================== */
  const handleBackgroundSelect = (bgUrl: string) => {
    if (!bgUrl) return;
    setBackground({ url: bgUrl, opacity: 0.28 });
  };

  /* ===============================
     DRAG HANDLER
  =============================== */
  const handleDragStart = (guest: any) => {
    useSeatingStore.getState().startDragGuest(guest);
  };

  /* ===============================
     SAVE
  =============================== */
  async function saveSeating() {
    if (!eventId) return;

    const zones = useZoneStore.getState().zones;
    const cv = useSeatingStore.getState().canvasView;


    const res = await fetch(`/api/seating/save/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tables,
        guests,
        groups,
        background,
        zones,
        canvasView: cv,
      }),
    });

 


    const data = await res.json();
    alert(data.success ? "🎉 נשמר בהצלחה" : "❌ שגיאה בשמירה");
  }



  // ⛔ אין חבילה מתאימה
  if (blockReason === "no-plan") {
  return (
    <>
      <div className="flex items-center justify-center h-screen bg-[#faf8f4]">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-3">
            הושבה אינה כלולה בחבילה שלך
          </h2>

          <p className="text-gray-600 mb-6">
            כדי להשתמש במערכת ההושבה יש לשדרג לחבילת פרימיום.
          </p>

          <button
            onClick={() => setShowUpgrade(true)}
            className="px-5 py-2 bg-black text-white rounded-lg"
          >
            שדרוג חבילה
          </button>
        </div>
      </div>

      <UpgradePlanModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPaid={user?.paidAmount ?? 0}
      />
    </>
  );
}

/* ===============================
   RENDER
=============================== */
return (
  <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">



      {/* HEADER */}
<div className="bg-white shadow-sm border-b sticky top-0 z-30">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-3">
    <h1 className="text-lg sm:text-xl font-semibold">הושבה באולם</h1>

<div className="flex flex-col sm:flex-row gap-2">
  <button
    onClick={() => setShowUpload(true)}
    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
  >
    העלאת תבנית אולם
  </button>

  <ExportSeatingPdf eventId={eventId} />

  <button
    onClick={saveSeating}
    className="
      px-4 py-2 text-sm
      bg-green-600 text-white
      rounded-lg
      font-semibold
      hover:bg-green-700
      transition
      whitespace-nowrap
    "
  >
    💾 שמירה
  </button>
</div>


  </div>

  {/* ⬅️ זה ה־div שחייב להיסגר */}
  <div className="w-full overflow-x-auto scrollbar-hide">
    <ZonesToolbar />
  </div>
</div>

      {/* CONTENT */}
      <div className="flex flex-1 overflow-hidden relative md:flex-row-reverse">

  {/* 🔘 כפתור הצגה / הסתרה של הסיידבר */}
  <button
  onClick={() => setSidebarOpen((v) => !v)}
  className={`
    absolute top-1/2 -translate-y-1/2 z-40
    ${sidebarOpen ? "right-[18rem]" : "right-0"}
    translate-x-1/2
    bg-white border rounded-full
    w-9 h-9 flex items-center justify-center
    shadow hover:bg-gray-50
    transition-all duration-300
  `}
  title={sidebarOpen ? "הסתר רשימת אורחים" : "הצג רשימת אורחים"}
>
  {sidebarOpen ? "›" : "‹"}
</button>

  {/* 🎨 קנבס */}
  <div className="flex-1 relative">
    <SeatingEditor
  background={background?.url || null}
  hideSeats={isProducer}
/>

  </div>

  {/* 🧾 סיידבר אורחים */}
  {/* 🧾 סיידבר הושבה מאוחד */}
{sidebarOpen && (
  <aside className="hidden md:block w-80 bg-white border-l">
    <Suspense fallback={<div className="p-4 text-sm text-gray-400">טוען...</div>}>
      <SeatingSidebar />
    </Suspense>
  </aside>
)}



        <button
          onClick={() => setShowGuests(true)}
          className="md:hidden absolute top-16 left-4 bg-white border rounded-lg px-3 py-2 shadow z-40"
        >
          👥 רשימת אורחים
        </button>

        {showGuests && (
          <Suspense fallback={null}>
            <MobileGuests
              onDragStart={handleDragStart}
              onClose={() => setShowGuests(false)}
            />
          </Suspense>
        )}
      </div>

      {/* MODALS */}
      {showUpload && (
        <UploadBackgroundModal
          onClose={() => setShowUpload(false)}
          onBackgroundSelect={(bgUrl: string) => {
            handleBackgroundSelect(bgUrl);
            setShowUpload(false);
          }}
        />
      )}







    </div>
 );
}