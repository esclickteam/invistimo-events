"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type FormValues = {
  agreementDate: string;
  fullName: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  startDate: string;
  finalFullName: string;
  finalIdNumber: string;
  finalSignatureDate: string;
};

type EmployeeAgreementStatus = "signed" | "approved" | "rejected";

type EmployeeAgreement = {
  _id: string;
  employeeId: string;
  businessId: string;
  fullName: string;
  idNumber: string;
  address?: string;
  phone?: string;
  email?: string;
  startDate?: string | null;
  signedFileUrl: string;
  status: EmployeeAgreementStatus;
  signedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
};

type StepKey =
  | "agreementDate"
  | "fullName"
  | "idNumber"
  | "address"
  | "phone"
  | "email"
  | "startDate"
  | "finalFullName"
  | "finalIdNumber"
  | "finalSignatureDate"
  | "signature"
  | "confirm";

type Step = {
  key: StepKey;
  title: string;
  subtitle: string;
  type: "text" | "tel" | "email" | "date" | "signature" | "confirm";
  placeholder?: string;
  required?: boolean;
};

const steps: Step[] = [
  {
    key: "agreementDate",
    title: "תאריך",
    subtitle: "יש לבחור את התאריך שמופיע בראש ההסכם בעמוד הראשון.",
    type: "date",
    required: true,
  },
  {
    key: "fullName",
    title: "שם העובד/ת",
    subtitle: "יש להזין את שם העובד/ת כפי שיופיע בעמוד הראשון.",
    type: "text",
    placeholder: "לדוגמה: ישראל ישראלי",
    required: true,
  },
  {
    key: "idNumber",
    title: "תעודת זהות",
    subtitle: "יש להזין תעודת זהות כפי שתופיע בעמוד הראשון.",
    type: "text",
    placeholder: "לדוגמה: 123456789",
    required: true,
  },
  {
    key: "address",
    title: "כתובת",
    subtitle: "יש להזין כתובת מגורים מלאה.",
    type: "text",
    placeholder: "רחוב, מספר, עיר",
    required: true,
  },
  {
    key: "phone",
    title: "טלפון",
    subtitle: "יש להזין מספר טלפון.",
    type: "tel",
    placeholder: "לדוגמה: 0500000000",
    required: true,
  },
  {
    key: "email",
    title: "אימייל",
    subtitle: "יש להזין כתובת אימייל פעילה.",
    type: "email",
    placeholder: "name@example.com",
    required: true,
  },
  {
    key: "startDate",
    title: "תאריך תחילת עבודה",
    subtitle: "יש לבחור את תאריך תחילת העבודה שמופיע בעמוד 2.",
    type: "date",
    required: true,
  },
  {
    key: "finalFullName",
    title: "שם מלא לחתימה",
    subtitle: "יש להזין שוב שם מלא כפי שיופיע בעמוד החתימה האחרון.",
    type: "text",
    placeholder: "לדוגמה: ישראל ישראלי",
    required: true,
  },
  {
    key: "finalIdNumber",
    title: "תעודת זהות לחתימה",
    subtitle: "יש להזין שוב תעודת זהות כפי שתופיע בעמוד החתימה האחרון.",
    type: "text",
    placeholder: "לדוגמה: 123456789",
    required: true,
  },
  {
    key: "finalSignatureDate",
    title: "תאריך חתימה",
    subtitle: "יש לבחור את התאריך שיופיע ליד החתימה בעמוד האחרון.",
    type: "date",
    required: true,
  },
  {
    key: "signature",
    title: "חתימת העובד/ת",
    subtitle: "יש לחתום בתוך המסגרת באמצעות העכבר או האצבע.",
    type: "signature",
    required: true,
  },
  {
    key: "confirm",
    title: "אישור ושליחה",
    subtitle: "יש לוודא שכל הפרטים נכונים לפני שליחת ההסכם החתום.",
    type: "confirm",
    required: true,
  },
];

