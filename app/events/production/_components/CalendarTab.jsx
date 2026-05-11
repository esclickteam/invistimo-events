"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import heLocale from "@fullcalendar/core/locales/he";

import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Sparkles,
  X,
  Save,
  Trash2,
  Video,
  Bell,
  Phone,
  ClipboardList,
  PartyPopper,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";

/* ======================================================
   ITEM TYPES
====================================================== */

const ITEM_TYPES = [
  {
    key: "meeting",
    label: "פגישה",
    icon: CalendarDays,
    bg: "#F4EDFF",
    text: "#6D28D9",
    border: "#E7D8FF",
  },
  {
    key: "event",
    label: "אירוע",
    icon: PartyPopper,
    bg: "#FFF7ED",
    text: "#C2410C",
    border: "#FED7AA",
  },
  {
    key: "reminder",
    label: "תזכורת",
    icon: Bell,
    bg: "#EEF6FF",
    text: "#1D4ED8",
    border: "#BFDBFE",
  },
  {
    key: "task",
    label: "משימה",
    icon: ClipboardList,
    bg: "#F0FDF4",
    text: "#15803D",
    border: "#BBF7D0",
  },
  {
    key: "call",
    label: "שיחת טלפון",
    icon: Phone,
    bg: "#FFF1F2",
    text: "#BE123C",
    border: "#FECDD3",
  },
  {
    key: "zoom",
    label: "פגישת זום",
    icon: Video,
    bg: "#F5F3FF",
    text: "#7C3AED",
    border: "#DDD6FE",
  },
];

function getTypeMeta(type) {
  return (
    ITEM_TYPES.find((item) => item.key === type) ||
    ITEM_TYPES[0]
  );
}

