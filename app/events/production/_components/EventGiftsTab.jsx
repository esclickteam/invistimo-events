"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Gift,
  Plus,
  Trash2,
  Loader2,
  WalletCards,
  CreditCard,
  Banknote,
  ChevronDown,
  Check,
  FileSpreadsheet,
  Search,
} from "lucide-react";

const PAYMENT_OPTIONS = [
  { value: "", label: "בחר סוג תשלום" },
  { value: "cash", label: "מזומן" },
  { value: "bit", label: "ביט" },
  { value: "paybox", label: "פייבוקס" },
  { value: "checks", label: "צ'קים" },
  { value: "bank_transfer", label: "העברה בנקאית" },
  { value: "credit_gifts", label: "מתנות באשראי" },
  { value: "other", label: "אחר" },
];

const STATUS_OPTIONS = [
  { value: "", label: "לא חובה" },
  { value: "coming", label: "מגיע" },
  { value: "not_coming", label: "לא מגיע" },
  { value: "pending", label: "בהמתנה" },
  { value: "unknown", label: "לא ידוע" },
];

function formatMoney(value) {
  const num = Number(value || 0);

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(num);
}

function getPaymentLabel(value) {
  return (
    PAYMENT_OPTIONS.find((option) => option.value === value)?.label ||
    "בחר סוג תשלום"
  );
}

