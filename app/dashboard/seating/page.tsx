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
import { useRef } from "react";


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
const [invitationId, setInvitationId] = useState<string | null>(null); 
const didLoadRef = useRef(false);



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
  /* ===============================
   LOAD INITIAL DATA (ONCE)
=============================== */
useEffect(() => {
  if (didLoadRef.current) return;
  didLoadRef.current = true;

  async function load() {
    try {
      const seatingState = useSeatingStore.getState();

      const hasTables =
        seatingState.tables && seatingState.tables.length > 0;

      if (!hasTables) {
        seatingState.init([], [], null, null);
        useZoneStore.getState().setZones([]);
      }

      /* 1️⃣ מביאים הזמנה רק כדי לקבל eventId */
      const invRes = await fetch("/api/invitations/my");
const invData = await invRes.json();

const invitationIdFromApi: string = invData?.invitation?._id;
const eventIdFromApi: string = invData?.invitation?.eventId;

if (!invitationIdFromApi || !eventIdFromApi) {
  console.error("❌ Missing invitation/event id", invData);
  return;
}

setInvitationId(invitationIdFromApi); 
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
        count: g.guestsCount ?? 1,
      }));

      /* 3️⃣ שולחנות + קנבס */
      const tRes = await fetch(`/api/seating/tables/${eventIdFromApi}`);

      if (tRes.status === 403) {
        setBlockReason("no-plan");
        return;
      }

      const tData = await tRes.json();

      init(
        tData.tables || [],
        normalizedGuests,
        tData.background ?? null,
        tData.canvasView ?? null
      );

      setZones(tData.zones || []);

      /* 4️⃣ קבוצות */
      const grRes = await fetch(`/api/seating/groups/${invitationIdFromApi}`);


      if (grRes.ok) {
        const grData = await grRes.json();
        setGroups(grData.groups || []);
      }
    } catch (err) {
      console.error("❌ SeatingPage load error:", err);
    }
  }

  load();
}, []);



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
  async function saveSeating(showToast = true): Promise<boolean> {
  if (!eventId || !invitationId) {
    if (showToast) alert("❌ חסר invitationId או eventId");
    return false;
  }

  try {
    const zones = useZoneStore.getState().zones;
    const cv = useSeatingStore.getState().canvasView;

    const res = await fetch(`/api/seating/save/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        invitationId,
        tables: useSeatingStore.getState().tables,
        guests: useSeatingStore.getState().guests,
        groups: useSeatingStore.getState().groups,
        background: useSeatingStore.getState().background,
        zones,
        canvasView: cv,
      }),
    });

    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data?.success;

    if (showToast) {
      alert(ok ? "🎉 נשמר בהצלחה" : "❌ שגיאה בשמירה");
    }

    return !!ok;
  } catch (e) {
    if (showToast) alert("❌ שגיאת רשת בשמירה");
    return false;
  }
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
   <div className="h-screen w-screen bg-gray-50 overflow-hidden">










      {/* HEADER */}
<div className="fixed top-0 inset-x-0 h-[64px] bg-white shadow-sm border-b z-[9999]">




  <div className="flex items-center justify-between flex-nowrap px-4 py-3 gap-3 overflow-x-auto md:overflow-visible">



    {/* צד ימין – כותרת */}
    <h1 className="text-lg sm:text-xl font-semibold whitespace-nowrap shrink-0">

      הושבה באולם
    </h1>

    {/* מרכז – אלמנטים */}
<div className="flex items-center gap-2 shrink-0 relative">
  <ZonesToolbar />

  {/* יעד לדרופדאונים של ההידר */}
  <div
    id="header-portal"
    className="relative z-[10000] pointer-events-none"
  />
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
    onClick={() => { void saveSeating(true); }}

    className="shrink-0 px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition whitespace-nowrap"

  >
    💾 שמירה
  </button>
</div>


  </div>
</div>









<button
  onClick={() => setShowGuests(true)}
  className="md:hidden fixed top-[80px] left-4 bg-white border rounded-lg px-3 py-2 shadow z-[10002]"

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


{/* 🎨 קנבס + סיידבר */}
<div
  className="absolute inset-x-0 flex min-w-0"
  style={{ top: 64, bottom: 0 }}
>
  {/* קנבס */}
  <div className="flex-1 min-w-0">
    <SeatingEditor
      background={background?.url || null}
      invitationId={invitationId}
      onAutoSave={() => saveSeating(false)}
      hideSeats={isProducer}
      sidebarOpen={sidebarOpen}
    />
  </div>

  {/* 🧾 סיידבר */}
  <div className="hidden md:flex flex-shrink-0 relative">
    <aside
      className={`
        transition-all duration-300
        ${sidebarOpen ? "w-[400px]" : "w-0 overflow-hidden"}
        bg-white border-l border-[#ead8cc]
      `}
    >
      {sidebarOpen && (
        <Suspense fallback={<div className="p-4 text-sm text-gray-400">טוען...</div>}>
          <SeatingSidebar invitationId={invitationId} />
        </Suspense>
      )}
    </aside>

    {/* 🔘 חץ שליטה */}
    <div
      className={`
        absolute top-1/2 -translate-y-1/2
        right-full z-40 flex items-center
        transition-all duration-300
        ${sidebarOpen ? "mr-[18px]" : "mr-0"}
      `}
    >
      {sidebarOpen && <div className="h-24 w-px bg-[#ead8cc]" />}

      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="
          ml-[-12px] h-9 w-9 rounded-full
          bg-[#fdf9f6] border border-[#ead8cc]
          shadow-sm flex items-center justify-center
          hover:bg-[#f6ede8] transition
        "
      >
        {sidebarOpen ? "❮" : "❯"}
      </button>
    </div>
  </div>
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