const initialValues: FormValues = {
  agreementDate: "",
  fullName: "",
  idNumber: "",
  address: "",
  phone: "",
  email: "",
  startDate: "",
  finalFullName: "",
  finalIdNumber: "",
  finalSignatureDate: "",
};

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

function getUserId(user: any) {
  return String(user?._id || user?.id || "");
}

function getBusinessId(user: any) {
  return String(
    user?.businessId ||
      user?.employerId ||
      user?.companyId ||
      user?.createdByAdmin ||
      user?._id ||
      user?.id ||
      ""
  );
}

function SignatureCanvas({
  onChange,
}: {
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);

  function getPoint(event: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if ("touches" in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return null;

      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.MouseEvent | React.TouchEvent) {
    event.preventDefault();

    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawingRef.current = true;
    hasSignatureRef.current = true;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: React.MouseEvent | React.TouchEvent) {
    event.preventDefault();

    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas || !hasSignatureRef.current) return;

    onChange(canvas.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    onChange("");
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className="mt-5">
      <div className="rounded-[24px] border-2 border-dashed border-slate-300 bg-white p-3">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="h-56 w-full touch-none rounded-[18px] bg-slate-50"
        />
      </div>

      <button
        type="button"
        onClick={clearSignature}
        className="mt-3 h-10 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
      >
        ניקוי חתימה
      </button>
    </div>
  );
}

function SignedAgreementSuccess({
  signedUrl,
  onBack,
}: {
  signedUrl: string;
  onBack: () => void;
}) {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950"
    >
      <div className="mx-auto max-w-3xl rounded-[32px] border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
          ✓
        </div>

        <h1 className="mt-5 text-2xl font-black text-slate-950">
          ההסכם נחתם בהצלחה
        </h1>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
          ההסכם החתום נשמר במערכת. האדמין יוכל לראות אותו יחד עם טופס 101
          ותעודת הזהות של העובד/ת.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            צפייה בהסכם החתום
          </a>

          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            חזרה
          </button>
        </div>
      </div>
    </main>
  );
}

