"use client";

import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";

import { useRouter } from "next/navigation";

import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  Pencil,
  Save,
  X,
  RefreshCcw,
  Search,
  Sparkles,
  Users,
  UserPlus,
  UserRoundCheck,
  UserRoundCog,
} from "lucide-react";

import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import CreateClientModal from "@/app/components/producer/CreateClientModal";

/* =========================
   Animations
========================= */

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.45,
      ease: "easeOut",
    },
  }),
};

/* =========================
   Utils
========================= */

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(now.getDate() + days);
  end.setHours(23, 59, 59, 999);

  return d >= now && d <= end;
}

function isPastDate(dateStr) {
  if (!dateStr) return false;

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  d.setHours(0, 0, 0, 0);

  return d < today;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getClientEventId(client, dataEventId = null) {
  return (
    client?.event?._id ||
    client?.eventId ||
    dataEventId ||
    null
  );
}

function getEventTitle(client) {
  return (
    client?.event?.title ||
    client?.event?.eventTitle ||
    client?.event?.name ||
    client?.event?.eventName ||
    client?.event?.invitationTitle ||
    client?.event?.invitation?.title ||
    client?.event?.invitation?.eventTitle ||
    client?.invitation?.title ||
    client?.invitation?.eventTitle ||
    client?.invitation?.invitationTitle ||
    client?.invitationTitle ||
    client?.eventTitle ||
    client?.eventName ||
    client?.title ||
    client?.nameOfEvent ||
    "אירוע ללא שם"
  );
}

function getEventLocation(client) {
  return (
    client?.event?.location ||
    client?.event?.venue ||
    client?.event?.place ||
    client?.location ||
    "—"
  );
}

function getEventDate(client) {
  return (
    client?.event?.date ||
    client?.event?.eventDate ||
    client?.eventDate ||
    client?.invitation?.eventDate ||
    null
  );
}

function getTotalGuests(client) {
  return (
    Number(client?.event?.totalGuests) ||
    Number(client?.event?.guestCount) ||
    Number(client?.totalGuests) ||
    0
  );
}

function getApprovedCount(client) {
  return (
    Number(client?.event?.approvedCount) ||
    Number(client?.event?.confirmedCount) ||
    Number(client?.approvedCount) ||
    0
  );
}

function getEventStatus(client) {
  const date = getEventDate(client);

  if (!date) {
    return {
      label: "ללא תאריך",
      className:
        "bg-orange-50 text-orange-700 border-orange-100",
    };
  }

  if (isPastDate(date)) {
    return {
      label: "עבר",
      className:
        "bg-gray-50 text-gray-500 border-gray-100",
    };
  }

  if (isWithinDays(date, 7)) {
    return {
      label: "השבוע",
      className:
        "bg-purple-50 text-purple-700 border-purple-100",
    };
  }

  return {
    label: "עתידי",
    className:
      "bg-green-50 text-green-700 border-green-100",
  };
}

function getProducerCalendarTypeLabel(type) {
  switch (type) {
    case "meeting":
      return "פגישה";

    case "event":
      return "אירוע";

    case "reminder":
      return "תזכורת";

    case "task":
      return "משימה";

    case "call":
      return "שיחת טלפון";

    case "zoom":
      return "פגישת זום";

    case "note":
      return "הערה";

    default:
      return "פריט ביומן";
  }
}

/* =========================
   Producer Dashboard
========================= */

export default function ProducerDashboard() {
  const {
    user,
    loading: authLoading,
    setUser,
    setIsAuthenticated,
  } = useAuth();

  const router = useRouter();

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] =
    useState(false);
  const [
    showCreateClient,
    setShowCreateClient,
  ] = useState(false);

  const [authResolved, setAuthResolved] =
    useState(false);

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] =
    useState(false);
  const [
    openAssignForClientId,
    setOpenAssignForClientId,
  ] = useState(null);
  const [savingClientId, setSavingClientId] =
    useState(null);
  const [
    staffSearchByClientId,
    setStaffSearchByClientId,
  ] = useState({});

  const [searchTerm, setSearchTerm] =
    useState("");
  const [eventFilter, setEventFilter] =
    useState("all");
  const [showProducerCalendar, setShowProducerCalendar] =
    useState(false);

  const [editingPhoneClientId, setEditingPhoneClientId] =
    useState(null);
  const [phoneDraftByClientId, setPhoneDraftByClientId] =
    useState({});
  const [savingPhoneClientId, setSavingPhoneClientId] =
    useState(null);

  const assignMenuRef = useRef(null);

  /* =========================
     Auth sync
  ========================= */

  useEffect(() => {
    let mounted = true;

    const syncAuthFromServer = async () => {
      if (authLoading) return;

      if (user) {
        if (mounted) {
          setAuthResolved(true);
        }

        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!mounted) return;

        if (res.ok) {
          const data = await res.json();

          if (data?.user) {
            setUser?.(data.user);
            setIsAuthenticated?.(true);
          }
        }
      } catch (err) {
        console.error("Auth sync failed:", err);
      } finally {
        if (mounted) {
          setAuthResolved(true);
        }
      }
    };

    syncAuthFromServer();

    return () => {
      mounted = false;
    };
  }, [
    authLoading,
    user,
    setUser,
    setIsAuthenticated,
  ]);

  /* =========================
     Fetch Clients
  ========================= */

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);

    try {
      const res = await fetch("/api/producer/clients", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();

        console.error(
          "Failed to fetch producer clients:",
          res.status,
          text.slice(0, 300)
        );

        setClients([]);
        return;
      }

      const data = await res.json();

      setClients(
        Array.isArray(data?.clients)
          ? data.clients
          : []
      );
    } catch (err) {
      console.error(
        "Failed to fetch producer clients:",
        err
      );

      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  /* =========================
     Fetch Staff
  ========================= */

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);

    try {
      const res = await fetch("/api/producer/staff/list", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();

        console.error(
          "Failed to fetch producer staff:",
          res.status,
          text.slice(0, 300)
        );

        setStaffList([]);
        return;
      }

      const data = await res.json();

      setStaffList(
        Array.isArray(data?.staff)
          ? data.staff
          : []
      );
    } catch (err) {
      console.error(
        "Failed to fetch producer staff:",
        err
      );

      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authResolved) return;
    if (!user || user.role !== "producer") return;

    let isMounted = true;
    let intervalId;

    const run = async () => {
      if (!isMounted) return;

      await Promise.all([
        fetchClients(),
        fetchStaff(),
      ]);
    };

    run();

    intervalId = setInterval(run, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [
    authResolved,
    user,
    fetchClients,
    fetchStaff,
  ]);

  /* =========================
     Close dropdown outside
  ========================= */

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!openAssignForClientId) return;

      if (
        assignMenuRef.current &&
        !assignMenuRef.current.contains(e.target)
      ) {
        setOpenAssignForClientId(null);
      }
    };

    document.addEventListener(
      "mousedown",
      onClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        onClickOutside
      );
  }, [openAssignForClientId]);

  /* =========================
     Impersonation
  ========================= */

  const handleManageClient = async (client) => {
    try {
      const res = await fetch(
        "/api/producer/impersonate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            clientId: client._id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(
          data?.message ||
            "שגיאה בכניסה ללקוח"
        );
        return;
      }

      const eventId = getClientEventId(
        client,
        data?.eventId
      );

      if (!eventId) {
        alert("לא נמצא eventId ללקוח");
        return;
      }

      router.push(
        `/events/production?eventId=${eventId}&tab=overview`
      );
    } catch (err) {
      console.error(
        "❌ handleManageClient error:",
        err
      );

      alert("שגיאה בכניסה לניהול הלקוח");
    }
  };

  /* =========================
     Assignment helpers
  ========================= */

  const isClientAssignedToStaff = useCallback(
    (clientId, staff) => {
      const ids = Array.isArray(
        staff?.assignedClientIds
      )
        ? staff.assignedClientIds
        : [];

      return ids.some(
        (id) => String(id) === String(clientId)
      );
    },
    []
  );

  const assignedStaffNamesForClient = useCallback(
    (clientId) => {
      const names = staffList
        .filter((s) =>
          isClientAssignedToStaff(clientId, s)
        )
        .map((s) => s.name)
        .filter(Boolean);

      if (names.length === 0) return "ללא עובד";
      if (names.length <= 2)
        return names.join(", ");

      return `${names
        .slice(0, 2)
        .join(", ")} +${names.length - 2}`;
    },
    [staffList, isClientAssignedToStaff]
  );

  const getFilteredStaffForClient = useCallback(
    (clientId) => {
      const q = String(
        staffSearchByClientId?.[
          String(clientId)
        ] || ""
      )
        .trim()
        .toLowerCase();

      if (!q) return staffList;

      return staffList.filter((s) => {
        const name = String(
          s?.name || ""
        ).toLowerCase();

        const email = String(
          s?.email || ""
        ).toLowerCase();

        return (
          name.includes(q) ||
          email.includes(q)
        );
      });
    },
    [staffList, staffSearchByClientId]
  );

  const toggleAssignClientToStaff = async (
    client,
    staff,
    shouldAssign
  ) => {
    try {
      setSavingClientId(String(client._id));

      const res = await fetch(
        "/api/producer/staff/assign-clients",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            staffId: String(staff._id),
            clientId: String(client._id),
            action: shouldAssign
              ? "add"
              : "remove",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data?.message || "שגיאה בשמירה"
        );
      }

      setStaffList((prev) =>
        prev.map((s) =>
          String(s._id) === String(staff._id)
            ? {
                ...s,
                assignedClientIds:
                  data.assignedClientIds,
              }
            : s
        )
      );
    } catch (err) {
      console.error(err);
      alert(
        err.message ||
          "שגיאה בשמירת ההקצאה"
      );
    } finally {
      setSavingClientId(null);
    }
  };

  /* =========================
     Phone edit
  ========================= */

  function startEditPhone(client) {
    setEditingPhoneClientId(String(client._id));

    setPhoneDraftByClientId((prev) => ({
      ...prev,
      [String(client._id)]: client.phone || "",
    }));
  }

  function cancelEditPhone() {
    setEditingPhoneClientId(null);
  }

  async function saveClientPhone(client) {
    const clientId = String(client._id);
    const phone = String(phoneDraftByClientId[clientId] || "").trim();

    try {
      setSavingPhoneClientId(clientId);

      const res = await fetch(`/api/producer/clients`, {

        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phone,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "שגיאה בשמירת מספר טלפון");
      }

      setClients((prev) =>
        prev.map((item) =>
          String(item._id) === clientId
            ? {
                ...item,
                phone,
              }
            : item
        )
      );

      setEditingPhoneClientId(null);
    } catch (err) {
      console.error(err);
      alert(
        err?.message ||
          "לא הצלחנו לשמור מספר טלפון. צריך לוודא שקיים PATCH /api/producer/clients/[clientId]"
      );
    } finally {
      setSavingPhoneClientId(null);
    }
  }

  /* =========================
     Stats + Filters
  ========================= */

  const stats = useMemo(() => {
    const clientsWithEvent = clients.filter(
      (client) =>
        client.event ||
        client.eventId ||
        client.invitation
    );

    return {
      activeClients: clients.length,
      activeEvents: clientsWithEvent.length,
      upcomingWeek: clientsWithEvent.filter(
        (client) =>
          getEventDate(client) &&
          isWithinDays(getEventDate(client), 7)
      ).length,
      staffCount: staffList.length,
    };
  }, [clients, staffList]);

  const filteredClients = useMemo(() => {
    const q = searchTerm
      .trim()
      .toLowerCase();

    return clients
      .filter((client) => {
        if (!q) return true;

        const haystack = [
          client.name,
          client.email,
          client.phone,
          getEventTitle(client),
          getEventLocation(client),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .filter((client) => {
        const date = getEventDate(client);

        if (eventFilter === "all") return true;
        if (eventFilter === "week")
          return isWithinDays(date, 7);
        if (eventFilter === "future")
          return date && !isPastDate(date);
        if (eventFilter === "past")
          return isPastDate(date);
        if (eventFilter === "no-date")
          return !date;

        return true;
      })
      .sort((a, b) => {
        const aDate = getEventDate(a);
        const bDate = getEventDate(b);

        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;

        return new Date(aDate) - new Date(bDate);
      });
  }, [clients, searchTerm, eventFilter]);


  const producerCalendarEvents = useMemo(() => {
  const result = [];

  clients.forEach((client) => {
    const clientName =
      client.name || "לקוח ללא שם";

    const eventTitle =
      getEventTitle(client);

    const eventId =
      getClientEventId(client) ||
      client?.event?._id ||
      client?.eventId ||
      client?._id;

    const eventLocation =
      getEventLocation(client);

    /*
      1. האירוע הראשי של הלקוח
    */
    const mainEventDate =
      getEventDate(client);

    if (mainEventDate) {
      result.push({
        id: `${eventId}-main-event`,
        kind: "main-event",

        clientId: client._id,
        clientName,

        eventId,
        eventTitle,

        title: eventTitle,
        date: mainEventDate,
        time: "",

        location: eventLocation,
        description: "תאריך האירוע הראשי",

        type: "event",
        typeLabel: "אירוע",

        totalGuests: getTotalGuests(client),
        approvedCount: getApprovedCount(client),
        status: getEventStatus(client),

        client,
      });
    }

    /*
      2. כל מה שנוסף ביומן הלקוח בהפקה
      פגישות / תזכורות / משימות / שיחות / זום
    */
    const calendarItems = Array.isArray(client.calendarItems)
      ? client.calendarItems
      : [];

    calendarItems.forEach((item) => {
      const itemDate =
        item.date ||
        item.meetingDate ||
        item.eventDate ||
        item.dueDate;

      if (!itemDate) return;

      const itemType =
        item.calendarType ||
        item.meetingType ||
        item.type ||
        "meeting";

      const itemTime =
        item.time ||
        item.meetingTime ||
        item.eventTime ||
        item.hour ||
        "";

      const itemTitle =
        item.title ||
        item.entityName ||
        item.name ||
        "פריט ביומן";

      result.push({
        id: item._id,
        kind: "calendar-item",

        clientId: client._id,
        clientName,

        eventId,
        eventTitle,

        title: itemTitle,
        date: itemDate,
        time: itemTime,

        location:
          item.location ||
          item.address ||
          item.zoomLink ||
          "",

        description:
          item.description ||
          item.notes ||
          item.summary ||
          item.message ||
          "",

        type: itemType,
        typeLabel: getProducerCalendarTypeLabel(itemType),

        status: getEventStatus(client),

        totalGuests: getTotalGuests(client),
        approvedCount: getApprovedCount(client),

        client,
        raw: item,
      });
    });
  });

  return result.sort((a, b) => {
    const aDate = `${a.date}T${a.time || "00:00"}`;
    const bDate = `${b.date}T${b.time || "00:00"}`;

    return (
      new Date(aDate).getTime() -
      new Date(bDate).getTime()
    );
  });
}, [clients]);

  /* =========================
     UI
  ========================= */

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-[#F8F3ED]
        px-5
        py-8
        space-y-8
      "
    >
      {/* Header */}
      <section
        className="
          relative
          overflow-hidden
          rounded-[38px]
          border
          border-[#ECE5DE]
          bg-gradient-to-br
          from-white
          via-[#FBF7F1]
          to-[#F4EDFF]
          px-7
          py-8
          shadow-[0_24px_70px_rgba(120,90,60,0.08)]
        "
      >
        <div
          className="
            absolute
            -top-20
            -left-20
            h-56
            w-56
            rounded-full
            bg-purple-200/30
            blur-3xl
          "
        />

        <div
          className="
            relative
            z-10
            flex
            flex-col
            lg:flex-row
            lg:items-center
            justify-between
            gap-6
          "
        >
          <div>
            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#E8DDD3]
                bg-white/80
                px-4
                py-2
                text-xs
                font-black
                text-[#7A4A35]
                mb-4
              "
            >
              <Sparkles size={15} />
              סביבת עבודה למפיקים
            </div>

            <h1
              className="
                text-4xl
                xl:text-5xl
                font-black
                text-[#1E1B2E]
                leading-tight
              "
            >
              דשבורד מפיק
            </h1>

            <p className="text-gray-500 mt-3 max-w-2xl leading-7">
              ניהול לקוחות, אירועים קרובים, שיוך עובדים
              וכניסה מהירה לכל אירוע במקום אחד.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowProducerCalendar(true)}
              className="
                rounded-2xl
                border
                border-[#E8DDD3]
                bg-white/85
                text-[#1E1B2E]
                font-black
                px-6
                py-4
                text-sm
                flex
                items-center
                justify-center
                gap-2
                shadow-sm
                hover:bg-white
                transition
              "
            >
              <CalendarDays className="w-4 h-4 text-[#8B5CF6]" />
              יומן מפיק
            </button>

            <button
              type="button"
              onClick={() => setShowCreateClient(true)}
              className="
                rounded-2xl
                bg-[#1E1B2E]
                text-white
                font-black
                px-6
                py-4
                text-sm
                flex
                items-center
                justify-center
                gap-2
                shadow-[0_16px_35px_rgba(30,27,46,0.18)]
                hover:opacity-95
                transition
              "
            >
              <UserPlus className="w-4 h-4" />
              יצירת משתמש חדש
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-4
        "
      >
        <DashboardStat
          index={0}
          icon={Users}
          label="לקוחות פעילים"
          value={stats.activeClients}
          description="כל הלקוחות תחת המפיק"
        />

        <DashboardStat
          index={1}
          icon={LayoutDashboard}
          label="אירועים פעילים"
          value={stats.activeEvents}
          description="לקוחות עם אירוע פתוח"
        />

        <DashboardStat
          index={2}
          icon={CalendarClock}
          label="אירועים בשבוע הקרוב"
          value={stats.upcomingWeek}
          description="דורש טיפול ותיאום קרוב"
          highlight
        />

        <DashboardStat
          index={3}
          icon={UserRoundCog}
          label="עובדים בצוות"
          value={stats.staffCount}
          description="זמינים להקצאה ללקוחות"
        />
      </section>

      {/* Toolbar */}
      <section
        className="
          rounded-[34px]
          border
          border-[#ECE5DE]
          bg-white
          p-5
          shadow-sm
        "
      >
        <div
          className="
            flex
            flex-col
            lg:flex-row
            lg:items-center
            justify-between
            gap-4
          "
        >
          <div>
            <h2 className="text-2xl font-black text-[#1E1B2E]">
              לקוחות ואירועים
            </h2>

            <p className="text-sm text-gray-400 mt-1">
              הטבלה מציגה נתוני אירוע לכל לקוח בנפרד, כולל אישורי הגעה בתוך השורה.
            </p>
          </div>

          <div
            className="
              flex
              flex-col
              md:flex-row
              gap-3
              w-full
              lg:w-auto
            "
          >
            <div
              className="
                relative
                w-full
                md:w-[320px]
              "
            >
              <Search
                size={17}
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="חיפוש לפי לקוח, מייל, טלפון, מקום..."
                className="
                  w-full
                  rounded-2xl
                  border
                  border-[#E7E2DD]
                  bg-[#FCFBFA]
                  py-3
                  pr-11
                  pl-4
                  text-sm
                  font-bold
                  outline-none
                  focus:border-[#B99C82]
                "
              />
            </div>

            <div className="relative">
              <Filter
                size={15}
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <select
                value={eventFilter}
                onChange={(e) =>
                  setEventFilter(e.target.value)
                }
                className="
                  w-full
                  md:w-[210px]
                  rounded-2xl
                  border
                  border-[#E7E2DD]
                  bg-[#FCFBFA]
                  py-3
                  pr-11
                  pl-4
                  text-sm
                  font-bold
                  outline-none
                  focus:border-[#B99C82]
                "
              >
                <option value="all">כל האירועים</option>
                <option value="week">השבוע הקרוב</option>
                <option value="future">אירועים עתידיים</option>
                <option value="past">אירועים שעברו</option>
                <option value="no-date">ללא תאריך</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowProducerCalendar(true)}
              className="
                rounded-2xl
                border
                border-[#E8DDD3]
                bg-[#FCFBFA]
                px-5
                py-3
                text-sm
                font-black
                text-[#1E1B2E]
                flex
                items-center
                justify-center
                gap-2
                hover:bg-white
              "
            >
              <CalendarDays size={16} className="text-[#8B5CF6]" />
              יומן
            </button>

            <button
              type="button"
              onClick={() =>
                Promise.all([
                  fetchClients(),
                  fetchStaff(),
                ])
              }
              className="
                rounded-2xl
                border
                border-[#E8DDD3]
                bg-white
                px-5
                py-3
                text-sm
                font-black
                text-[#1E1B2E]
                flex
                items-center
                justify-center
                gap-2
                hover:bg-[#FCFBFA]
              "
            >
              <RefreshCcw size={16} />
              רענון
            </button>
          </div>
        </div>
      </section>

      {/* Clients Table */}
      <section
        className="
          rounded-[34px]
          border
          border-[#ECE5DE]
          bg-white
          shadow-sm
          overflow-hidden
        "
      >
        {clientsLoading ? (
          <EmptyPanel text="טוען לקוחות…" />
        ) : clients.length === 0 ? (
          <EmptyPanel text="עדיין לא נוצרו לקוחות" />
        ) : filteredClients.length === 0 ? (
          <EmptyPanel text="לא נמצאו לקוחות לפי הסינון הנוכחי" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr
                  className="
                    text-right
                    bg-[#FCFBFA]
                    border-b
                    border-[#ECE5DE]
                    text-[#7B7285]
                  "
                >
                  <th className="p-4 font-black">לקוח</th>
                  <th className="p-4 font-black">פרטי קשר</th>
                  <th className="p-4 font-black">אירוע</th>
                  <th className="p-4 font-black">תאריך</th>
                  <th className="p-4 font-black">מקום</th>
                  <th className="p-4 font-black">מוזמנים</th>
                  <th className="p-4 font-black">אישורי הגעה</th>
                  <th className="p-4 font-black">סטטוס</th>
                  <th className="p-4 font-black">הקצאה לעובד/ים</th>
                  <th className="p-4 font-black"></th>
                </tr>
              </thead>

              <tbody>
                {filteredClients.map((client) => {
                  const isOpen =
                    openAssignForClientId ===
                    String(client._id);

                  const isSavingThisRow =
                    savingClientId === String(client._id);

                  const filteredStaff =
                    getFilteredStaffForClient(
                      client._id
                    );

                  const eventStatus =
                    getEventStatus(client);

                  const totalGuests =
                    getTotalGuests(client);

                  const approvedCount =
                    getApprovedCount(client);

                  return (
                    <tr
                      key={client._id}
                      className="
                        border-b
                        border-[#F0ECE7]
                        hover:bg-[#FCFBFA]
                        transition
                      "
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="
                              h-11
                              w-11
                              rounded-2xl
                              bg-[#F5E7DC]
                              text-[#7A4A35]
                              flex
                              items-center
                              justify-center
                              font-black
                              shrink-0
                            "
                          >
                            {String(client.name || "?")
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>

                          <div>
                            <div className="font-black text-[#1E1B2E]">
                              {client.name || "ללא שם"}
                            </div>

                            <div className="text-xs text-gray-400 mt-1">
                              {client._id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <ContactLine
                            icon={Mail}
                            text={client.email || "—"}
                          />

                          <EditablePhoneLine
                            client={client}
                            editingPhoneClientId={editingPhoneClientId}
                            phoneDraftByClientId={phoneDraftByClientId}
                            setPhoneDraftByClientId={setPhoneDraftByClientId}
                            savingPhoneClientId={savingPhoneClientId}
                            onStartEdit={startEditPhone}
                            onCancel={cancelEditPhone}
                            onSave={saveClientPhone}
                          />
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-black text-[#1E1B2E]">
                          {getEventTitle(client)}
                        </div>
                      </td>

                      <td className="p-4">
                        <div
                          className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-full
                            bg-[#FCFBFA]
                            border
                            border-[#E8DDD3]
                            px-3
                            py-2
                            font-bold
                            text-[#1E1B2E]
                          "
                        >
                          <CalendarDays size={14} />
                          {formatDate(getEventDate(client))}
                        </div>
                      </td>

                      <td className="p-4">
                        <div
                          className="
                            flex
                            items-center
                            gap-2
                            text-[#1E1B2E]
                            font-bold
                          "
                        >
                          <MapPin
                            size={15}
                            className="text-[#7A4A35]"
                          />
                          {getEventLocation(client)}
                        </div>
                      </td>

                      <td className="p-4 font-black text-[#1E1B2E]">
                        {totalGuests || "—"}
                      </td>

                      <td className="p-4">
                        {totalGuests ? (
                          <div className="min-w-[120px]">
                            <div className="flex items-center justify-between text-xs font-black text-gray-400 mb-2">
                              <span>
                                {approvedCount} / {totalGuests}
                              </span>
                              <span>
                                {Math.round(
                                  (approvedCount / totalGuests) *
                                    100
                                )}
                                %
                              </span>
                            </div>

                            <div className="h-2 rounded-full bg-[#F5E7DC] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#8B5CF6]"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round(
                                      (approvedCount /
                                        totalGuests) *
                                        100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`
                            inline-flex
                            items-center
                            rounded-full
                            border
                            px-3
                            py-2
                            text-xs
                            font-black
                            ${eventStatus.className}
                          `}
                        >
                          {eventStatus.label}
                        </span>
                      </td>

                      <td className="p-4 relative">
                        <div
                          className="inline-flex items-center gap-2"
                          ref={
                            isOpen
                              ? assignMenuRef
                              : null
                          }
                        >
                          <button
                            type="button"
                            disabled={isSavingThisRow}
                            onClick={() =>
                              setOpenAssignForClientId(
                                (prev) =>
                                  prev ===
                                  String(client._id)
                                    ? null
                                    : String(client._id)
                              )
                            }
                            className="
                              rounded-2xl
                              border
                              border-[#E8DDD3]
                              bg-white
                              px-4
                              py-2.5
                              text-sm
                              font-black
                              text-[#1E1B2E]
                              flex
                              items-center
                              gap-2
                              hover:bg-[#FCFBFA]
                              disabled:opacity-50
                            "
                          >
                            <UserRoundCheck size={15} />
                            {isSavingThisRow
                              ? "שומר..."
                              : assignedStaffNamesForClient(
                                  client._id
                                )}
                            <ChevronDown className="w-4 h-4" />
                          </button>

                          {isOpen && (
                            <div
                              className="
                                absolute
                                z-50
                                top-12
                                right-0
                                min-w-[340px]
                                rounded-[24px]
                                border
                                border-[#ECE5DE]
                                bg-white
                                shadow-[0_24px_70px_rgba(30,27,46,0.14)]
                                p-3
                              "
                            >
                              <div
                                className="
                                  px-3
                                  py-2
                                  text-xs
                                  font-black
                                  text-gray-400
                                  border-b
                                  border-[#F0ECE7]
                                  mb-3
                                "
                              >
                                בחרי עובד/ים ללקוח זה
                              </div>

                              <div className="px-1 pb-3">
                                <input
                                  type="text"
                                  value={
                                    staffSearchByClientId[
                                      String(client._id)
                                    ] || ""
                                  }
                                  onChange={(e) =>
                                    setStaffSearchByClientId(
                                      (prev) => ({
                                        ...prev,
                                        [String(
                                          client._id
                                        )]: e.target.value,
                                      })
                                    )
                                  }
                                  placeholder="חיפוש לפי שם/אימייל..."
                                  className="
                                    w-full
                                    rounded-2xl
                                    border
                                    border-[#E7E2DD]
                                    bg-[#FCFBFA]
                                    px-4
                                    py-3
                                    text-sm
                                    outline-none
                                  "
                                />
                              </div>

                              {staffLoading ? (
                                <div className="px-3 py-3 text-sm text-gray-400">
                                  טוען עובדים…
                                </div>
                              ) : filteredStaff.length === 0 ? (
                                <div className="px-3 py-3 text-sm text-gray-400">
                                  לא נמצאו עובדים
                                </div>
                              ) : (
                                <div className="max-h-64 overflow-auto space-y-1">
                                  {filteredStaff.map(
                                    (staff) => {
                                      const checked =
                                        isClientAssignedToStaff(
                                          client._id,
                                          staff
                                        );

                                      return (
                                        <label
                                          key={staff._id}
                                          className="
                                            flex
                                            items-center
                                            gap-3
                                            px-3
                                            py-3
                                            rounded-2xl
                                            hover:bg-[#FCFBFA]
                                            cursor-pointer
                                          "
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={
                                              isSavingThisRow
                                            }
                                            onChange={(e) =>
                                              toggleAssignClientToStaff(
                                                client,
                                                staff,
                                                e.target
                                                  .checked
                                              )
                                            }
                                          />

                                          <span className="text-sm font-bold text-[#1E1B2E]">
                                            {staff.name}{" "}
                                            <span className="text-gray-400 font-medium">
                                              ({staff.email})
                                            </span>
                                          </span>
                                        </label>
                                      );
                                    }
                                  )}
                                </div>
                              )}

                              <div
                                className="
                                  pt-3
                                  mt-3
                                  border-t
                                  border-[#F0ECE7]
                                  flex
                                  items-center
                                  justify-between
                                "
                              >
                                <span className="text-xs text-gray-400 font-bold">
                                  מוקצים כרגע:{" "}
                                  {
                                    staffList.filter((s) =>
                                      isClientAssignedToStaff(
                                        client._id,
                                        s
                                      )
                                    ).length
                                  }
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenAssignForClientId(
                                      null
                                    )
                                  }
                                  className="
                                    text-sm
                                    font-black
                                    text-[#8B5CF6]
                                  "
                                >
                                  סגור
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleManageClient(client)
                          }
                          className="
                            rounded-2xl
                            bg-[#1E1B2E]
                            text-white
                            font-black
                            px-4
                            py-3
                            text-sm
                            flex
                            items-center
                            gap-2
                            hover:opacity-95
                          "
                        >
                          ניהול
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ProducerCalendarModal
        open={showProducerCalendar}
        events={producerCalendarEvents}
        onClose={() => setShowProducerCalendar(false)}
        onManage={(client) => {
          setShowProducerCalendar(false);
          handleManageClient(client);
        }}
      />

      <CreateClientModal
        open={showCreateClient}
        onClose={() =>
          setShowCreateClient(false)
        }
        onSuccess={async () => {
          await Promise.all([
            fetchClients(),
            fetchStaff(),
          ]);
        }}
      />
    </div>
  );
}

/* =========================
   UI Components
========================= */

function DashboardStat({
  icon: Icon,
  label,
  value,
  description,
  index,
  highlight = false,
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={index}
      className={`
        rounded-[30px]
        border
        p-5
        shadow-sm
        ${
          highlight
            ? "bg-gradient-to-br from-[#F4EDFF] via-white to-[#FBF7F1] border-[#E7D8FF]"
            : "bg-white border-[#ECE5DE]"
        }
      `}
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className={`
            h-12
            w-12
            rounded-2xl
            flex
            items-center
            justify-center
            ${
              highlight
                ? "bg-[#8B5CF6] text-white"
                : "bg-[#F5E7DC] text-[#7A4A35]"
            }
          `}
        >
          <Icon size={20} />
        </div>

        <div className="text-4xl font-black text-[#1E1B2E]">
          {value}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-sm font-black text-[#1E1B2E]">
          {label}
        </div>

        <div className="text-xs text-gray-400 mt-1">
          {description}
        </div>
      </div>
    </motion.div>
  );
}

function ContactLine({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Icon size={13} className="text-[#7A4A35]" />
      <span>{text}</span>
    </div>
  );
}

function EditablePhoneLine({
  client,
  editingPhoneClientId,
  phoneDraftByClientId,
  setPhoneDraftByClientId,
  savingPhoneClientId,
  onStartEdit,
  onCancel,
  onSave,
}) {
  const clientId = String(client._id);
  const isEditing = editingPhoneClientId === clientId;
  const isSaving = savingPhoneClientId === clientId;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Phone size={13} className="text-[#7A4A35]" />

        <input
          value={phoneDraftByClientId[clientId] || ""}
          onChange={(e) =>
            setPhoneDraftByClientId((prev) => ({
              ...prev,
              [clientId]: e.target.value,
            }))
          }
          placeholder="הוספת טלפון"
          className="
            w-[150px]
            rounded-xl
            border
            border-[#E7E2DD]
            bg-[#FCFBFA]
            px-3
            py-1.5
            text-xs
            font-bold
            outline-none
            focus:border-[#B99C82]
          "
        />

        <button
          type="button"
          disabled={isSaving}
          onClick={() => onSave(client)}
          className="
            h-7
            w-7
            rounded-lg
            bg-green-50
            text-green-600
            flex
            items-center
            justify-center
            disabled:opacity-50
          "
        >
          <Save size={13} />
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="
            h-7
            w-7
            rounded-lg
            bg-red-50
            text-red-500
            flex
            items-center
            justify-center
            disabled:opacity-50
          "
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Phone size={13} className="text-[#7A4A35]" />

      <span>{client.phone || "אין טלפון"}</span>

      <button
        type="button"
        onClick={() => onStartEdit(client)}
        className="
          mr-1
          h-7
          w-7
          rounded-lg
          bg-[#F5E7DC]
          text-[#7A4A35]
          flex
          items-center
          justify-center
          hover:bg-[#EFE4DA]
        "
        title="עריכת טלפון"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}


function ProducerCalendarModal({
  open,
  events,
  onClose,
  onManage,
}) {
  const [currentMonth, setCurrentMonth] =
    useState(() => {
      const now = new Date();
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );
    });

  if (!open) return null;

  const monthLabel =
    currentMonth.toLocaleDateString("he-IL", {
      month: "long",
      year: "numeric",
    });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const startOffset = firstDay.getDay();

  const calendarCells = [];

  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(new Date(year, month, day));
  }

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  function sameDay(a, b) {
    return (
      a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function eventsForDate(date) {
    if (!date) return [];

    return events.filter((event) =>
      sameDay(new Date(event.date), date)
    );
  }

  function goPrevMonth() {
    setCurrentMonth(
      new Date(year, month - 1, 1)
    );
  }

  function goNextMonth() {
    setCurrentMonth(
      new Date(year, month + 1, 1)
    );
  }

  function goToday() {
    const now = new Date();
    setCurrentMonth(
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
    );
  }

  const upcomingEvents = events
    .filter((event) => {
      const d = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .slice(0, 8);

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        bg-black/35
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-4
      "
      dir="rtl"
    >
      <div
        className="
          w-full
          max-w-7xl
          max-h-[92vh]
          overflow-hidden
          rounded-[38px]
          border
          border-[#ECE5DE]
          bg-[#F8F3ED]
          shadow-[0_30px_100px_rgba(30,27,46,0.25)]
        "
      >
        <div
          className="
            flex
            flex-col
            lg:flex-row
            lg:items-center
            justify-between
            gap-4
            border-b
            border-[#ECE5DE]
            bg-gradient-to-br
            from-white
            via-[#FBF7F1]
            to-[#F4EDFF]
            p-6
          "
        >
          <div>
            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#E8DDD3]
                bg-white/80
                px-4
                py-2
                text-xs
                font-black
                text-[#7A4A35]
                mb-3
              "
            >
              <CalendarDays size={15} />
              יומן הפקות חודשי
            </div>

            <h2 className="text-3xl font-black text-[#1E1B2E]">
              יומן מפיק
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              כל האירועים של הלקוחות שלך מרוכזים בלוח חודשי אחד.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="
                rounded-2xl
                border
                border-[#E8DDD3]
                bg-white
                px-4
                py-3
                text-sm
                font-black
                text-[#1E1B2E]
              "
            >
              היום
            </button>

            <button
              type="button"
              onClick={goPrevMonth}
              className="
                h-11
                w-11
                rounded-2xl
                border
                border-[#E8DDD3]
                bg-white
                flex
                items-center
                justify-center
              "
            >
              <ChevronRight size={18} />
            </button>

            <div
              className="
                min-w-[160px]
                rounded-2xl
                bg-white
                border
                border-[#E8DDD3]
                px-4
                py-3
                text-center
                font-black
                text-[#1E1B2E]
              "
            >
              {monthLabel}
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              className="
                h-11
                w-11
                rounded-2xl
                border
                border-[#E8DDD3]
                bg-white
                flex
                items-center
                justify-center
              "
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="
                h-11
                w-11
                rounded-2xl
                bg-[#1E1B2E]
                text-white
                flex
                items-center
                justify-center
              "
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="
            grid
            grid-cols-1
            xl:grid-cols-[1fr_360px]
            gap-5
            p-5
            overflow-y-auto
            max-h-[calc(92vh-150px)]
          "
        >
          <div
            className="
              rounded-[30px]
              border
              border-[#ECE5DE]
              bg-white
              overflow-hidden
            "
          >
            <div
              className="
                grid
                grid-cols-7
                bg-[#FCFBFA]
                border-b
                border-[#ECE5DE]
                text-center
                text-xs
                font-black
                text-[#7B7285]
              "
            >
              {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map(
                (day) => (
                  <div key={day} className="py-3">
                    {day}
                  </div>
                )
              )}
            </div>

            <div className="grid grid-cols-7">
              {calendarCells.map((date, index) => {
                const dayEvents = eventsForDate(date);
                const isToday =
                  date && sameDay(date, new Date());

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[135px]
                      border-b
                      border-l
                      border-[#F0ECE7]
                      p-2
                      ${
                        date
                          ? "bg-white"
                          : "bg-[#FCFBFA]"
                      }
                    `}
                  >
                    {date && (
                      <>
                        <div
                          className={`
                            h-8
                            w-8
                            rounded-xl
                            flex
                            items-center
                            justify-center
                            text-sm
                            font-black
                            mb-2
                            ${
                              isToday
                                ? "bg-[#8B5CF6] text-white"
                                : "bg-[#F5E7DC] text-[#7A4A35]"
                            }
                          `}
                        >
                          {date.getDate()}
                        </div>

                        <div className="space-y-1.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <button
                              type="button"
                              key={`${event.id}-${event.clientId}`}
                              onClick={() => onManage(event.client)}
                              className="
                                w-full
                                rounded-xl
                                border
                                border-[#E7D8FF]
                                bg-[#F4EDFF]
                                px-2
                                py-2
                                text-right
                                hover:bg-[#EFE4FF]
                                transition
                              "
                            >
                              <div className="text-[11px] font-black text-[#1E1B2E] truncate">
  {event.title}
</div>

<div className="text-[10px] text-[#7B7285] truncate mt-0.5">
  {event.clientName}
  {event.time ? ` · ${event.time}` : ""}
</div>

<div className="text-[10px] text-[#8B5CF6] font-black truncate mt-0.5">
  {event.typeLabel}
</div>
                            </button>
                          ))}

                          {dayEvents.length > 3 && (
                            <div className="text-[10px] font-black text-[#8B5CF6]">
                              +{dayEvents.length - 3} נוספים
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside
            className="
              rounded-[30px]
              border
              border-[#ECE5DE]
              bg-white
              p-5
              h-fit
            "
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="
                  h-12
                  w-12
                  rounded-2xl
                  bg-[#F5E7DC]
                  text-[#7A4A35]
                  flex
                  items-center
                  justify-center
                "
              >
                <Clock3 size={18} />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#1E1B2E]">
                  אירועים קרובים
                </h3>

                <p className="text-xs text-gray-400">
                  לחצי על אירוע כדי להיכנס לניהול
                </p>
              </div>
            </div>

            {upcomingEvents.length === 0 ? (
              <div
                className="
                  rounded-2xl
                  border
                  border-dashed
                  border-[#E8DDD3]
                  bg-[#FCFBFA]
                  p-5
                  text-center
                  text-sm
                  text-gray-400
                  font-bold
                "
              >
                אין אירועים קרובים.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <button
                    key={`${event.id}-${event.clientId}`}
                    type="button"
                    onClick={() => onManage(event.client)}
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-[#F0ECE7]
                      bg-[#FCFBFA]
                      p-4
                      text-right
                      hover:border-[#E7D8FF]
                      hover:bg-[#F4EDFF]
                      transition
                    "
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-[#1E1B2E]">
  {event.title}
</div>

<div className="text-xs text-gray-400 mt-1">
  לקוח: {event.clientName}
</div>

<div className="text-xs text-gray-400 mt-1">
  אירוע: {event.eventTitle}
</div>

{event.time && (
  <div className="text-xs text-gray-500 mt-1">
    שעה: {event.time}
  </div>
)}

<div className="mt-2 inline-flex rounded-full bg-[#F4EDFF] text-[#6D28D9] px-3 py-1 text-[11px] font-black">
  {event.typeLabel}
</div>
                      </div>

                      <span
                        className={`
                          rounded-full
                          border
                          px-3
                          py-1.5
                          text-[11px]
                          font-black
                          ${event.status.className}
                        `}
                      >
                        {event.status.label}
                      </span>
                    </div>

                    <div
                      className="
                        mt-3
                        grid
                        grid-cols-2
                        gap-2
                        text-xs
                        text-gray-500
                      "
                    >
                      <div className="flex items-center gap-1">
                        <CalendarDays size={13} />
                        {formatDate(event.date)}
                      </div>

                      <div className="flex items-center gap-1 truncate">
                        <MapPin size={13} />
                        {event.location || "—"}
                      </div>

                      <div>
                        מוזמנים: {event.totalGuests || "—"}
                      </div>

                      <div>
                        אישרו: {event.approvedCount || 0}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ text }) {
  return (
    <div
      className="
        p-12
        text-center
        text-gray-400
        font-bold
      "
    >
      {text}
    </div>
  );
}
