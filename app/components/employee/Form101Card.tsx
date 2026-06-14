"use client";

import { useEffect, useMemo, useState } from "react";

type EmployeeDocumentStatus = "missing" | "uploaded" | "approved" | "rejected";
type EmployeeDocumentType = "form101" | "idCard";

type EmployeeAgreementStatus = "missing" | "signed" | "approved" | "rejected";

type EmployeeDocument = {
  _id: string;
  id?: string;
  documentType?: EmployeeDocumentType;
  originalFileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  taxYear: number;
  status: EmployeeDocumentStatus;
  rejectionReason?: string;
  uploadedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type EmployeeAgreement = {
  _id?: string;
  id?: string;
  employeeId?: string;
  businessId?: string;
  fullName?: string;
  idNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  startDate?: string | null;

  signedFileUrl?: string;
  fileUrl?: string;
  pdfUrl?: string;
  signedPdfUrl?: string;

  status?: EmployeeAgreementStatus;
  signedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Form101CardProps = {
  employeeId: string;
  businessId: string;
};

function statusLabel(status: EmployeeDocumentStatus) {
  switch (status) {
    case "uploaded":
      return "הועלה וממתין לבדיקה";
    case "approved":
      return "מאושר";
    case "rejected":
      return "נדחה — אפשר להעלות מחדש";
    default:
      return "לא הועלה";
  }
}

function agreementStatusLabel(status?: EmployeeAgreementStatus) {
  switch (status) {
    case "approved":
      return "מאושר";
    case "signed":
      return "נחתם וממתין לבדיקה";
    case "rejected":
      return "הסכם נדחה — ניתן לחתום מחדש";
    default:
      return "לא נחתם";
  }
}

function statusClass(status: EmployeeDocumentStatus) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "uploaded":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function agreementStatusClass(status?: EmployeeAgreementStatus) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "signed":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatFileSize(size?: number) {
  if (!size) return "";

  const mb = size / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)}MB`;
  }

  return `${Math.round(size / 1024)}KB`;
}

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDocumentFromResponse(data: any, documentType: EmployeeDocumentType) {
  if (!data) return null;

  if (data.document) return data.document;

  if (documentType === "form101") {
    return data.form101 || null;
  }

  if (documentType === "idCard") {
    return data.idCard || null;
  }

  return null;
}

function getAgreementFileUrl(agreement: EmployeeAgreement | null) {
  return (
    agreement?.signedFileUrl ||
    agreement?.fileUrl ||
    agreement?.pdfUrl ||
    agreement?.signedPdfUrl ||
    ""
  );
}

function normalizeAgreementFromResponse(data: any): EmployeeAgreement | null {
  if (!data) return null;

  const rawAgreement = data.agreement || data.employeeAgreement || null;

  if (!rawAgreement) return null;

  const signedFileUrl =
    rawAgreement.signedFileUrl ||
    rawAgreement.fileUrl ||
    rawAgreement.pdfUrl ||
    rawAgreement.signedPdfUrl ||
    "";

  const rawStatus = String(rawAgreement.status || "").toLowerCase();

  let normalizedStatus: EmployeeAgreementStatus = "missing";

  if (rawStatus === "rejected") {
    normalizedStatus = "rejected";
  } else if (rawStatus === "approved" || rawAgreement.approvedAt) {
    normalizedStatus = "approved";
  } else if (
    rawStatus === "signed" ||
    signedFileUrl ||
    rawAgreement.signedAt
  ) {
    normalizedStatus = "signed";
  }

  return {
    ...rawAgreement,
    signedFileUrl,
    fileUrl: signedFileUrl,
    status: normalizedStatus,
    signedAt: rawAgreement.signedAt || null,
    approvedAt: rawAgreement.approvedAt || null,
    rejectedAt: rawAgreement.rejectedAt || null,
    rejectionReason: rawAgreement.rejectionReason || "",
  };
}

function getMainStatus(
  form101: EmployeeDocument | null,
  idCard: EmployeeDocument | null
): EmployeeDocumentStatus {
  if (!form101 && !idCard) return "missing";

  if (form101?.status === "rejected" || idCard?.status === "rejected") {
    return "rejected";
  }

  if (form101?.status === "approved" && idCard?.status === "approved") {
    return "approved";
  }

  return "uploaded";
}

function isDocumentLocked(document: EmployeeDocument | null) {
  if (!document) return false;

  return document.status === "uploaded" || document.status === "approved";
}

function lockedMessage(label: string, status?: EmployeeDocumentStatus) {
  if (status === "approved") {
    return `${label} כבר אושר וננעל. לא ניתן להעלות קובץ חדש אלא אם האדמין יפתח מחדש.`;
  }

  return `${label} כבר הועלה וננעל לבדיקה. ניתן להעלות מחדש רק לאחר פתיחה על ידי האדמין.`;
}

export default function Form101Card({
  employeeId,
  businessId,
}: Form101CardProps) {
  const [open, setOpen] = useState(false);

  const [form101File, setForm101File] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  const [currentForm101, setCurrentForm101] = useState<EmployeeDocument | null>(
    null
  );
  const [currentIdCard, setCurrentIdCard] = useState<EmployeeDocument | null>(
    null
  );

  const [agreement, setAgreement] = useState<EmployeeAgreement | null>(null);
  const [loadingAgreement, setLoadingAgreement] = useState(true);

  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] =
    useState<EmployeeDocumentType | null>(null);
  const [error, setError] = useState("");

  const isForm101Locked = isDocumentLocked(currentForm101);
  const isIdCardLocked = isDocumentLocked(currentIdCard);

  const signAgreementUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (employeeId) {
      params.set("employeeId", employeeId);
    }

    if (businessId) {
      params.set("businessId", businessId);
    }

    const query = params.toString();

    return query
      ? `/employee/agreement/sign?${query}`
      : "/employee/agreement/sign";
  }, [employeeId, businessId]);

  async function loadDocument(documentType: EmployeeDocumentType) {
    const params = new URLSearchParams({
      employeeId,
      businessId,
      documentType,
    });

    const res = await fetch(`/api/forms/101/current?${params.toString()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || "שגיאה בטעינת המסמך");
    }

    return getDocumentFromResponse(data, documentType) as EmployeeDocument | null;
  }

  async function loadAgreement() {
    try {
      setLoadingAgreement(true);

      if (!employeeId) {
        setAgreement(null);
        return;
      }

      const params = new URLSearchParams();
      params.set("employeeId", employeeId);

      if (businessId) {
        params.set("businessId", businessId);
      }

      const res = await fetch(
        `/api/employee-agreements/current?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "שגיאה בטעינת הסכם העבודה");
      }

      setAgreement(normalizeAgreementFromResponse(data));
    } catch (err) {
      console.error("LOAD EMPLOYEE AGREEMENT FAILED:", err);
      setAgreement(null);
    } finally {
      setLoadingAgreement(false);
    }
  }

  async function loadCurrentDocuments() {
    try {
      setError("");
      setLoading(true);

      if (!employeeId || !businessId) {
        setCurrentForm101(null);
        setCurrentIdCard(null);
        return;
      }

      const [form101, idCard] = await Promise.all([
        loadDocument("form101").catch((err) => {
          console.error("LOAD FORM 101 FAILED:", err);
          return null;
        }),
        loadDocument("idCard").catch((err) => {
          console.error("LOAD ID CARD FAILED:", err);
          return null;
        }),
      ]);

      setCurrentForm101(form101);
      setCurrentIdCard(idCard);
    } catch (err) {
      console.error("LOAD EMPLOYEE DOCUMENTS FAILED:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת מסמכים");
      setCurrentForm101(null);
      setCurrentIdCard(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadCurrentDocuments(), loadAgreement()]);
  }

  async function uploadDocument(documentType: EmployeeDocumentType) {
    try {
      const selectedFile = documentType === "form101" ? form101File : idCardFile;
      const currentDocument =
        documentType === "form101" ? currentForm101 : currentIdCard;
      const isLocked = isDocumentLocked(currentDocument);
      const label = documentType === "form101" ? "טופס 101" : "תעודת זהות";

      if (isLocked) {
        setError(lockedMessage(label, currentDocument?.status));
        return;
      }

      if (!selectedFile) {
        alert("בחרי קובץ קודם");
        return;
      }

      if (!employeeId || !businessId) {
        setError("חסר מזהה עובד או עסק");
        return;
      }

      setError("");
      setUploadingType(documentType);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("employeeId", employeeId);
      formData.append("businessId", businessId);
      formData.append("documentType", documentType);

      const res = await fetch("/api/forms/101/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (res.status === 423) {
        throw new Error(
          data?.error ||
            `${label} כבר הועלה וננעל. ניתן להעלות מחדש רק לאחר פתיחה על ידי האדמין.`
        );
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בהעלאת המסמך");
      }

      const uploadedDocument = getDocumentFromResponse(data, documentType);

      if (documentType === "form101") {
        setForm101File(null);
        setCurrentForm101(uploadedDocument);
        alert("טופס 101 הועלה בהצלחה");
      } else {
        setIdCardFile(null);
        setCurrentIdCard(uploadedDocument);
        alert("תעודת זהות הועלתה בהצלחה");
      }

      await loadCurrentDocuments();
    } catch (err) {
      console.error("UPLOAD EMPLOYEE DOCUMENT FAILED:", err);
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת המסמך");
    } finally {
      setUploadingType(null);
    }
  }

  useEffect(() => {
    if (employeeId) {
      void loadAgreement();
    }

    if (employeeId && businessId) {
      void loadCurrentDocuments();
    }
  }, [employeeId, businessId]);

  const mainStatus = getMainStatus(currentForm101, currentIdCard);

  const agreementFileUrl = getAgreementFileUrl(agreement);
  const agreementStatus: EmployeeAgreementStatus =
    agreement?.status || "missing";

  const isAgreementFinal =
    agreementStatus === "approved" ||
    agreementStatus === "signed" ||
    Boolean(agreementFileUrl) ||
    Boolean(agreement?.signedAt) ||
    Boolean(agreement?.approvedAt);

  const canSignAgreement =
    agreementStatus === "rejected" || !isAgreementFinal;

  return (
    <>
      <section
        dir="rtl"
        className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">מסמכי עובד</h2>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              טופס 101 ותעודת זהות נשמרים במערכת וממתינים לבדיקה.
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${statusClass(
              mainStatus
            )}`}
          >
            {statusLabel(mainStatus)}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">טופס 101</p>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              {currentForm101
                ? `הועלה: ${currentForm101.originalFileName}`
                : "עדיין לא הועלה טופס 101."}
            </p>

            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                currentForm101?.status || "missing"
              )}`}
            >
              {statusLabel(currentForm101?.status || "missing")}
            </span>
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">תעודת זהות</p>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              {currentIdCard
                ? `הועלתה: ${currentIdCard.originalFileName}`
                : "עדיין לא הועלתה תעודת זהות."}
            </p>

            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                currentIdCard?.status || "missing"
              )}`}
            >
              {statusLabel(currentIdCard?.status || "missing")}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-11 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-black"
          >
            ניהול מסמכים
          </button>

          <button
            type="button"
            onClick={refreshAll}
            disabled={loading || loadingAgreement}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading || loadingAgreement ? "טוען..." : "רענון סטטוס"}
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
            {error}
          </div>
        )}
      </section>

      {open && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/55 px-4 py-6"
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  מסמכי עובד
                </div>

                <h2 className="text-2xl font-black text-slate-950">
                  ניהול טופס 101, תעודת זהות והסכם עבודה
                </h2>

                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                  יש להוריד את טופס 101, למלא ולחתום, ואז להעלות אותו יחד עם
                  צילום תעודת זהות. בנוסף ניתן לחתום על הסכם העבודה באתר.
                  ניתן להעלות קובץ PDF, JPG או PNG.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl font-black text-slate-500 transition hover:bg-slate-50"
                aria-label="סגירה"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-[28px] border border-violet-200 bg-violet-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    הסכם עבודה
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                    העובד/ת ממלא/ת את השדות לפי הסדר, חותם/ת, ובסיום נוצר PDF
                    חתום שנשמר במערכת.
                  </p>

                  <span
                    className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-black ${agreementStatusClass(
                      agreementStatus
                    )}`}
                  >
                    {loadingAgreement
                      ? "טוען סטטוס..."
                      : agreementStatusLabel(agreementStatus)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {canSignAgreement ? (
                    <a
                      href={signAgreementUrl}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-6 text-sm font-black text-white transition hover:bg-violet-700"
                    >
                      חתימה על ההסכם
                    </a>
                  ) : agreementFileUrl ? (
                    <a
                      href={agreementFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-6 text-sm font-black text-white transition hover:bg-violet-700"
                    >
                      צפייה בהסכם חתום
                    </a>
                  ) : null}

                  <a
                    href="/templates/employee-agreement-invistimo.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-violet-200 bg-white px-5 text-sm font-black text-violet-700 transition hover:bg-violet-50"
                  >
                    צפייה בתבנית ריקה
                  </a>
                </div>
              </div>

              {agreementFileUrl && (
                <div className="mt-5 rounded-3xl border border-violet-100 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">
                    ההסכם החתום האחרון
                  </p>

                  <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                    {agreement?.fullName && (
                      <span>
                        שם:{" "}
                        <b className="text-slate-950">
                          {agreement.fullName}
                        </b>
                      </span>
                    )}

                    {agreement?.idNumber && (
                      <span>
                        ת.ז:{" "}
                        <b className="text-slate-950">
                          {agreement.idNumber}
                        </b>
                      </span>
                    )}

                    {agreement?.signedAt && (
                      <span>
                        תאריך חתימה:{" "}
                        <b className="text-slate-950">
                          {formatDate(agreement.signedAt)}
                        </b>
                      </span>
                    )}

                    {agreement?.approvedAt && (
                      <span>
                        תאריך אישור:{" "}
                        <b className="text-slate-950">
                          {formatDate(agreement.approvedAt)}
                        </b>
                      </span>
                    )}
                  </div>

                  <a
                    href={agreementFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    צפייה בהסכם חתום
                  </a>
                </div>
              )}

              {agreement?.status === "rejected" && agreement.rejectionReason && (
                <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                  ההסכם נדחה. סיבה: {agreement.rejectionReason}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      טופס 101
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      הורידו טופס ריק, מלאו אותו, חתמו והעלו לכאן.
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                      currentForm101?.status || "missing"
                    )}`}
                  >
                    {statusLabel(currentForm101?.status || "missing")}
                  </span>
                </div>

                <a
                  href="/api/forms/101/download"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black"
                >
                  הורדת טופס 101
                </a>

                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">
                    העלאת טופס חתום
                  </p>

                  {isForm101Locked ? (
                    <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-700">
                      {lockedMessage("טופס 101", currentForm101?.status)}
                    </div>
                  ) : (
                    <>
                      {currentForm101?.status === "rejected" && (
                        <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
                          הטופס נדחה על ידי האדמין. ניתן להעלות טופס מתוקן.
                          {currentForm101.rejectionReason && (
                            <div className="mt-2">
                              סיבה: {currentForm101.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg"
                        disabled={uploadingType === "form101"}
                        onChange={(event) => {
                          setForm101File(event.target.files?.[0] || null);
                        }}
                        className="mt-4 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      {form101File && (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          נבחר: {form101File.name} ·{" "}
                          {formatFileSize(form101File.size)}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => uploadDocument("form101")}
                        disabled={uploadingType === "form101" || !form101File}
                        className="mt-4 h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploadingType === "form101"
                          ? "מעלה..."
                          : "העלאת טופס חתום"}
                      </button>
                    </>
                  )}
                </div>

                {currentForm101 && (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-black text-slate-900">
                      הטופס האחרון שהועלה
                    </p>

                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                      <span>
                        קובץ:{" "}
                        <b className="text-slate-950">
                          {currentForm101.originalFileName}
                        </b>
                      </span>

                      <span>
                        שנת מס:{" "}
                        <b className="text-slate-950">
                          {currentForm101.taxYear}
                        </b>
                      </span>

                      <span>
                        גודל:{" "}
                        <b className="text-slate-950">
                          {formatFileSize(currentForm101.fileSize)}
                        </b>
                      </span>

                      <span>
                        תאריך העלאה:{" "}
                        <b className="text-slate-950">
                          {formatDate(
                            currentForm101.uploadedAt ||
                              currentForm101.createdAt
                          )}
                        </b>
                      </span>
                    </div>

                    <a
                      href={currentForm101.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      צפייה בטופס שהועלה
                    </a>
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      תעודת זהות
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      העלו צילום תעודת זהות או קובץ PDF. במידת הצורך ניתן
                      להעלות גם צילום ספח.
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                      currentIdCard?.status || "missing"
                    )}`}
                  >
                    {statusLabel(currentIdCard?.status || "missing")}
                  </span>
                </div>

                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">
                    העלאת תעודת זהות
                  </p>

                  {isIdCardLocked ? (
                    <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-700">
                      {lockedMessage("תעודת זהות", currentIdCard?.status)}
                    </div>
                  ) : (
                    <>
                      {currentIdCard?.status === "rejected" && (
                        <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
                          תעודת הזהות נדחתה על ידי האדמין. ניתן להעלות קובץ
                          מתוקן.
                          {currentIdCard.rejectionReason && (
                            <div className="mt-2">
                              סיבה: {currentIdCard.rejectionReason}
                            </div>
                          )}
                        </div>
                      )}

                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg"
                        disabled={uploadingType === "idCard"}
                        onChange={(event) => {
                          setIdCardFile(event.target.files?.[0] || null);
                        }}
                        className="mt-4 block w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 file:ml-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      />

                      {idCardFile && (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          נבחר: {idCardFile.name} ·{" "}
                          {formatFileSize(idCardFile.size)}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => uploadDocument("idCard")}
                        disabled={uploadingType === "idCard" || !idCardFile}
                        className="mt-4 h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploadingType === "idCard"
                          ? "מעלה..."
                          : "העלאת תעודת זהות"}
                      </button>
                    </>
                  )}
                </div>

                {currentIdCard && (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-black text-slate-900">
                      תעודת הזהות האחרונה שהועלתה
                    </p>

                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                      <span>
                        קובץ:{" "}
                        <b className="text-slate-950">
                          {currentIdCard.originalFileName}
                        </b>
                      </span>

                      <span>
                        גודל:{" "}
                        <b className="text-slate-950">
                          {formatFileSize(currentIdCard.fileSize)}
                        </b>
                      </span>

                      <span>
                        תאריך העלאה:{" "}
                        <b className="text-slate-950">
                          {formatDate(
                            currentIdCard.uploadedAt || currentIdCard.createdAt
                          )}
                        </b>
                      </span>
                    </div>

                    <a
                      href={currentIdCard.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      צפייה בתעודת זהות שהועלתה
                    </a>
                  </div>
                )}

                {!currentIdCard && !loading && (
                  <div className="mt-5 rounded-3xl bg-white p-4 text-sm font-bold text-slate-500">
                    עדיין לא הועלתה תעודת זהות.
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={refreshAll}
                disabled={loading || loadingAgreement}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading || loadingAgreement ? "מרענן..." : "רענון סטטוס"}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-black"
              >
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}