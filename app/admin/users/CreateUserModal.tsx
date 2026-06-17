"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRole = "user" | "producer" | "staff" | "venue_owner";
type StaffCreateType = "system" | "producer";
type PaymentStatus = "paid" | "stripe";
type PlanKey = "plan1" | "plan2" | "plan3";
type AddonKey = "calls" | "credit" | "seating" | "system" | "design";

type Props = {
  onClose: () => void;
};

/* כמה סבבי הודעות פתוחים ללקוח בחבילה */
type AllowedMessageRounds = 2 | 3;

/* הרשאות מודולים */
type AccessModulesState = {
  rsvpSeating: boolean;
  eventProduction: boolean;
};

/* שירות הושבה באולם */
type VenueSeatingServiceState = {
  enabled: boolean;
  totalPrice: number;
  depositAmount: number;
  venuePaymentAmount: number;
  staffPaymentAmount: number;
};

/* לו״ז סבבי שיחות שנשמר על המשתמש */
type CallRoundScheduleState = {
  enabled: boolean;
  rounds: {
    roundNumber: 1 | 2 | 3;
    title: string;
    scheduledAt: string;
    notes: string;
  }[];
};

/* איזה אפסיילים כלולים בכל חבילה */
const includedByPlan: Record<PlanKey, AddonKey[]> = {
  plan1: [],
  plan2: ["calls"],
  plan3: ["calls", "credit", "seating"],
};

const addonLabels: Record<AddonKey, string> = {
  calls: "שיחות",
  credit: "מתנות באשראי",
  seating: "הושבה דיגיטלית",
  system: "מערכת ניהול אירוע",
  design: "עיצוב בהתאמה אישית",
};

