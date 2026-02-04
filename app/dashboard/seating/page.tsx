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

  const [isMobile, setIsMobile] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(true);

useEffect(() => {
  const update = () => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    setSidebarOpen((prev) => (mobile ? false : prev));
  };

  update(); // init
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}, []);



  

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

const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);


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
   <div className="h-screen w-screen bg-gray-50 overflow-hidden pt-[64px] md:pt-0">









      {/* HEADER */}
<div className="fixed top-0 inset-x-0 h-[64px] bg-white shadow-sm border-b z-[9999]">




  <div className="flex items-center justify-between flex-nowrap px-4 py-3 gap-3 overflow-x-auto md:overflow-visible">



    {/* צד ימין – כותרת */}
    <h1 className="text-lg sm:text-xl font-semibold whitespace-nowrap shrink-0">

      הושבה באולם
    </h1>

    {/* מרכז – אלמנטים */}
<div className="flex items-center gap-2 shrink-0">

  <ZonesToolbar />
</div>

{/* צד שמאל – פעולות */}
<div className="flex items-center gap-2 flex-nowrap whitespace-nowrap shrink-0">



  {/* ➕ הוסף שולחן */}
  <button
    onClick={() => setShowAddModal(true)}
    className="shrink-0 px-3 py-2 text-sm bg-green-600 text-white rounded-lg whitespace-nowrap flex items-center gap-1"

  >
    ➕ הוסף שולחן
  </button>

  <button
    onClick={() => setShowUpload(true)}
    className="shrink-0 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg whitespace-nowrap"

  >
    העלאת תבנית אולם
  </button>

  <div className="shrink-0">
  <ExportSeatingPdf eventId={eventId} />
</div>


  <button
    onClick={saveSeating}
    className="shrink-0 px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition whitespace-nowrap"

  >
    💾 שמירה
  </button>
</div>


  </div>
</div>







  {/* 🎨 קנבס */}
<div
  className="absolute left-0 right-0"
  style={{
    top: 64,
    bottom: 0,
  }}
>

  <div
    style={{
      width:
        !isMobile && sidebarOpen
          ? "calc(100% - 400px)"
          : "100%",
      height: "100%",
    }}
  >
    <SeatingEditor
      background={background?.url || null}
      hideSeats={isProducer}
      sidebarOpen={sidebarOpen}
    />
  </div>
</div>



  {/* 🧾 סיידבר הושבה מאוחד */}
<div className="absolute right-0 bottom-0 hidden md:flex" style={{ top: 64 }}>




  {/* 🧾 סיידבר – תמיד קיים, רק הרוחב משתנה */}
  <aside
    className={`
      transition-all duration-300
      ${sidebarOpen ? "w-[400px]" : "w-0 overflow-hidden"}
      bg-white border-l border-[#ead8cc]
    `}
  >
    {sidebarOpen && (
      <Suspense
        fallback={<div className="p-4 text-sm text-gray-400">טוען...</div>}
      >
        <SeatingSidebar />
      </Suspense>
    )}
  </aside>

  {/* 🔘 חץ שליטה – תמיד קיים */}
  <div
  className={`
    absolute top-1/2 -translate-y-1/2
    right-full
    z-40 flex items-center
    transition-all duration-300
    ${sidebarOpen ? "mr-[18px]" : "mr-0"}
  `}
>
    {/* קו הפרדה – רק כשהסיידבר פתוח */}
    {sidebarOpen && <div className="h-24 w-px bg-[#ead8cc]" />}

    <button
      onClick={() => setSidebarOpen((v) => !v)}
      className="
        ml-[-12px]
        h-9 w-9
        rounded-full
        bg-[#fdf9f6]
        border border-[#ead8cc]
        shadow-sm
        flex items-center justify-center
        hover:bg-[#f6ede8]
        transition
      "
      title={sidebarOpen ? "הסתר רשימת אורחים" : "הצג רשימת אורחים"}
    >
      {sidebarOpen ? "❮" : "❯"}
    </button>
  </div>






        <button
          onClick={() => setShowGuests(true)}
          className="md:hidden fixed top-[80px] left-4 bg-white border rounded-lg px-3 py-2 shadow z-40"
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