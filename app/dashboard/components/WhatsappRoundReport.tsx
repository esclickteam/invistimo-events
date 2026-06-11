"use client";

import { useEffect, useMemo, useState } from "react";

type WhatsappReportItem = {
  id: string;
  guestName: string;
  phone: string;
  status: string;
  providerStatus: string;
  clientStatus: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  createdAt: string | null;
  attempts: number;
  maxAttempts: number;
  errorCode: string;
  failure: null | {
    code: string;
    text: string;
  };
  admin?: null | {
    wamid: string | null;
    idempotencyKey: string;
    lastError: string;
    errorMessage: string;
    failReason: any;
  };
};

type WhatsappRoundReportGroup = {
  key: string;
  title: string;
  type: string;
  round: number;
  templateName: string;
  summary: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    pending: number;
    sending: number;
    cancelled: number;
  };
  items: WhatsappReportItem[];
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string) {
  if (status === "נקרא") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "נמסר") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (status === "נשלח") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (status === "לא נמסר") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (status === "ממתין") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (status === "בתהליך") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }

  if (status === "בוטל") {
    return "bg-gray-100 text-gray-600 border-gray-200";
  }

  return "bg-gray-50 text-gray-700 border-gray-200";
}

function normalizeSearch(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export default function WhatsappRoundReport({
  invitationId,
  onClose,
}: {
  invitationId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rounds, setRounds] = useState<WhatsappRoundReportGroup[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);

        const res = await fetch(`/api/whatsapp/round-report/${invitationId}`, {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          setRounds([]);
          return;
        }

        const nextRounds = Array.isArray(data.rounds) ? data.rounds : [];

        setIsAdmin(Boolean(data.isAdmin));
        setRounds(nextRounds);
        setActiveKey(nextRounds[0]?.key || "");
      } finally {
        setLoading(false);
      }
    }

    if (invitationId) {
      loadReport();
    }
  }, [invitationId]);

  const activeRound = useMemo(() => {
    return rounds.find((round) => round.key === activeKey) || rounds[0] || null;
  }, [rounds, activeKey]);

  const filteredItems = useMemo(() => {
    if (!activeRound) return [];

    const q = normalizeSearch(search);
    const qDigits = onlyDigits(search);

    if (!q && !qDigits) {
      return activeRound.items;
    }

    return activeRound.items.filter((item) => {
      const name = normalizeSearch(item.guestName);
      const phone = onlyDigits(item.phone);

      const matchName = q ? name.includes(q) : false;
      const matchPhone = qDigits ? phone.includes(qDigits) : false;

      return matchName || matchPhone;
    });
  }, [activeRound, search]);

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-black/45
        p-2
        md:p-5
      "
      dir="rtl"
    >
      <div
        className="
          flex
          h-[94vh]
          w-[98vw]
          max-w-[1800px]
          flex-col
          overflow-hidden
          rounded-[30px]
          border
          border-[#E7DED1]
          bg-white
          shadow-2xl
        "
      >
        {/* HEADER */}
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            gap-4
            border-b
            border-[#EEE5D8]
            bg-gradient-to-l
            from-[#F8F3EA]
            via-white
            to-[#FBF7F0]
            px-5
            py-4
            md:px-7
          "
        >
          <div>
            <h2 className="text-xl font-black text-[#241A14] md:text-2xl">
              דוח שליחת WhatsApp לפי סבבים
            </h2>

            <p className="mt-1 text-sm font-semibold text-[#8A7A68]">
              פירוט למי נשלח, למי נכשל ומה הסיבה.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              rounded-full
              border
              border-[#E0D2BD]
              bg-white
              px-5
              py-2.5
              text-sm
              font-black
              text-[#6B451E]
              shadow-sm
              transition
              hover:bg-[#FFF8E6]
            "
          >
            סגור
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center text-sm font-bold text-[#8A7A68]">
            טוען דוח...
          </div>
        ) : rounds.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center text-sm font-bold text-[#8A7A68]">
            אין עדיין נתוני WhatsApp להצגה.
          </div>
        ) : (
          <div
            className="
              grid
              min-h-0
              flex-1
              grid-cols-1
              lg:grid-cols-[320px_minmax(0,1fr)]
            "
          >
            {/* SIDEBAR */}
            <aside
              className="
                min-h-0
                overflow-y-auto
                border-b
                border-[#EEE5D8]
                bg-[#FBF7F0]
                p-4
                lg:border-b-0
                lg:border-l
              "
            >
              <div className="mb-3 text-xs font-black text-[#8A7A68]">
                סבבים
              </div>

              <div className="space-y-2">
                {rounds.map((round) => (
                  <button
                    key={round.key}
                    type="button"
                    onClick={() => {
                      setActiveKey(round.key);
                      setSearch("");
                    }}
                    className={`
                      w-full
                      rounded-2xl
                      border
                      px-4
                      py-3
                      text-right
                      transition
                      ${
                        activeKey === round.key
                          ? "border-[#D9B46F] bg-white shadow-sm"
                          : "border-transparent bg-transparent hover:bg-white"
                      }
                    `}
                  >
                    <div className="font-black text-[#241A14]">
                      {round.title}
                    </div>

                    <div className="mt-1 text-xs font-bold text-[#8A7A68]">
                      סה״כ {round.summary.total} · נכשלו{" "}
                      {round.summary.failed}
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            {/* MAIN */}
            <main className="flex min-h-0 flex-col overflow-hidden p-4 md:p-5">
              {activeRound && (
                <>
                  {/* TOP */}
                  <div className="shrink-0">
                    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                      <div>
                        <h3 className="text-lg font-black text-[#241A14] md:text-xl">
                          {activeRound.title}
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-[#8A7A68]">
                          מוצגות {filteredItems.length} מתוך{" "}
                          {activeRound.items.length} רשומות
                        </p>
                      </div>

                      <div className="w-full xl:w-[420px]">
                        <label className="mb-1 block text-xs font-black text-[#8A7A68]">
                          חיפוש לפי שם או טלפון
                        </label>

                        <div className="relative">
                          <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="לדוגמה: גיא / 050 / 9725"
                            className="
                              w-full
                              rounded-2xl
                              border
                              border-[#E0D2BD]
                              bg-white
                              px-4
                              py-3
                              pr-10
                              text-sm
                              font-semibold
                              text-[#241A14]
                              outline-none
                              transition
                              placeholder:text-[#B5A692]
                              focus:border-[#D9B46F]
                              focus:ring-4
                              focus:ring-[#D9B46F]/15
                            "
                          />

                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A9916F]">
                            🔎
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <ReportStat
                        label="סה״כ"
                        value={activeRound.summary.total}
                      />
                      <ReportStat
                        label="נשלחו"
                        value={activeRound.summary.sent}
                      />
                      <ReportStat
                        label="נמסרו"
                        value={activeRound.summary.delivered}
                      />
                      <ReportStat
                        label="נקראו"
                        value={activeRound.summary.read}
                      />
                      <ReportStat
                        label="נכשלו"
                        value={activeRound.summary.failed}
                        danger
                      />
                      <ReportStat
                        label="ממתינים"
                        value={activeRound.summary.pending}
                      />
                    </div>
                  </div>

                  {/* TABLE */}
                  <div
                    className="
                      min-h-0
                      flex-1
                      overflow-auto
                      rounded-2xl
                      border
                      border-[#EEE5D8]
                      bg-white
                    "
                  >
                    <table className="w-full min-w-[1280px] table-fixed text-sm">
                      <colgroup>
                        <col className="w-[220px]" />
                        <col className="w-[170px]" />
                        <col className="w-[130px]" />
                        <col className="w-[420px]" />
                        <col className="w-[170px]" />
                        {isAdmin && <col className="w-[260px]" />}
                      </colgroup>

                      <thead className="sticky top-0 z-10 bg-[#F2EEE8]">
                        <tr>
                          <th className="p-4 text-right font-black text-[#5F564D]">
                            אורח
                          </th>
                          <th className="p-4 text-right font-black text-[#5F564D]">
                            טלפון
                          </th>
                          <th className="p-4 text-right font-black text-[#5F564D]">
                            סטטוס
                          </th>
                          <th className="p-4 text-right font-black text-[#5F564D]">
                            סיבה
                          </th>
                          <th className="p-4 text-right font-black text-[#5F564D]">
                            תאריך
                          </th>
                          {isAdmin && (
                            <th className="p-4 text-right font-black text-[#5F564D]">
                              פרטים טכניים
                            </th>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className="
                              border-t
                              border-[#F0ECE6]
                              align-top
                              transition
                              hover:bg-[#FBFAF7]
                            "
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="
                                    flex
                                    h-9
                                    w-9
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    border
                                    border-[#E7DED1]
                                    bg-gradient-to-br
                                    from-[#E9DDC8]
                                    to-[#F7F0E4]
                                    text-xs
                                    font-black
                                    text-[#8B6A2E]
                                  "
                                >
                                  {item.guestName?.trim()?.slice(0, 1) || "?"}
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate font-black text-[#241A14]">
                                    {item.guestName || "—"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 font-semibold text-[#5F564D]">
                              {item.phone || "—"}
                            </td>

                            <td className="p-4">
                              <span
                                className={`
                                  inline-flex
                                  rounded-full
                                  border
                                  px-3
                                  py-1.5
                                  text-xs
                                  font-black
                                  ${getStatusClass(item.clientStatus)}
                                `}
                              >
                                {item.clientStatus}
                              </span>
                            </td>

                            <td className="p-4 text-[#5F564D]">
                              <div className="max-w-[390px] whitespace-normal leading-6">
                                {item.failure?.text || "—"}
                              </div>
                            </td>

                            <td className="p-4 font-semibold text-[#5F564D]">
                              {formatDate(
                                item.sentAt || item.failedAt || item.createdAt
                              )}
                            </td>

                            {isAdmin && (
                              <td className="p-4">
                                <details className="group">
                                  <summary className="cursor-pointer font-black text-[#8B5E34] transition hover:text-[#6F4726]">
                                    הצג פרטים
                                  </summary>

                                  <div
                                    className="
                                      mt-2
                                      max-w-[240px]
                                      space-y-1
                                      rounded-xl
                                      bg-[#FBF7F0]
                                      p-3
                                      text-xs
                                      leading-5
                                      text-[#5F564D]
                                    "
                                  >
                                    <div>
                                      קוד:{" "}
                                      <span className="font-bold">
                                        {item.errorCode || "—"}
                                      </span>
                                    </div>

                                    <div>
                                      ניסיונות:{" "}
                                      <span className="font-bold">
                                        {item.attempts}/{item.maxAttempts}
                                      </span>
                                    </div>

                                    <div className="break-all">
                                      WAMID: {item.admin?.wamid || "—"}
                                    </div>

                                    <div className="break-all">
                                      Key: {item.admin?.idempotencyKey || "—"}
                                    </div>

                                    {(item.admin?.lastError ||
                                      item.admin?.errorMessage) && (
                                      <div className="break-words pt-1 text-rose-700">
                                        {item.admin?.lastError ||
                                          item.admin?.errorMessage}
                                      </div>
                                    )}
                                  </div>
                                </details>
                              </td>
                            )}
                          </tr>
                        ))}

                        {filteredItems.length === 0 && (
                          <tr>
                            <td
                              colSpan={isAdmin ? 6 : 5}
                              className="p-10 text-center text-sm font-bold text-[#8A7A68]"
                            >
                              לא נמצאו תוצאות לפי החיפוש.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`
        rounded-2xl
        border
        p-3
        shadow-sm
        ${
          danger
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-[#EEE5D8] bg-white text-[#241A14]"
        }
      `}
    >
      <div className="text-xs font-bold opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