function ExistingSignedAgreement({
  agreement,
}: {
  agreement: EmployeeAgreement;
}) {
  const statusLabel =
    agreement.status === "approved"
      ? "הסכם מאושר"
      : agreement.status === "rejected"
      ? "הסכם נדחה"
      : "הסכם נחתם וממתין לבדיקה";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950"
    >
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
          הסכם עבודה
        </div>

        <h1 className="mt-4 text-2xl font-black text-slate-950">
          כבר קיים הסכם חתום
        </h1>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
          ההסכם נשמר במערכת ויופיע לאדמין יחד עם טופס 101 ותעודת הזהות.
        </p>

        <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          <div>
            סטטוס: <b className="text-slate-950">{statusLabel}</b>
          </div>

          {agreement.signedAt && (
            <div className="mt-2">
              תאריך חתימה:{" "}
              <b className="text-slate-950">
                {formatDate(agreement.signedAt)}
              </b>
            </div>
          )}

          {agreement.fullName && (
            <div className="mt-2">
              שם עובד/ת:{" "}
              <b className="text-slate-950">{agreement.fullName}</b>
            </div>
          )}

          {agreement.idNumber && (
            <div className="mt-2">
              ת.ז: <b className="text-slate-950">{agreement.idNumber}</b>
            </div>
          )}
        </div>

        {agreement.status === "rejected" && agreement.rejectionReason && (
          <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-black leading-6 text-rose-700">
            סיבת דחייה: {agreement.rejectionReason}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={agreement.signedFileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-6 text-sm font-black text-white transition hover:bg-violet-700"
          >
            צפייה בהסכם החתום
          </a>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            חזרה
          </button>
        </div>
      </div>
    </main>
  );
}

function AgreementSignContent() {
  const { user } = useAuth();

  const employeeId = getUserId(user);
  const businessId = getBusinessId(user);

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const [loadingAgreement, setLoadingAgreement] = useState(true);
  const [existingAgreement, setExistingAgreement] =
    useState<EmployeeAgreement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successUrl, setSuccessUrl] = useState("");

  const currentStep = steps[stepIndex];

  const progressPercent = useMemo(() => {
    return Math.round(((stepIndex + 1) / steps.length) * 100);
  }, [stepIndex]);

  async function loadExistingAgreement() {
    try {
      setLoadingAgreement(true);
      setError("");

      if (!employeeId || !businessId) {
        setLoadingAgreement(false);
        return;
      }

      const params = new URLSearchParams({
        employeeId,
        businessId,
      });

      const res = await fetch(`/api/employee-agreements/current?${params}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "שגיאה בטעינת הסכם העבודה");
      }

      setExistingAgreement(data?.agreement || null);
    } catch (err) {
      console.error("LOAD EXISTING AGREEMENT FAILED:", err);
      setExistingAgreement(null);
    } finally {
      setLoadingAgreement(false);
    }
  }

  useEffect(() => {
    void loadExistingAgreement();
  }, [employeeId, businessId]);

  function updateValue(key: keyof FormValues, value: string) {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function validateCurrentStep() {
    setError("");

    if (!employeeId || !businessId) {
      setError("לא נמצא עובד מחובר. צריך להתחבר מחדש למערכת.");
      return false;
    }

    if (currentStep.key === "signature") {
      if (!signatureDataUrl) {
        setError("יש לחתום בתוך שדה החתימה לפני שממשיכים.");
        return false;
      }

      return true;
    }

    if (currentStep.key === "confirm") {
      if (!confirmed) {
        setError("יש לאשר שקראת את ההסכם ושכל הפרטים נכונים.");
        return false;
      }

      return true;
    }

    const key = currentStep.key as keyof FormValues;
    const value = values[key]?.trim();

    if (currentStep.required && !value) {
      setError(`יש למלא את השדה: ${currentStep.title}`);
      return false;
    }

    if (currentStep.key === "email") {
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!isValidEmail) {
        setError("כתובת האימייל אינה תקינה.");
        return false;
      }
    }

    if (currentStep.key === "idNumber" || currentStep.key === "finalIdNumber") {
      const cleanId = value.replace(/\D/g, "");
      if (cleanId.length < 7 || cleanId.length > 9) {
        setError("מספר תעודת הזהות אינו תקין.");
        return false;
      }
    }

    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;

    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
      return;
    }

    void submitAgreement();
  }

  function goBack() {
    setError("");

    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
      return;
    }

    window.history.back();
  }

  async function submitAgreement() {
    try {
      if (!validateCurrentStep()) return;

      setSubmitting(true);
      setError("");

      const res = await fetch("/api/employee-agreements/sign", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          businessId,
          ...values,
          signatureDataUrl,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בשליחת ההסכם לחתימה.");
      }

      setSuccessUrl(data.signedFileUrl || data.agreement?.signedFileUrl || "");
      setExistingAgreement(data.agreement || null);
    } catch (err) {
      console.error("SIGN AGREEMENT FAILED:", err);
      setError(err instanceof Error ? err.message : "שגיאה בשליחת ההסכם.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingAgreement) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
      >
        <div className="rounded-3xl bg-white p-6 text-sm font-black text-slate-700 shadow-sm">
          טוען הסכם...
        </div>
      </main>
    );
  }

  if (successUrl) {
    return (
      <SignedAgreementSuccess
        signedUrl={successUrl}
        onBack={() => window.history.back()}
      />
    );
  }

  if (
    existingAgreement?.signedFileUrl &&
    existingAgreement.status !== "rejected"
  ) {
    return <ExistingSignedAgreement agreement={existingAgreement} />;
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950"
    >
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="order-2 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm lg:order-1">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                תצוגת הסכם עבודה
              </h2>

              <p className="mt-1 text-xs font-bold text-slate-500">
                זהו ההסכם הריק. לאחר השליחה ייווצר עותק חתום עם הפרטים שלך.
              </p>
            </div>

            <a
              href="/templates/employee-agreement-invistimo.pdf"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              פתיחה בחלון חדש
            </a>
          </div>

          <iframe
            src="/templates/employee-agreement-invistimo.pdf"
            className="h-[74vh] w-full"
            title="הסכם עבודה Invistimo"
          />
        </section>

        <section className="order-1 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm lg:order-2 lg:sticky lg:top-5 lg:self-start">
          <div className="mb-4 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
            חתימה דיגיטלית
          </div>

          <h1 className="text-2xl font-black text-slate-950">
            חתימה על הסכם עבודה
          </h1>

          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            מלאי את השדות לפי הסדר. בכל שלב לחצי הבא עד השלמת החתימה.
          </p>

          {existingAgreement?.status === "rejected" && (
            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-black leading-6 text-rose-700">
              ההסכם הקודם נדחה. ניתן לחתום מחדש.
              {existingAgreement.rejectionReason && (
                <div className="mt-2">
                  סיבת דחייה: {existingAgreement.rejectionReason}
                </div>
              )}
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
              <span>
                שדה {stepIndex + 1} מתוך {steps.length}
              </span>
              <span>{progressPercent}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-6 rounded-[28px] bg-slate-50 p-5">
            <h2 className="text-xl font-black text-slate-950">
              {currentStep.title}
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {currentStep.subtitle}
            </p>

            {currentStep.type === "signature" ? (
              <SignatureCanvas onChange={setSignatureDataUrl} />
            ) : currentStep.type === "confirm" ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">
                    סיכום פרטים
                  </p>

                  <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600">
                    <div>
                      תאריך ההסכם:{" "}
                      <b className="text-slate-950">
                        {formatDate(values.agreementDate)}
                      </b>
                    </div>

                    <div>
                      שם העובד/ת בעמוד הראשון:{" "}
                      <b className="text-slate-950">{values.fullName}</b>
                    </div>

                    <div>
                      תעודת זהות בעמוד הראשון:{" "}
                      <b className="text-slate-950">{values.idNumber}</b>
                    </div>

                    <div>
                      כתובת:{" "}
                      <b className="text-slate-950">{values.address}</b>
                    </div>

                    <div>
                      טלפון: <b className="text-slate-950">{values.phone}</b>
                    </div>

                    <div>
                      אימייל: <b className="text-slate-950">{values.email}</b>
                    </div>

                    <div>
                      תאריך תחילת עבודה:{" "}
                      <b className="text-slate-950">
                        {formatDate(values.startDate)}
                      </b>
                    </div>

                    <div>
                      שם מלא בעמוד החתימה:{" "}
                      <b className="text-slate-950">{values.finalFullName}</b>
                    </div>

                    <div>
                      תעודת זהות בעמוד החתימה:{" "}
                      <b className="text-slate-950">
                        {values.finalIdNumber}
                      </b>
                    </div>

                    <div>
                      תאריך חתימה:{" "}
                      <b className="text-slate-950">
                        {formatDate(values.finalSignatureDate)}
                      </b>
                    </div>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm font-bold leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-1 h-5 w-5"
                  />
                  <span>
                    אני מאשר/ת שקראתי את הסכם העבודה, הבנתי את תנאיו, וכל
                    הפרטים שמילאתי נכונים ומדויקים.
                  </span>
                </label>
              </div>
            ) : (
              <input
                type={currentStep.type}
                value={values[currentStep.key as keyof FormValues] || ""}
                onChange={(event) =>
                  updateValue(
                    currentStep.key as keyof FormValues,
                    event.target.value
                  )
                }
                placeholder={currentStep.placeholder}
                className="mt-5 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-black leading-6 text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stepIndex === 0 ? "חזרה" : "הקודם"}
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="h-11 rounded-2xl bg-violet-600 px-7 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "שולח..."
                : stepIndex === steps.length - 1
                ? "שליחת הסכם חתום"
                : "הבא"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AgreementSignPage() {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
        >
          <div className="rounded-3xl bg-white p-6 text-sm font-black text-slate-700 shadow-sm">
            טוען...
          </div>
        </main>
      }
    >
      <AgreementSignContent />
    </Suspense>
  );
}