function toNumber(value: string) {
  if (value === "") return 0;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function CreateUserModal({ onClose }: Props) {
  const router = useRouter();

  function openFullClientCreation() {
    onClose();
    router.push("/admin/sales/new");
  }

  /* ===== USER BASIC ===== */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  const [staffCreateType, setStaffCreateType] =
  useState<StaffCreateType>("system");

const [assignedProducerId, setAssignedProducerId] = useState("");


  /* ===== PLAN ===== */
  const [plan, setPlan] = useState<PlanKey>("plan1");

  /* ===== USER LIMITS ===== */
  const [records, setRecords] = useState(100);
  const [allowedMessageRounds, setAllowedMessageRounds] =
    useState<AllowedMessageRounds>(2);

  /* ===== ACCESS MODULES ===== */
  const [accessModules, setAccessModules] = useState<AccessModulesState>({
    rsvpSeating: true,
    eventProduction: false,
  });

  /* ===== ADDONS ===== */
  const [addons, setAddons] = useState<
    Record<AddonKey, { enabled: boolean; price: number }>
  >({
    calls: { enabled: false, price: 0 },
    credit: { enabled: false, price: 0 },
    seating: { enabled: false, price: 0 },
    system: { enabled: false, price: 0 },
    design: { enabled: false, price: 0 },
  });

  /* ===== CALL ROUNDS SCHEDULE ===== */
  const [callRoundsSchedule, setCallRoundsSchedule] =
    useState<CallRoundScheduleState>({
      enabled: true,
      rounds: [
        {
          roundNumber: 1,
          title: "סבב שיחות 1",
          scheduledAt: "",
          notes: "",
        },
        {
          roundNumber: 2,
          title: "סבב שיחות 2",
          scheduledAt: "",
          notes: "",
        },
        {
          roundNumber: 3,
          title: "סבב שיחות 3",
          scheduledAt: "",
          notes: "",
        },
      ],
    });

  const handleCallRoundChange = (
    roundNumber: 1 | 2 | 3,
    field: "scheduledAt" | "notes",
    value: string
  ) => {
    setCallRoundsSchedule((prev) => ({
      ...prev,
      rounds: prev.rounds.map((round) =>
        round.roundNumber === roundNumber
          ? {
              ...round,
              [field]: value,
            }
          : round
      ),
    }));
  };

  /* ===== VENUE SEATING SERVICE ===== */
  const [venueSeatingService, setVenueSeatingService] =
    useState<VenueSeatingServiceState>({
      enabled: false,
      totalPrice: 0,
      depositAmount: 0,
      venuePaymentAmount: 0,
      staffPaymentAmount: 0,
    });

  const staffPaidFromVenue = Math.min(
    venueSeatingService.staffPaymentAmount,
    venueSeatingService.venuePaymentAmount
  );

  const staffPaidFromFullAmount = Math.max(
    venueSeatingService.staffPaymentAmount -
      venueSeatingService.venuePaymentAmount,
    0
  );

  const venuePaymentAfterStaff = Math.max(
    venueSeatingService.venuePaymentAmount -
      venueSeatingService.staffPaymentAmount,
    0
  );

  const totalAfterStaff = Math.max(
    venueSeatingService.totalPrice - venueSeatingService.staffPaymentAmount,
    0
  );

  const handleVenueServiceToggle = () => {
    setVenueSeatingService((prev) => {
      const nextEnabled = !prev.enabled;

      if (!nextEnabled) {
        return {
          enabled: false,
          totalPrice: 0,
          depositAmount: 0,
          venuePaymentAmount: 0,
          staffPaymentAmount: 0,
        };
      }

      const half = roundMoney(prev.totalPrice / 2);

      return {
        ...prev,
        enabled: true,
        depositAmount: half,
        venuePaymentAmount: roundMoney(prev.totalPrice - half),
      };
    });
  };

  const handleVenueTotalChange = (rawValue: string) => {
    const totalPrice = toNumber(rawValue);
    const depositAmount = roundMoney(totalPrice / 2);
    const venuePaymentAmount = roundMoney(totalPrice - depositAmount);

    setVenueSeatingService((prev) => ({
      ...prev,
      totalPrice,
      depositAmount,
      venuePaymentAmount,
      staffPaymentAmount: Math.min(prev.staffPaymentAmount, totalPrice),
    }));
  };

  const handleVenueDepositChange = (rawValue: string) => {
    const depositAmount = toNumber(rawValue);

    setVenueSeatingService((prev) => {
      const safeDeposit = Math.min(depositAmount, prev.totalPrice);
      const venuePaymentAmount = roundMoney(prev.totalPrice - safeDeposit);

      return {
        ...prev,
        depositAmount: safeDeposit,
        venuePaymentAmount,
      };
    });
  };

  const handleVenuePaymentChange = (rawValue: string) => {
    const venuePaymentAmount = toNumber(rawValue);

    setVenueSeatingService((prev) => {
      const safeVenuePayment = Math.min(venuePaymentAmount, prev.totalPrice);
      const depositAmount = roundMoney(prev.totalPrice - safeVenuePayment);

      return {
        ...prev,
        venuePaymentAmount: safeVenuePayment,
        depositAmount,
      };
    });
  };

  const handleStaffPaymentChange = (rawValue: string) => {
    const staffPaymentAmount = toNumber(rawValue);

    setVenueSeatingService((prev) => ({
      ...prev,
      staffPaymentAmount: Math.min(staffPaymentAmount, prev.totalPrice),
    }));
  };

  /* ===== USER BILLING ===== */
  const [price, setPrice] = useState<number | "">("");
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("stripe");

  /* ===== PRODUCER BILLING ===== */
  const [producerPricePerRecord, setProducerPricePerRecord] =
    useState<number | "">("");

  const callsIncludedInPlan = includedByPlan[plan].includes("calls");
  const callsEnabledForUser =
    role === "user" && (callsIncludedInPlan || addons.calls.enabled);

  const normalizedCallRoundsSchedule = {
    enabled: Boolean(callsEnabledForUser && callRoundsSchedule.enabled),
    rounds:
      callsEnabledForUser && callRoundsSchedule.enabled
        ? callRoundsSchedule.rounds
            .filter((round) => Boolean(round.scheduledAt))
            .map((round) => ({
              roundNumber: round.roundNumber,
              title: round.title || `סבב שיחות ${round.roundNumber}`,
              scheduledAt: round.scheduledAt,
              status: "scheduled",
              notes: round.notes || "",
            }))
        : [],
  };

  /* =====================================================
     SUBMIT
  ===================================================== */
  async function handleSubmit() {
    if (role === "user") {
      openFullClientCreation();
      return;
    }

    const included = new Set(includedByPlan[plan]);

    const finalAllowedMessageRounds: AllowedMessageRounds =
      Number(allowedMessageRounds) === 3 ? 3 : 2;

    const effectiveIncludeCalls =
      included.has("calls") || addons.calls.enabled;

    const includeCreditGifts =
      included.has("credit") || addons.credit.enabled;

    const seatingEnabled =
      included.has("seating") ||
      addons.seating.enabled ||
      accessModules.rsvpSeating;

    const selfManageEnabled =
      included.has("system") ||
      addons.system.enabled ||
      accessModules.eventProduction;

    const customDesignEnabled =
      included.has("design") || addons.design.enabled;

    const payload =
      role === "producer"
        ? {
            name,
            email,
            role,
            billing: {
              pricePerRecord: producerPricePerRecord,
            },
          }
        : role === "staff"
  ? staffCreateType === "producer"
    ? {
        name,
        email,
        role: "staff",

        // עובד של מפיק
        staffType: "producer_staff",
        employeeScope: "producer",

        assignedProducerId,
        createdByAdmin: true,
        billingSource: "admin",

        producerId: null,
        createdByProducer: null,
        assignedStaffIds: [],
        assignedClientIds: [],

        plan: "basic",
        priceKey: "producer_staff_manual",
        packageName: "עובד מפיק",

        guests: 0,
        maxGuests: 0,
        smsLimit: 0,
        maxMessages: 0,
        allowedMessageRounds: 2,

        limits: {
          records: 0,
          allowedMessageRounds: 2,
        },

        billing: {
          price: 0,
          paymentStatus: "paid",
        },

        includeCalls: false,
        includeCreditGifts: false,
        includeDigitalSeating: false,
        includeEventManagement: false,
        includeCustomDesign: false,

        hasPaid: true,
        isActive: true,
      }
    : {
        name,
        email,
        role: "staff",

        // עובד פנימי של Invistimo
        staffType: "general_staff",
        employeeScope: "system",

        createdByAdmin: true,
        billingSource: "admin",

        producerId: null,
        createdByProducer: null,
        assignedProducerId: null,
        assignedStaffIds: [],
        assignedClientIds: [],

        plan: "basic",
        priceKey: "staff_manual",
        packageName: "עובד מערכת",

        guests: 0,
        maxGuests: 0,
        smsLimit: 0,
        maxMessages: 0,
        allowedMessageRounds: 2,

        limits: {
          records: 0,
          allowedMessageRounds: 2,
        },

        billing: {
          price: 0,
          paymentStatus: "paid",
        },

        includeCalls: false,
        includeCreditGifts: false,
        includeDigitalSeating: false,
        includeEventManagement: false,
        includeCustomDesign: false,

        hasPaid: true,
        isActive: true,
      }

          : role === "venue_owner"
            ? {
                name,
                email,
                role: "venue_owner",

                /*
                  בעל אולם לא צריך חבילת RSVP רגילה,
                  לא רשומות ולא סבבי הודעות.
                  הוא נכנס לדשבורד אולמות.
                */
                plan: "basic",
                priceKey: "venue_owner_manual",
                packageName: "ניהול אולם",

                guests: 0,
                maxGuests: 0,
                smsLimit: 0,
                maxMessages: 0,
                allowedMessageRounds: 2,

                limits: {
                  records: 0,
                  allowedMessageRounds: 2,
                },

                billing: {
                  price: 0,
                  paymentStatus: "paid",
                },

                accessModules: {
                  rsvpSeating: false,
                  eventProduction: false,
                  venueDashboard: true,
                },

                includeCalls: false,
                includeCreditGifts: false,
                includeDigitalSeating: false,
                includeEventManagement: false,
                includeCustomDesign: false,

                hasPaid: true,
                isActive: true,
              }
            : {
                name,
                email,
                role,
                plan,

                limits: {
                  records,

                  /*
                    ✅ חשוב:
                    המערכת לא עובדת לפי כמות הודעות SMS,
                    אלא לפי כמות סבבי הודעות פתוחים ללקוח.
                    2 = כלול כברירת מחדל
                    3 = פתוח ללקוח אם נבחר בדרופדאון החבילה
                  */
                  allowedMessageRounds: finalAllowedMessageRounds,
                },

                billing: {
                  price,
                  paymentStatus,
                },

                /*
                  ✅ הרשאות מודולים:
                  rsvpSeating = אישורי הגעה / הושבה
                  eventProduction = הפקת אירוע
                */
                accessModules: {
                  rsvpSeating: accessModules.rsvpSeating,
                  eventProduction: accessModules.eventProduction,
                },

                includeCreditGifts,
                seatingEnabled,
                selfManageEnabled,
                customDesignEnabled,

                callRoundsSchedule: normalizedCallRoundsSchedule,

                venueSeatingService: {
                  enabled: venueSeatingService.enabled,
                  totalPrice: venueSeatingService.enabled
                    ? venueSeatingService.totalPrice
                    : 0,
                  depositAmount: venueSeatingService.enabled
                    ? venueSeatingService.depositAmount
                    : 0,
                  venuePaymentAmount: venueSeatingService.enabled
                    ? venueSeatingService.venuePaymentAmount
                    : 0,
                  staffPaymentAmount: venueSeatingService.enabled
                    ? venueSeatingService.staffPaymentAmount
                    : 0,

                  /*
                    מידע מחושב לתצוגה/אדמין:
                    המקדמה נקלטת בחודש הרכישה.
                    תשלום צוות יורד קודם מהתשלום באולם.
                    אם אין מספיק בתשלום באולם — היתרה יורדת מהסכום הכולל.
                  */
                  staffPaidFromVenue: venueSeatingService.enabled
                    ? staffPaidFromVenue
                    : 0,
                  staffPaidFromFullAmount: venueSeatingService.enabled
                    ? staffPaidFromFullAmount
                    : 0,
                  venuePaymentAfterStaff: venueSeatingService.enabled
                    ? venuePaymentAfterStaff
                    : 0,
                  totalAfterStaff: venueSeatingService.enabled
                    ? totalAfterStaff
                    : 0,
                },

                addons: {
                  calls: {
                    ...addons.calls,
                    enabled: effectiveIncludeCalls,
                  },
                  credit: {
                    ...addons.credit,
                    enabled: includeCreditGifts,
                  },
                  seating: {
                    ...addons.seating,
                    enabled: seatingEnabled,
                  },
                  system: {
                    ...addons.system,
                    enabled: selfManageEnabled,
                  },
                  design: {
                    ...addons.design,
                    enabled: customDesignEnabled,
                  },
                },
              };

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error("CREATE_USER_FAILED");
      }


      onClose();
    } catch (err) {
      console.error("CREATE USER FAILED:", err);
      alert("שגיאה ביצירת משתמש");
    }
  }

  const isSubmitDisabled =
  role === "user"
    ? false
    : !name ||
      !email ||
      (role === "producer" && !producerPricePerRecord) ||
      (role === "staff" &&
        staffCreateType === "producer" &&
        !assignedProducerId);

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <div className="w-full max-w-3xl bg-[#fffdf9] rounded-[28px] shadow-2xl border border-[#eadfce] max-h-[92vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="px-7 py-5 border-b border-[#efe4d6] flex justify-between items-center bg-gradient-to-l from-[#fffaf2] to-white">
          <div>
            <h2 className="text-2xl font-bold text-[#3f3327]">
              יצירת משתמש חדש
            </h2>

            <p className="text-sm text-[#8b7b68] mt-1">
              הגדרת לקוח, בעל אולם, חבילה, סבבי הודעות, מודולים ואפסיילים
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-[#eadfce] bg-white text-[#8b7b68] hover:text-[#3f3327] hover:bg-[#fff7ec] transition text-xl flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-7 space-y-8 overflow-y-auto">
          {/* USER INFO */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#3f4856]">
                פרטי משתמש
              </h3>

              <p className="text-xs text-[#8b7b68] mt-1">
                פרטים בסיסיים והרשאת משתמש במערכת
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="שם מלא"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
              />

              <input
                type="email"
                placeholder="אימייל משתמש"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
              >
                <option value="user">לקוח</option>
                <option value="venue_owner">בעל אולם</option>
                <option value="producer">מפיק</option>
                <option value="staff">עובד</option>
              </select>

              {role === "venue_owner" && (
                <div className="rounded-2xl border border-[#eadfce] bg-[#fff8ed] px-4 py-3 text-sm text-[#7a5a2f] leading-6">
                  משתמש מסוג בעל אולם יקבל הרשאת כניסה לדשבורד אולמות בלבד.
                  לא נפתחת לו חבילת לקוח רגילה, לא רשומות, לא SMS ולא סבבי
                  הודעות.
                </div>
              )}
            </div>
          </section>

          {/* USER */}
          {role === "user" && (
            <section className="space-y-5 rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-[#3f4856]">
                  יצירת לקוח מלאה
                </h3>

                <p className="mt-2 text-sm leading-7 text-[#8b7b68]">
                  לקוח לא נוצר יותר מתוך הטופס הישן הזה. לחיצה על הכפתור תפתח
                  את מסך המכירה המלא של האדמין — בדיוק כמו אצל העובד: חבילה,
                  אפסיילים, עריכת מחירים, הנחות, הצעת מחיר, הסכם, שליחת SMS,
                  Stripe או שולם ידנית.
                </p>
              </div>

              <div className="rounded-3xl border border-[#f0d8b7] bg-[#fff8ed] p-5">
                <h4 className="text-lg font-black text-[#3f3327]">
                  מה ייפתח במסך המלא?
                </h4>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm font-semibold text-[#6b5a45] md:grid-cols-2">
                  <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    הצעת מחיר / הסכם
                  </div>
                  <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    שליחה ב־SMS
                  </div>
                  <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    עריכת מחיר חבילה ואפסיילים
                  </div>
                  <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    הנחה בשקלים או באחוזים
                  </div>
                  <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    תשלום Stripe
                  </div>
                  <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    שולם ידנית
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={openFullClientCreation}
                className="h-14 w-full rounded-2xl bg-[#3f3327] px-6 text-base font-black text-white shadow-lg shadow-black/10 transition hover:bg-[#2f251d]"
              >
                פתיחת יצירת לקוח מלאה
              </button>
            </section>
          )}

          {/* PRODUCER */}
          {role === "producer" && (
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#3f4856]">
                  תמחור למפיק
                </h3>

                <p className="text-xs text-[#8b7b68] mt-1">
                  מחיר לפי רשומה עבור משתמש מסוג מפיק
                </p>
              </div>

              <label className="space-y-2 block">
                <span className="block text-sm font-semibold text-[#6b5a45]">
                  מחיר לרשומה (₪)
                </span>

                <input
                  type="number"
                  value={producerPricePerRecord}
                  onChange={(e) =>
                    setProducerPricePerRecord(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
                />
              </label>
            </section>
          )}

          {/* STAFF */}
{role === "staff" && (
  <section className="space-y-4 rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
    <div>
      <h3 className="text-sm font-bold text-[#3f4856]">
        סוג עובד
      </h3>

      <p className="text-xs text-[#8b7b68] mt-1">
        בחרי האם זה עובד פנימי של Invistimo או עובד ששייך למפיק.
      </p>
    </div>

    <select
      value={staffCreateType}
      onChange={(e) =>
        setStaffCreateType(e.target.value as StaffCreateType)
      }
      className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
    >
      <option value="system">עובד מערכת Invistimo</option>
      <option value="producer">עובד של מפיק</option>
    </select>

    {staffCreateType === "producer" && (
      <label className="space-y-2 block">
        <span className="block text-sm font-semibold text-[#6b5a45]">
          ID של המפיק
        </span>

        <input
          type="text"
          placeholder="הדביקי כאן את ה־ObjectId של המפיק"
          value={assignedProducerId}
          onChange={(e) => setAssignedProducerId(e.target.value)}
          className="w-full h-14 rounded-2xl border border-[#eadfce] bg-white px-4 text-right text-[#4b3b2a] outline-none focus:border-[#c7a76c] focus:ring-4 focus:ring-[#c7a76c]/15"
        />

        <p className="text-xs text-[#8b7b68]">
          זמנית אפשר להכניס ID ידני. בשלב הבא עדיף להפוך את זה לבחירת מפיק מרשימה.
        </p>
      </label>
    )}

    <div className="rounded-2xl border border-[#eadfce] bg-[#fff8ed] px-4 py-3 text-sm text-[#7a5a2f] leading-6">
      {staffCreateType === "system"
        ? "העובד ייווצר כעובד כללי של Invistimo."
        : "העובד ייווצר כעובד של מפיק ויחובר למפיק שבחרת."}
    </div>
  </section>
)}

          {/* VENUE OWNER */}
          {role === "venue_owner" && (
            <section className="rounded-3xl border border-[#eadfce] bg-white p-5 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-[#3f4856]">
                בעל אולם
              </h3>

              <p className="text-sm text-[#8b7b68] leading-7">
                המשתמש ייווצר עם תפקיד:
                <span dir="ltr" className="font-bold text-[#3f3327] mx-1">
                  venue_owner
                </span>
                ויוכל להיכנס לדשבורד האולמות. את האולמות עצמם אפשר להוסיף
                ולנהל מתוך מערכת האולמות.
              </p>

              <div className="rounded-2xl border border-[#eadfce] bg-[#fff8ed] px-4 py-3 text-sm text-[#7a5a2f] leading-6">
                לא נדרש מחיר, לא Stripe, לא רשומות ולא סבבי הודעות עבור בעל
                אולם.
              </div>
            </section>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-7 py-5 border-t border-[#efe4d6] bg-[#fffaf3] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-2xl border border-[#eadfce] bg-white text-[#5b4a3a] font-semibold hover:bg-[#fff7ec] transition"
          >
            ביטול
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="px-6 py-3 rounded-2xl bg-[#3f3327] text-white font-bold shadow-lg shadow-black/10 hover:bg-[#2f251d] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {role === "user" ? "פתיחת יצירת לקוח מלאה" : "צור משתמש"}
          </button>
        </div>
      </div>
    </div>
  );
}