function getStatusLabel(value) {
  return (
    STATUS_OPTIONS.find((option) => option.value === value)?.label || "לא חובה"
  );
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emptyManualGift(eventId, invitationId) {
  return {
    _id: `new-${Date.now()}`,
    eventId,
    invitationId: invitationId || null,
    guestName: "",
    phone: "",
    relation: "",
    arrivalStatus: "",
    confirmedCount: "",
    giftAmount: "",
    paymentMethod: "",
    notes: "",
    isManual: true,
    isNew: true,
  };
}

/* ============================================================
   PaymentDropdown
   קטן, באותו עיצוב של השדות, נפתח למטה ולא נחתך
============================================================ */
function PaymentDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);

  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const selectedLabel = getPaymentLabel(value);

  const updatePosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();

    setCoords({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      width: rect.width,
    });
  };

  const toggleDropdown = () => {
    updatePosition();
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;

    const closeDropdown = (event) => {
      const target = event.target;

      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;

      setOpen(false);
    };

    document.addEventListener("mousedown", closeDropdown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", closeDropdown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="
          flex
          h-11
          w-full
          items-center
          justify-between
          gap-2
          rounded-2xl
          border
          border-[#E6D7C8]
          bg-white
          px-3
          text-sm
          font-bold
          text-[#2B2118]
          outline-none
          transition
          hover:border-[#D8B46A]
          focus:border-[#D8B46A]
        "
      >
        <span className="truncate">{selectedLabel}</span>

        <ChevronDown
          size={14}
          className={
            open
              ? "shrink-0 rotate-180 transition"
              : "shrink-0 transition"
          }
        />
      </button>

      {open && coords && (
        <div
          ref={menuRef}
          dir="rtl"
          style={{
            position: "fixed",
            top: coords.top,
            right: coords.right,
            width: coords.width,
            zIndex: 999999,
          }}
          className="
            max-h-[260px]
            overflow-y-auto
            rounded-2xl
            border
            border-[#E6D7C8]
            bg-white
            shadow-[0_12px_28px_rgba(43,33,24,0.14)]
          "
        >
          {PAYMENT_OPTIONS.map((option) => {
            const selected = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`
                  flex
                  h-10
                  w-full
                  items-center
                  justify-between
                  gap-2
                  px-3
                  text-right
                  text-sm
                  font-bold
                  transition
                  ${
                    selected
                      ? "bg-[#2B2118] text-white"
                      : "bg-white text-[#2B2118] hover:bg-[#F8F3ED]"
                  }
                `}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function EventGiftsTab({ eventId, invitationId }) {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [savingRows, setSavingRows] = useState({});
  const [savedRows, setSavedRows] = useState({});

  const saveTimersRef = useRef({});
  const canLoad = Boolean(eventId);

  const loadGifts = async () => {
    if (!canLoad) return;

    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();

      query.set("eventId", eventId);

      if (invitationId) {
        query.set("invitationId", invitationId);
      }

      const res = await fetch(`/api/event-gifts?${query.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "שגיאה בטעינת מתנות");
      }

      setGifts(data.gifts || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "שגיאה בטעינת מתנות");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGifts();

    return () => {
      Object.values(saveTimersRef.current || {}).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, [eventId, invitationId]);

  const localSummary = useMemo(() => {
    const totalGifts = gifts.reduce((sum, gift) => {
      return sum + Number(gift.giftAmount || 0);
    }, 0);

    const rowsWithGift = gifts.filter(
      (gift) => Number(gift.giftAmount || 0) > 0
    ).length;

    const rowsWithoutGift = gifts.length - rowsWithGift;

    return {
      totalGifts,
      rowsWithGift,
      rowsWithoutGift,
      totalRows: gifts.length,
    };
  }, [gifts]);

  const filteredGifts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return gifts;

    return gifts.filter((gift) => {
      const name = String(gift.guestName || "").toLowerCase();
      const phone = String(gift.phone || "").toLowerCase();

      return name.includes(q) || phone.includes(q);
    });
  }, [gifts, searchTerm]);

  const buildPayload = (gift) => {
    return {
      giftId: gift._id,
      eventId,
      invitationId,
      guestName: gift.guestName || "",
      phone: gift.phone || "",
      relation: gift.relation || "",
      arrivalStatus: gift.arrivalStatus || "",
      confirmedCount: gift.confirmedCount ?? "",
      giftAmount: gift.giftAmount ?? 0,
      paymentMethod: gift.paymentMethod || "",
      notes: gift.notes || "",
    };
  };

  const saveGiftNow = async (gift) => {
    const isNew = Boolean(gift.isNew);

    if (isNew && !String(gift.guestName || "").trim()) {
      return;
    }

    const rowId = gift._id;

    setSavingRows((prev) => ({
      ...prev,
      [rowId]: true,
    }));

    setSavedRows((prev) => ({
      ...prev,
      [rowId]: false,
    }));

    setError("");

    try {
      const res = await fetch("/api/event-gifts", {
        method: isNew ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(gift)),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "שגיאה בשמירה אוטומטית");
      }

      if (isNew && data.gift?._id) {
        setGifts((prev) =>
          prev.map((item) =>
            item._id === rowId
              ? {
                  ...data.gift,
                  isNew: false,
                }
              : item
          )
        );

        setSavingRows((prev) => {
          const next = { ...prev };
          delete next[rowId];
          next[data.gift._id] = false;
          return next;
        });

        setSavedRows((prev) => {
          const next = { ...prev };
          delete next[rowId];
          next[data.gift._id] = true;
          return next;
        });

        setTimeout(() => {
          setSavedRows((prev) => ({
            ...prev,
            [data.gift._id]: false,
          }));
        }, 1500);

        return;
      }

      if (data.gift?._id) {
        setGifts((prev) =>
          prev.map((item) =>
            item._id === data.gift._id
              ? {
                  ...item,
                  ...data.gift,
                  isNew: false,
                }
              : item
          )
        );
      }

      setSavedRows((prev) => ({
        ...prev,
        [rowId]: true,
      }));

      setTimeout(() => {
        setSavedRows((prev) => ({
          ...prev,
          [rowId]: false,
        }));
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || "שגיאה בשמירה אוטומטית");
    } finally {
      setSavingRows((prev) => ({
        ...prev,
        [rowId]: false,
      }));
    }
  };

  const scheduleAutoSave = (gift) => {
    const rowId = gift._id;

    if (saveTimersRef.current[rowId]) {
      clearTimeout(saveTimersRef.current[rowId]);
    }

    saveTimersRef.current[rowId] = setTimeout(() => {
      saveGiftNow(gift);
    }, 650);
  };

  const updateGiftField = (giftId, field, value) => {
    let nextGift = null;

    setGifts((prev) =>
      prev.map((gift) => {
        if (gift._id !== giftId) return gift;

        nextGift = {
          ...gift,
          [field]: value,
        };

        return nextGift;
      })
    );

    if (nextGift) {
      scheduleAutoSave(nextGift);
    }
  };

  const addManualRow = () => {
    setGifts((prev) => [emptyManualGift(eventId, invitationId), ...prev]);
  };

  const deleteGift = async (gift) => {
    if (gift.isNew) {
      if (saveTimersRef.current[gift._id]) {
        clearTimeout(saveTimersRef.current[gift._id]);
      }

      setGifts((prev) => prev.filter((item) => item._id !== gift._id));
      return;
    }

    const ok = window.confirm("למחוק את הרשומה מרשימת המתנות?");
    if (!ok) return;

    setDeletingId(gift._id);
    setError("");

    try {
      const res = await fetch(`/api/event-gifts?giftId=${gift._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "שגיאה במחיקה");
      }

      setGifts((prev) => prev.filter((item) => item._id !== gift._id));
    } catch (err) {
      console.error(err);
      setError(err.message || "שגיאה במחיקה");
    } finally {
      setDeletingId("");
    }
  };

  const exportToExcel = () => {
    const headers = [
      "שם",
      "טלפון",
      "סטטוס",
      "כמות מגיעים",
      "סכום מתנה",
      "סוג תשלום",
      "הערות",
    ];

    const rows = gifts.map((gift) => [
      gift.guestName || "",
      gift.phone || "",
      getStatusLabel(gift.arrivalStatus || ""),
      gift.confirmedCount ?? "",
      Number(gift.giftAmount || 0),
      getPaymentLabel(gift.paymentMethod || ""),
      gift.notes || "",
    ]);

    const summaryRows = [
      [],
      ["סה״כ מתנות", "", "", "", localSummary.totalGifts, "", ""],
      ["סה״כ רשומות", "", "", "", localSummary.totalRows, "", ""],
      ["רשומות עם סכום מתנה", "", "", "", localSummary.rowsWithGift, "", ""],
      ["רשומות ללא סכום מתנה", "", "", "", localSummary.rowsWithoutGift, "", ""],
    ];

    const tableRows = [headers, ...rows, ...summaryRows]
      .map((row) => {
        return `
          <tr>
            ${headers
              .map((_, index) => {
                const value = row[index] ?? "";
                return `<td>${escapeHtml(value)}</td>`;
              })
              .join("")}
          </tr>
        `;
      })
      .join("");

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              direction: rtl;
              font-family: Arial, sans-serif;
            }

            table {
              border-collapse: collapse;
              width: 100%;
            }

            th, td {
              border: 1px solid #d9c8b8;
              padding: 10px;
              text-align: right;
              font-size: 14px;
            }

            tr:first-child td {
              background: #f8f3ed;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <table>
            ${tableRows}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `מתנות-מהאירוע-${date}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (!eventId) {
    return (
      <section
        dir="rtl"
        className="rounded-[28px] border border-[#E8DDD3] bg-white p-8 text-center"
      >
        <p className="text-sm font-black text-[#7A6A5E]">
          חסר eventId להצגת מתנות.
        </p>
      </section>
    );
  }

  return (
    <section dir="rtl" className="space-y-6">
      <div className="rounded-[30px] border border-[#E6D7C8] bg-gradient-to-br from-[#FFFDF9] via-[#FBF6EF] to-[#F5E7DC] p-6 shadow-[0_18px_50px_rgba(86,60,34,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D8B46A]/50 bg-white/60 px-4 py-2 text-xs font-black text-[#7A5428]">
              <Gift size={15} />
              מתנות מהאירוע
            </div>

            <h2 className="text-2xl font-black text-[#2B2118]">
              ניהול מתנות מהאירוע
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#7A6A5E]">
              אם קיימים אישורי הגעה — הרשימה נטענת אוטומטית. אפשר להוסיף
              ידנית, לעדכן סכומים, לבחור סוג תשלום, להוסיף הערות או למחוק
              אנשים מהרשימה.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={exportToExcel}
              disabled={gifts.length === 0}
              className="
                inline-flex
                h-12
                items-center
                justify-center
                gap-2
                rounded-2xl
                border
                border-[#D8B46A]/60
                bg-white/70
                px-5
                text-sm
                font-black
                text-[#2B2118]
                shadow-[0_12px_30px_rgba(43,33,24,0.08)]
                transition
                hover:bg-white
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <FileSpreadsheet size={17} />
              ייצוא לאקסל
            </button>

            <button
              type="button"
              onClick={addManualRow}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2B2118] px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(43,33,24,0.18)] transition hover:scale-[1.01] hover:bg-[#3A2A1E]"
            >
              <Plus size={17} />
              הוספה ידנית
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[#E8DDD3] bg-white/75 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5E7DC] text-[#7A4A35]">
                <WalletCards size={19} />
              </span>
              <div>
                <p className="text-xs font-black text-[#8A7A6D]">סה״כ מתנות</p>
                <p className="text-xl font-black text-[#2B2118]">
                  {formatMoney(localSummary.totalGifts)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDD3] bg-white/75 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5E7DC] text-[#7A4A35]">
                <Banknote size={19} />
              </span>
              <div>
                <p className="text-xs font-black text-[#8A7A6D]">רשומות</p>
                <p className="text-xl font-black text-[#2B2118]">
                  {localSummary.totalRows}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDD3] bg-white/75 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5E7DC] text-[#7A4A35]">
                <CreditCard size={19} />
              </span>
              <div>
                <p className="text-xs font-black text-[#8A7A6D]">
                  עם סכום מתנה
                </p>
                <p className="text-xl font-black text-[#2B2118]">
                  {localSummary.rowsWithGift}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E8DDD3] bg-white/75 p-5">
            <div>
              <p className="text-xs font-black text-[#8A7A6D]">
                ללא סכום מתנה
              </p>
              <p className="text-xl font-black text-[#2B2118]">
                {localSummary.rowsWithoutGift}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#E8DDD3] bg-white/80 p-4 shadow-[0_12px_35px_rgba(86,60,34,0.05)]">
        <div className="relative">
          <Search
            size={17}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A99483]"
          />

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון..."
            className="
              h-12
              w-full
              rounded-2xl
              border
              border-[#E6D7C8]
              bg-white
              pr-11
              pl-4
              text-sm
              font-bold
              text-[#2B2118]
              outline-none
              transition
              placeholder:text-[#B7A99C]
              focus:border-[#D8B46A]
            "
          />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-visible rounded-[28px] border border-[#E8DDD3] bg-white shadow-[0_18px_50px_rgba(86,60,34,0.07)]">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-3 text-sm font-black text-[#7A6A5E]">
            <Loader2 className="animate-spin" size={18} />
            טוען מתנות...
          </div>
        ) : filteredGifts.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <Gift className="mb-4 text-[#D8B46A]" size={34} />

            <h3 className="text-lg font-black text-[#2B2118]">
              {searchTerm ? "לא נמצאו תוצאות לחיפוש" : "עדיין אין רשומות מתנה"}
            </h3>

            <p className="mt-2 text-sm font-medium text-[#7A6A5E]">
              {searchTerm
                ? "נסי לחפש לפי שם אחר או לפי מספר טלפון."
                : "אפשר להוסיף ידנית, ואם קיימים אישורי הגעה הרשימה תיטען אוטומטית."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-32">
            <table className="min-w-[1150px] w-full text-right">
              <thead className="bg-[#F8F3ED] text-xs font-black text-[#6F5D50]">
                <tr>
                  <th className="px-4 py-4">שם</th>
                  <th className="px-4 py-4">טלפון</th>
                  <th className="px-4 py-4">סטטוס</th>
                  <th className="px-4 py-4">כמות מגיעים</th>
                  <th className="px-4 py-4">סכום מתנה</th>
                  <th className="px-4 py-4">סוג תשלום</th>
                  <th className="px-4 py-4">הערות</th>
                  <th className="px-4 py-4">פעולות</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EFE5DC]">
                {filteredGifts.map((gift) => {
                  const isSaving = Boolean(savingRows[gift._id]);
                  const isSaved = Boolean(savedRows[gift._id]);

                  return (
                    <tr key={gift._id} className="transition hover:bg-[#FFFCF8]">
                      <td className="px-4 py-4">
                        <input
                          value={gift.guestName || ""}
                          onChange={(e) =>
                            updateGiftField(
                              gift._id,
                              "guestName",
                              e.target.value
                            )
                          }
                          className="h-11 w-full rounded-2xl border border-[#E6D7C8] bg-white px-3 text-sm font-bold text-[#2B2118] outline-none focus:border-[#D8B46A]"
                          placeholder="שם"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          value={gift.phone || ""}
                          onChange={(e) =>
                            updateGiftField(gift._id, "phone", e.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-[#E6D7C8] bg-white px-3 text-sm font-bold text-[#2B2118] outline-none focus:border-[#D8B46A]"
                          placeholder="טלפון"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={gift.arrivalStatus || ""}
                          onChange={(e) =>
                            updateGiftField(
                              gift._id,
                              "arrivalStatus",
                              e.target.value
                            )
                          }
                          className="h-11 w-full rounded-2xl border border-[#E6D7C8] bg-white px-3 text-sm font-bold text-[#2B2118] outline-none focus:border-[#D8B46A]"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          value={gift.confirmedCount ?? ""}
                          onChange={(e) =>
                            updateGiftField(
                              gift._id,
                              "confirmedCount",
                              e.target.value
                            )
                          }
                          className="h-11 w-full rounded-2xl border border-[#E6D7C8] bg-white px-3 text-sm font-bold text-[#2B2118] outline-none focus:border-[#D8B46A]"
                          placeholder="לא חובה"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          value={gift.giftAmount ?? ""}
                          onChange={(e) =>
                            updateGiftField(
                              gift._id,
                              "giftAmount",
                              e.target.value
                            )
                          }
                          className="h-11 w-full rounded-2xl border border-[#E6D7C8] bg-white px-3 text-sm font-bold text-[#2B2118] outline-none focus:border-[#D8B46A]"
                          placeholder="₪"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <PaymentDropdown
                          value={gift.paymentMethod || ""}
                          onChange={(value) =>
                            updateGiftField(gift._id, "paymentMethod", value)
                          }
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          value={gift.notes || ""}
                          onChange={(e) =>
                            updateGiftField(gift._id, "notes", e.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-[#E6D7C8] bg-white px-3 text-sm font-bold text-[#2B2118] outline-none focus:border-[#D8B46A]"
                          placeholder="הערות"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => deleteGift(gift)}
                            disabled={deletingId === gift._id}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === gift._id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>

                          <span className="min-w-[58px] text-xs font-black text-[#8A7A6D]">
                            {isSaving ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="animate-spin" size={12} />
                                שומר
                              </span>
                            ) : isSaved ? (
                              "נשמר"
                            ) : (
                              ""
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}