function formatDateInput(date) {
  if (!date) return "";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeTime(time) {
  if (!time) return "";

  return String(time).slice(0, 5);
}

function buildStart(date, time) {
  if (!date) return null;

  if (time) {
    return `${date}T${time}`;
  }

  return date;
}

function mapConversationToCalendarItem(item) {
  const itemType =
    item.calendarType ||
    item.meetingType ||
    item.type ||
    "meeting";

  const typeMeta = getTypeMeta(itemType);

  const date =
    item.date ||
    item.meetingDate ||
    item.eventDate ||
    item.dueDate ||
    null;

  const time =
    normalizeTime(
      item.time ||
        item.meetingTime ||
        item.eventTime ||
        item.hour
    ) || "";

  const title =
    item.title ||
    item.entityName ||
    item.name ||
    item.subject ||
    "פריט ביומן";

  return {
    id: item._id,
    title,
    start: buildStart(date, time),
    allDay: !time,
    backgroundColor: typeMeta.bg,
    borderColor: typeMeta.border,
    textColor: typeMeta.text,
    extendedProps: {
      raw: item,
      type: itemType,
      typeLabel: typeMeta.label,
      date,
      time,
      description:
        item.description ||
        item.notes ||
        item.message ||
        "",
      location:
        item.location ||
        item.address ||
        item.zoomLink ||
        "",
      status: item.status || "planned",
    },
  };
}

/* ======================================================
   MAIN
====================================================== */

export default function CalendarTab({ eventId }) {
  const calendarRef = useRef(null);

  const [calendarItems, setCalendarItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [calendarTitle, setCalendarTitle] = useState("");

  /* ======================================================
     LOAD
  ====================================================== */

  async function loadCalendarItems() {
    if (!eventId) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/events/${eventId}/conversations`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!data.success) {
        setCalendarItems([]);
        return;
      }

      const items = Array.isArray(data.conversations)
        ? data.conversations
        : [];

      const calendarEvents = items
        .filter((item) => {
          const type =
            item.calendarType ||
            item.meetingType ||
            item.type;

          return [
            "meeting",
            "event",
            "reminder",
            "task",
            "call",
            "zoom",
          ].includes(type);
        })
        .map(mapConversationToCalendarItem)
        .filter((item) => item.start);

      setCalendarItems(calendarEvents);
    } catch (err) {
      console.error("Failed to load calendar:", err);
      setCalendarItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendarItems();
  }, [eventId]);

  /* ======================================================
     CALENDAR CONTROLS
  ====================================================== */

  function updateTitle() {
    const api = calendarRef.current?.getApi?.();
    if (!api) return;

    setCalendarTitle(api.view.title);
  }

  function goToday() {
    const api = calendarRef.current?.getApi?.();
    api?.today();
    updateTitle();
  }

  function goPrev() {
    const api = calendarRef.current?.getApi?.();
    api?.prev();
    updateTitle();
  }

  function goNext() {
    const api = calendarRef.current?.getApi?.();
    api?.next();
    updateTitle();
  }

  function changeView(view) {
    const api = calendarRef.current?.getApi?.();
    api?.changeView(view);
    updateTitle();
  }

  /* ======================================================
     MODAL ACTIONS
  ====================================================== */

  function openCreateModal(date = new Date()) {
    setSelectedItem({
      _id: null,
      type: "meeting",
      title: "",
      date: formatDateInput(date),
      time: "",
      description: "",
      location: "",
      status: "planned",
    });

    setModalOpen(true);
  }

  function openEditModal(clickInfo) {
    const event = clickInfo.event;
    const raw = event.extendedProps.raw || {};

    setSelectedItem({
      _id: event.id,
      type:
        event.extendedProps.type ||
        raw.calendarType ||
        raw.type ||
        "meeting",
      title:
        event.title ||
        raw.entityName ||
        raw.title ||
        "",
      date:
        event.extendedProps.date ||
        formatDateInput(event.start),
      time:
        event.extendedProps.time ||
        normalizeTime(raw.time),
      description:
        event.extendedProps.description ||
        raw.description ||
        "",
      location:
        event.extendedProps.location ||
        raw.location ||
        "",
      status:
        event.extendedProps.status ||
        raw.status ||
        "planned",
    });

    setModalOpen(true);
  }

  async function saveCalendarItem(form) {
    if (!eventId) return;

    if (!form.title?.trim()) {
      alert("חובה להזין כותרת");
      return;
    }

    if (!form.date) {
      alert("חובה לבחור תאריך");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        type: form.type,
        calendarType: form.type,

        entityName: form.title.trim(),
        title: form.title.trim(),

        date: form.date,
        time: form.time || "",

        description: form.description || "",
        notes: form.description || "",

        location: form.location || "",
        status: form.status || "planned",

        /*
          חשוב ליומן מפיק:
          כל מה שנוסף כאן נשמר על eventId.
          יומן המפיק צריך לשלוף את כל conversations
          של כל eventId ששייך ללקוחות של אותו מפיק.
        */
        eventId,
        syncToProducerCalendar: true,
      };

      let res;

      if (form._id) {
        res = await fetch(
          `/api/events/${eventId}/conversations/${form._id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(
          `/api/events/${eventId}/conversations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      }

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            "שמירת הפריט ביומן נכשלה"
        );
      }

      const saved =
        data?.conversation ||
        data?.item ||
        data?.data ||
        {
          _id: form._id || String(Date.now()),
          ...payload,
        };

      const mapped = mapConversationToCalendarItem(saved);

      setCalendarItems((prev) => {
        const exists = prev.some(
          (item) => String(item.id) === String(mapped.id)
        );

        if (exists) {
          return prev.map((item) =>
            String(item.id) === String(mapped.id)
              ? mapped
              : item
          );
        }

        return [...prev, mapped];
      });

      setModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error(err);

      alert(
        err?.message ||
          "לא הצלחנו לשמור את הפריט ביומן. צריך לוודא שה־API תומך ב־POST/PATCH ל־conversations."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCalendarItem(id) {
    if (!id) {
      setModalOpen(false);
      setSelectedItem(null);
      return;
    }

    const ok = confirm("למחוק את הפריט מהיומן?");
    if (!ok) return;

    setSaving(true);

    try {
      const res = await fetch(
        `/api/events/${eventId}/conversations/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message || "מחיקה נכשלה"
        );
      }

      setCalendarItems((prev) =>
        prev.filter((item) => String(item.id) !== String(id))
      );

      setModalOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
      alert(
        err?.message ||
          "לא הצלחנו למחוק. צריך לוודא שקיים DELETE ל־conversations."
      );
    } finally {
      setSaving(false);
    }
  }

  const upcomingItems = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return calendarItems
      .filter((item) => new Date(item.start) >= now)
      .sort(
        (a, b) =>
          new Date(a.start).getTime() -
          new Date(b.start).getTime()
      )
      .slice(0, 6);
  }, [calendarItems]);

  /* ======================================================
     UI
  ====================================================== */

  return (
    <div
      dir="rtl"
      className="
        w-full
        max-w-none
        mx-auto
        px-4
        py-8
        space-y-8
      "
    >
      {/* HEADER */}
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
          p-7
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
              יומן עבודה להפקה
            </div>

            <h2
              className="
                text-4xl
                xl:text-5xl
                font-black
                text-[#1E1B2E]
                leading-tight
              "
            >
              לוח שנה ופגישות
            </h2>

            <p className="text-gray-500 mt-3 max-w-2xl leading-7">
              כל הפגישות, האירועים, התזכורות והמשימות של ההפקה.
              כל פריט שנוסף כאן נשמר תחת הלקוח ומיועד להופיע גם ביומן המפיק.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal(new Date())}
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
            <Plus size={18} />
            הוספת פריט ליומן
          </button>
        </div>
      </section>

      {/* BODY */}
      <section
        className="
          grid
          grid-cols-1
          xl:grid-cols-[1fr_340px]
          gap-6
          items-start
        "
      >
        {/* CALENDAR */}
        <div
          className="
            rounded-[34px]
            border
            border-[#ECE5DE]
            bg-white
            p-5
            shadow-sm
            overflow-hidden
          "
        >
          {/* Toolbar */}
          <div
            className="
              flex
              flex-col
              lg:flex-row
              lg:items-center
              justify-between
              gap-4
              mb-5
            "
          >
            <div>
              <h3 className="text-2xl font-black text-[#1E1B2E]">
                {calendarTitle || "לוח חודשי"}
              </h3>

              <p className="text-sm text-gray-400 mt-1">
                לחיצה על יום מוסיפה פריט חדש. לחיצה על פריט פותחת עריכה.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goToday}
                className="
                  rounded-2xl
                  border
                  border-[#E8DDD3]
                  bg-[#FCFBFA]
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
                onClick={goPrev}
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

              <button
                type="button"
                onClick={goNext}
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
                onClick={() => changeView("dayGridMonth")}
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
                חודש
              </button>

              <button
                type="button"
                onClick={() => changeView("timeGridWeek")}
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
                שבוע
              </button>

              <button
                type="button"
                onClick={loadCalendarItems}
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
                רענון
              </button>
            </div>
          </div>

          {loading ? (
            <div
              className="
                rounded-[28px]
                border
                border-dashed
                border-[#E8DDD3]
                bg-[#FCFBFA]
                p-12
                text-center
                text-gray-400
                font-bold
              "
            >
              טוען יומן…
            </div>
          ) : (
            <div className="producer-calendar-shell">
              <FullCalendar
                ref={calendarRef}
                plugins={[
                  dayGridPlugin,
                  timeGridPlugin,
                  interactionPlugin,
                ]}
                initialView="dayGridMonth"
                locale={heLocale}
                direction="rtl"
                headerToolbar={false}
                selectable
                editable={false}
                height="auto"
                events={calendarItems}
                dateClick={(info) =>
                  openCreateModal(info.date)
                }
                eventClick={openEditModal}
                datesSet={updateTitle}
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }}
              />
            </div>
          )}
        </div>

        {/* UPCOMING */}
        <aside
          className="
            rounded-[34px]
            border
            border-[#ECE5DE]
            bg-white
            p-5
            shadow-sm
            sticky
            top-24
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
                הקרובים ביומן
              </h3>

              <p className="text-xs text-gray-400">
                פגישות ותזכורות קרובות
              </p>
            </div>
          </div>

          {upcomingItems.length === 0 ? (
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
              אין פריטים קרובים.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingItems.map((item) => {
                const meta = getTypeMeta(
                  item.extendedProps.type
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      openEditModal({
                        event: {
                          id: item.id,
                          title: item.title,
                          start: new Date(item.start),
                          extendedProps: item.extendedProps,
                        },
                      })
                    }
                    className="
                      w-full
                      rounded-2xl
                      border
                      border-[#F0ECE7]
                      bg-[#FCFBFA]
                      p-4
                      text-right
                      hover:bg-[#F4EDFF]
                      hover:border-[#E7D8FF]
                      transition
                    "
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black text-[#1E1B2E]">
                        {item.title}
                      </div>

                      <span
                        className="
                          rounded-full
                          px-3
                          py-1.5
                          text-[11px]
                          font-black
                        "
                        style={{
                          backgroundColor: meta.bg,
                          color: meta.text,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={13} />
                        {new Date(item.start).toLocaleDateString("he-IL")}
                      </div>

                      {item.extendedProps.time && (
                        <div className="flex items-center gap-2">
                          <Clock3 size={13} />
                          {item.extendedProps.time}
                        </div>
                      )}

                      {item.extendedProps.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={13} />
                          {item.extendedProps.location}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      {modalOpen && selectedItem && (
        <CalendarItemModal
          form={selectedItem}
          setForm={setSelectedItem}
          saving={saving}
          onClose={() => {
            setModalOpen(false);
            setSelectedItem(null);
          }}
          onSave={() => saveCalendarItem(selectedItem)}
          onDelete={() =>
            deleteCalendarItem(selectedItem._id)
          }
        />
      )}

      <style jsx global>{`
        .producer-calendar-shell .fc {
          direction: rtl;
          font-family: inherit;
        }

        .producer-calendar-shell .fc-theme-standard td,
        .producer-calendar-shell .fc-theme-standard th {
          border-color: #f0ece7;
        }

        .producer-calendar-shell .fc-scrollgrid {
          border: 1px solid #ece5de;
          border-radius: 28px;
          overflow: hidden;
        }

        .producer-calendar-shell .fc-col-header-cell {
          background: #fcfbfa;
          padding: 14px 0;
          font-size: 13px;
          font-weight: 900;
          color: #7b7285;
        }

        .producer-calendar-shell .fc-daygrid-day {
          min-height: 132px;
          background: #fff;
        }

        .producer-calendar-shell .fc-daygrid-day-frame {
          padding: 8px;
        }

        .producer-calendar-shell .fc-daygrid-day-number {
          width: 32px;
          height: 32px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: #1e1b2e;
          text-decoration: none;
        }

        .producer-calendar-shell .fc-day-today {
          background: #fbf7f1 !important;
        }

        .producer-calendar-shell .fc-day-today .fc-daygrid-day-number {
          background: #8b5cf6;
          color: white;
        }

        .producer-calendar-shell .fc-event {
          border-radius: 14px;
          padding: 4px 6px;
          border-width: 1px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: none;
        }

        .producer-calendar-shell .fc-event-title {
          font-weight: 900;
        }

        .producer-calendar-shell .fc-timegrid-slot {
          height: 44px;
        }
      `}</style>
    </div>
  );
}

/* ======================================================
   MODAL
====================================================== */

function CalendarItemModal({
  form,
  setForm,
  saving,
  onClose,
  onSave,
  onDelete,
}) {
  const typeMeta = getTypeMeta(form.type);
  const Icon = typeMeta.icon;

  return (
    <div
      dir="rtl"
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
    >
      <div
        className="
          w-full
          max-w-2xl
          rounded-[34px]
          border
          border-[#ECE5DE]
          bg-white
          shadow-[0_30px_90px_rgba(30,27,46,0.25)]
          overflow-hidden
        "
      >
        <div
          className="
            bg-gradient-to-br
            from-white
            via-[#FBF7F1]
            to-[#F4EDFF]
            border-b
            border-[#ECE5DE]
            p-6
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div className="flex items-center gap-4">
            <div
              className="
                h-14
                w-14
                rounded-3xl
                flex
                items-center
                justify-center
              "
              style={{
                backgroundColor: typeMeta.bg,
                color: typeMeta.text,
                border: `1px solid ${typeMeta.border}`,
              }}
            >
              <Icon size={22} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-[#1E1B2E]">
                {form._id ? "עריכת פריט ביומן" : "הוספת פריט ליומן"}
              </h3>

              <p className="text-sm text-gray-400 mt-1">
                אירוע / פגישה / תזכורת עם תאריך ושעה
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              h-11
              w-11
              rounded-2xl
              bg-white
              border
              border-[#E8DDD3]
              flex
              items-center
              justify-center
            "
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-black text-gray-400 mb-2">
                סוג פריט
              </div>

              <select
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="
                  w-full
                  rounded-2xl
                  border
                  border-[#E7E2DD]
                  bg-[#FCFBFA]
                  px-4
                  py-4
                  outline-none
                  text-sm
                  font-bold
                "
              >
                {ITEM_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-xs font-black text-gray-400 mb-2">
                כותרת
              </div>

              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="לדוגמה: פגישת ספקים / תזכורת תשלום"
                className="
                  w-full
                  rounded-2xl
                  border
                  border-[#E7E2DD]
                  bg-[#FCFBFA]
                  px-4
                  py-4
                  outline-none
                  text-sm
                  font-bold
                "
              />
            </label>

            <label className="block">
              <div className="text-xs font-black text-gray-400 mb-2">
                תאריך
              </div>

              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="
                  w-full
                  rounded-2xl
                  border
                  border-[#E7E2DD]
                  bg-[#FCFBFA]
                  px-4
                  py-4
                  outline-none
                  text-sm
                  font-bold
                "
              />
            </label>

            <label className="block">
              <div className="text-xs font-black text-gray-400 mb-2">
                שעה
              </div>

              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    time: e.target.value,
                  }))
                }
                className="
                  w-full
                  rounded-2xl
                  border
                  border-[#E7E2DD]
                  bg-[#FCFBFA]
                  px-4
                  py-4
                  outline-none
                  text-sm
                  font-bold
                "
              />
            </label>

            <label className="block md:col-span-2">
              <div className="text-xs font-black text-gray-400 mb-2">
                מיקום / לינק זום
              </div>

              <input
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                placeholder="כתובת, אולם, לינק זום או הערה לוגיסטית"
                className="
                  w-full
                  rounded-2xl
                  border
                  border-[#E7E2DD]
                  bg-[#FCFBFA]
                  px-4
                  py-4
                  outline-none
                  text-sm
                  font-bold
                "
              />
            </label>

            <label className="block md:col-span-2">
              <div className="text-xs font-black text-gray-400 mb-2">
                תיאור / הערות
              </div>

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="מה צריך לזכור? מי משתתף? מה צריך להכין?"
                rows={4}
                className="
                  w-full
                  rounded-2xl
                  border
                  border-[#E7E2DD]
                  bg-[#FCFBFA]
                  px-4
                  py-4
                  outline-none
                  text-sm
                  font-bold
                  resize-none
                "
              />
            </label>
          </div>

          <div
            className="
              flex
              flex-col
              sm:flex-row
              sm:items-center
              justify-between
              gap-3
              pt-4
              border-t
              border-[#F0ECE7]
            "
          >
            <div>
              {form._id && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={saving}
                  className="
                    rounded-2xl
                    border
                    border-red-100
                    bg-red-50
                    text-red-500
                    px-5
                    py-3
                    text-sm
                    font-black
                    flex
                    items-center
                    gap-2
                    disabled:opacity-50
                  "
                >
                  <Trash2 size={16} />
                  מחיקה
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
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
                  disabled:opacity-50
                "
              >
                ביטול
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="
                  rounded-2xl
                  bg-[#1E1B2E]
                  text-white
                  px-6
                  py-3
                  text-sm
                  font-black
                  flex
                  items-center
                  gap-2
                  disabled:opacity-50
                "
              >
                <Save size={16} />
                {saving ? "שומר..." : "שמירה"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}