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
  if (status === "נקרא") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "נמסר") return "bg-green-50 text-green-700 border-green-200";
  if (status === "נשלח") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "לא נמסר") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "ממתין") return "bg-amber-50 text-amber-700 border-amber-200";

  return "bg-gray-50 text-gray-700 border-gray-200";
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

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      dir="rtl"
    >
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-[#E7DED1] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EEE5D8] bg-[#F8F3EA] px-6 py-4">
          <div>
            <h2 className="text-xl font-black text-[#241A14]">
              דוח שליחת WhatsApp לפי סבבים
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#8A7A68]">
              פירוט למי נשלח, למי נכשל ומה הסיבה.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E0D2BD] bg-white px-5 py-2 text-sm font-black text-[#6B451E] hover:bg-[#FFF8E6]"
          >
            סגור
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-bold text-[#8A7A68]">
            טוען דוח...
          </div>
        ) : rounds.length === 0 ? (
          <div className="p-10 text-center text-sm font-bold text-[#8A7A68]">
            אין עדיין נתוני WhatsApp להצגה.
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)]">
            <aside className="border-b border-[#EEE5D8] bg-[#FBF7F0] p-4 lg:border-b-0 lg:border-l">
              <div className="space-y-2">
                {rounds.map((round) => (
                  <button
                    key={round.key}
                    type="button"
                    onClick={() => setActiveKey(round.key)}
                    className={`
                      w-full rounded-2xl border px-4 py-3 text-right transition
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
                      סה״כ {round.summary.total} · נכשלו {round.summary.failed}
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <main className="min-h-0 overflow-auto p-5">
              {activeRound && (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-black text-[#241A14]">
                      {activeRound.title}
                    </h3>

                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
                      <ReportStat label="סה״כ" value={activeRound.summary.total} />
                      <ReportStat label="נשלחו" value={activeRound.summary.sent} />
                      <ReportStat label="נמסרו" value={activeRound.summary.delivered} />
                      <ReportStat label="נקראו" value={activeRound.summary.read} />
                      <ReportStat label="נכשלו" value={activeRound.summary.failed} danger />
                      <ReportStat label="ממתינים" value={activeRound.summary.pending} />
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#EEE5D8]">
                    <table className="min-w-[980px] w-full text-sm">
                      <thead className="bg-[#F2EEE8]">
                        <tr>
                          <th className="p-3 text-right font-black text-[#5F564D]">אורח</th>
                          <th className="p-3 text-right font-black text-[#5F564D]">טלפון</th>
                          <th className="p-3 text-right font-black text-[#5F564D]">סטטוס</th>
                          <th className="p-3 text-right font-black text-[#5F564D]">סיבה</th>
                          <th className="p-3 text-right font-black text-[#5F564D]">נשלח</th>
                          {isAdmin && (
                            <th className="p-3 text-right font-black text-[#5F564D]">טכני</th>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {activeRound.items.map((item) => (
                          <tr key={item.id} className="border-t border-[#F0ECE6] align-top">
                            <td className="p-3 font-bold text-[#241A14]">
                              {item.guestName || "—"}
                            </td>

                            <td className="p-3 text-[#5F564D]">
                              {item.phone || "—"}
                            </td>

                            <td className="p-3">
                              <span
                                className={`
                                  inline-flex rounded-full border px-3 py-1 text-xs font-black
                                  ${getStatusClass(item.clientStatus)}
                                `}
                              >
                                {item.clientStatus}
                              </span>
                            </td>

                            <td className="max-w-md p-3 text-[#5F564D]">
                              {item.failure?.text || "—"}
                            </td>

                            <td className="p-3 text-[#5F564D]">
                              {formatDate(item.sentAt || item.failedAt || item.createdAt)}
                            </td>

                            {isAdmin && (
                              <td className="p-3">
                                <details>
                                  <summary className="cursor-pointer font-bold text-[#8B5E34]">
                                    פרטים
                                  </summary>

                                  <div className="mt-2 max-w-md space-y-1 rounded-xl bg-[#FBF7F0] p-3 text-xs text-[#5F564D]">
                                    <div>קוד: {item.errorCode || "—"}</div>
                                    <div>ניסיונות: {item.attempts}/{item.maxAttempts}</div>
                                    <div className="break-all">
                                      WAMID: {item.admin?.wamid || "—"}
                                    </div>
                                    <div className="break-all">
                                      Key: {item.admin?.idempotencyKey || "—"}
                                    </div>
                                    <div>{item.admin?.lastError || item.admin?.errorMessage || ""}</div>
                                  </div>
                                </details>
                              </td>
                            )}
                          </tr>
                        ))}
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
        rounded-2xl border p-3 shadow-sm
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