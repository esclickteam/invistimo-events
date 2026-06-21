"use client";

import React, { useMemo, useState } from "react";

type Gender = "male" | "female" | "";
type YesNo = "yes" | "no" | "";
type MaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "separated"
  | "";

type Form101Data = {
  taxYear: string;

  employerName: string;
  employerAddress: string;
  employerPhone: string;
  employerFileNumber: string;

  idNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  immigrationDate: string;

  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;

  phone: string;
  mobile: string;
  email: string;

  gender: Gender;
  maritalStatus: MaritalStatus;
  residentIsrael: YesNo;
  kibbutzMember: YesNo;
  healthFundMember: YesNo;
  healthFundName: string;

  workStartDate: string;

  incomeType: {
    monthlySalary: boolean;
    extraSalary: boolean;
    partialSalary: boolean;
    dailyWage: boolean;
    allowance: boolean;
    pension: boolean;
  };

  otherIncome: {
    noOtherIncome: boolean;
    monthlySalary: boolean;
    extraSalary: boolean;
    partialSalary: boolean;
    dailyWage: boolean;
    allowance: boolean;
    pension: boolean;
    scholarship: boolean;
  };

  spouse: {
    idNumber: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    immigrationDate: string;
    noIncome: boolean;
    hasIncome: boolean;
  };

  children: {
    name: string;
    idNumber: string;
    birthDate: string;
  }[];

  taxCredits: {
    resident: boolean;
    disabled100: boolean;
    settlement: boolean;
    settlementDate: string;
    settlementName: string;
    newImmigrant: boolean;
    spouseNoIncome: boolean;
    singleParent: boolean;
    childrenCustody: boolean;
    childrenBornThisYear: string;
    childrenAgeOneToFive: string;
    childrenAgeSixToSeventeen: string;
    childrenAgeEighteen: string;
    specialChild: boolean;
    alimony: boolean;
    childrenUnder19: boolean;
    soldier: boolean;
    academic: boolean;
    diploma: boolean;
    noIncomeThisYear: boolean;
    hasOtherIncomeForTaxCoordination: boolean;
  };

  signatureDate: string;
  signatureText: string;
};

const initialForm101Data: Form101Data = {
  taxYear: new Date().getFullYear().toString(),

  employerName: "בן עשת",
  employerAddress: "העצמאות 41 קרית אתא",
  employerPhone: "0526850711",
  employerFileNumber: "905790028",

  idNumber: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  immigrationDate: "",

  street: "",
  houseNumber: "",
  city: "",
  postalCode: "",

  phone: "",
  mobile: "",
  email: "",

  gender: "",
  maritalStatus: "",
  residentIsrael: "",
  kibbutzMember: "",
  healthFundMember: "",
  healthFundName: "",

  workStartDate: "",

  incomeType: {
    monthlySalary: false,
    extraSalary: false,
    partialSalary: false,
    dailyWage: false,
    allowance: false,
    pension: false,
  },

  otherIncome: {
    noOtherIncome: false,
    monthlySalary: false,
    extraSalary: false,
    partialSalary: false,
    dailyWage: false,
    allowance: false,
    pension: false,
    scholarship: false,
  },

  spouse: {
    idNumber: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    immigrationDate: "",
    noIncome: false,
    hasIncome: false,
  },

  children: Array.from({ length: 10 }).map(() => ({
    name: "",
    idNumber: "",
    birthDate: "",
  })),

  taxCredits: {
    resident: false,
    disabled100: false,
    settlement: false,
    settlementDate: "",
    settlementName: "",
    newImmigrant: false,
    spouseNoIncome: false,
    singleParent: false,
    childrenCustody: false,
    childrenBornThisYear: "",
    childrenAgeOneToFive: "",
    childrenAgeSixToSeventeen: "",
    childrenAgeEighteen: "",
    specialChild: false,
    alimony: false,
    childrenUnder19: false,
    soldier: false,
    academic: false,
    diploma: false,
    noIncomeThisYear: false,
    hasOtherIncomeForTaxCoordination: false,
  },

  signatureDate: "",
  signatureText: "",
};

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-black text-slate-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-right text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
      />
      <span>{label}</span>
    </label>
  );
}

function RadioCard<T extends string>({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: T;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`h-11 rounded-2xl border px-4 text-sm font-black transition ${
        selected === value
          ? "border-sky-500 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

export default function OnlineForm101() {
  const [form, setForm] = useState<Form101Data>(initialForm101Data);
  const [submitting, setSubmitting] = useState(false);

  const employeeFullName = useMemo(() => {
    return [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  }, [form.firstName, form.lastName]);

  function update<K extends keyof Form101Data>(
    key: K,
    value: Form101Data[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateIncome(
    key: keyof Form101Data["incomeType"],
    value: boolean,
  ) {
    setForm((prev) => ({
      ...prev,
      incomeType: {
        ...prev.incomeType,
        [key]: value,
      },
    }));
  }

  function updateOtherIncome(
    key: keyof Form101Data["otherIncome"],
    value: boolean,
  ) {
    setForm((prev) => ({
      ...prev,
      otherIncome: {
        ...prev.otherIncome,
        [key]: value,
      },
    }));
  }

  function updateSpouse<K extends keyof Form101Data["spouse"]>(
    key: K,
    value: Form101Data["spouse"][K],
  ) {
    setForm((prev) => ({
      ...prev,
      spouse: {
        ...prev.spouse,
        [key]: value,
      },
    }));
  }

  function updateTaxCredit<K extends keyof Form101Data["taxCredits"]>(
    key: K,
    value: Form101Data["taxCredits"][K],
  ) {
    setForm((prev) => ({
      ...prev,
      taxCredits: {
        ...prev.taxCredits,
        [key]: value,
      },
    }));
  }

  function updateChild(
    index: number,
    key: keyof Form101Data["children"][number],
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      children: prev.children.map((child, childIndex) =>
        childIndex === index
          ? {
              ...child,
              [key]: value,
            }
          : child,
      ),
    }));
  }

  async function submitForm101(formData: Form101Data) {
    try {
      setSubmitting(true);

      const response = await fetch("/api/forms/101/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("FORM 101 PDF ERROR:", errorData);
        alert(errorData?.message || "שגיאה ביצירת טופס 101");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      window.open(url, "_blank");
    } catch (error) {
      console.error("SUBMIT FORM 101 ERROR:", error);
      alert("שגיאה בשליחת טופס 101");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-l from-sky-50 via-white to-slate-50 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">
                  טופס 101 מקוון
                </span>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  מילוי טופס 101 אונליין
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                  העובד ממלא את הפרטים כאן, והמערכת מייצרת PDF על גבי הטופס
                  המקורי בדיוק במבנה הרשמי.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-black text-slate-500">עובד/ת</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {employeeFullName || "טרם מולא"}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  שנת מס {form.taxYear}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Section title="א. פרטי המעסיק">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <TextInput
              label="שם המעסיק"
              value={form.employerName}
              onChange={(value) => update("employerName", value)}
            />
            <TextInput
              label="כתובת"
              value={form.employerAddress}
              onChange={(value) => update("employerAddress", value)}
            />
            <TextInput
              label="מספר טלפון"
              value={form.employerPhone}
              onChange={(value) => update("employerPhone", value)}
            />
            <TextInput
              label="מספר תיק ניכויים"
              value={form.employerFileNumber}
              onChange={(value) => update("employerFileNumber", value)}
            />
          </div>
        </Section>

        <Section title="ב. פרטי העובד/ת">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <TextInput
              label="מספר זהות"
              value={form.idNumber}
              onChange={(value) => update("idNumber", value)}
            />
            <TextInput
              label="שם פרטי"
              value={form.firstName}
              onChange={(value) => update("firstName", value)}
            />
            <TextInput
              label="שם משפחה"
              value={form.lastName}
              onChange={(value) => update("lastName", value)}
            />
            <TextInput
              label="תאריך לידה"
              type="date"
              value={form.birthDate}
              onChange={(value) => update("birthDate", value)}
            />
            <TextInput
              label="תאריך עלייה"
              type="date"
              value={form.immigrationDate}
              onChange={(value) => update("immigrationDate", value)}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <TextInput
              label="רחוב / שכונה"
              value={form.street}
              onChange={(value) => update("street", value)}
            />
            <TextInput
              label="מספר בית"
              value={form.houseNumber}
              onChange={(value) => update("houseNumber", value)}
            />
            <TextInput
              label="עיר / יישוב"
              value={form.city}
              onChange={(value) => update("city", value)}
            />
            <TextInput
              label="מיקוד"
              value={form.postalCode}
              onChange={(value) => update("postalCode", value)}
            />
            <TextInput
              label="טלפון"
              value={form.phone}
              onChange={(value) => update("phone", value)}
            />
            <TextInput
              label="נייד"
              value={form.mobile}
              onChange={(value) => update("mobile", value)}
            />
          </div>

          <div className="mt-4">
            <TextInput
              label="דואר אלקטרוני"
              value={form.email}
              onChange={(value) => update("email", value)}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div>
              <p className="mb-2 text-sm font-black text-slate-700">מין</p>
              <div className="grid grid-cols-2 gap-2">
                <RadioCard
                  label="זכר"
                  value="male"
                  selected={form.gender}
                  onSelect={(value) => update("gender", value)}
                />
                <RadioCard
                  label="נקבה"
                  value="female"
                  selected={form.gender}
                  onSelect={(value) => update("gender", value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-black text-slate-700">
                מצב משפחתי
              </p>
              <div className="grid grid-cols-2 gap-2">
                <RadioCard
                  label="רווק/ה"
                  value="single"
                  selected={form.maritalStatus}
                  onSelect={(value) => update("maritalStatus", value)}
                />
                <RadioCard
                  label="נשוי/אה"
                  value="married"
                  selected={form.maritalStatus}
                  onSelect={(value) => update("maritalStatus", value)}
                />
                <RadioCard
                  label="גרוש/ה"
                  value="divorced"
                  selected={form.maritalStatus}
                  onSelect={(value) => update("maritalStatus", value)}
                />
                <RadioCard
                  label="אלמן/ה"
                  value="widowed"
                  selected={form.maritalStatus}
                  onSelect={(value) => update("maritalStatus", value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-black text-slate-700">
                תושב/ת ישראל
              </p>
              <div className="grid grid-cols-2 gap-2">
                <RadioCard
                  label="כן"
                  value="yes"
                  selected={form.residentIsrael}
                  onSelect={(value) => update("residentIsrael", value)}
                />
                <RadioCard
                  label="לא"
                  value="no"
                  selected={form.residentIsrael}
                  onSelect={(value) => update("residentIsrael", value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-black text-slate-700">
                חבר/ת קיבוץ
              </p>
              <div className="grid grid-cols-2 gap-2">
                <RadioCard
                  label="כן"
                  value="yes"
                  selected={form.kibbutzMember}
                  onSelect={(value) => update("kibbutzMember", value)}
                />
                <RadioCard
                  label="לא"
                  value="no"
                  selected={form.kibbutzMember}
                  onSelect={(value) => update("kibbutzMember", value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-black text-slate-700">
                חבר/ת קופת חולים
              </p>
              <div className="grid grid-cols-2 gap-2">
                <RadioCard
                  label="כן"
                  value="yes"
                  selected={form.healthFundMember}
                  onSelect={(value) => update("healthFundMember", value)}
                />
                <RadioCard
                  label="לא"
                  value="no"
                  selected={form.healthFundMember}
                  onSelect={(value) => update("healthFundMember", value)}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <TextInput
                label="שם קופת חולים"
                value={form.healthFundName}
                onChange={(value) => update("healthFundName", value)}
              />
            </div>
          </div>
        </Section>

        <Section title="ג. פרטי בן/בת זוג">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <TextInput
              label="מספר זהות"
              value={form.spouse.idNumber}
              onChange={(value) => updateSpouse("idNumber", value)}
            />
            <TextInput
              label="שם פרטי"
              value={form.spouse.firstName}
              onChange={(value) => updateSpouse("firstName", value)}
            />
            <TextInput
              label="שם משפחה"
              value={form.spouse.lastName}
              onChange={(value) => updateSpouse("lastName", value)}
            />
            <TextInput
              label="תאריך לידה"
              type="date"
              value={form.spouse.birthDate}
              onChange={(value) => updateSpouse("birthDate", value)}
            />
            <TextInput
              label="תאריך עלייה"
              type="date"
              value={form.spouse.immigrationDate}
              onChange={(value) => updateSpouse("immigrationDate", value)}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CheckboxField
              label="אין לבן/בת הזוג הכנסה"
              checked={form.spouse.noIncome}
              onChange={(value) => updateSpouse("noIncome", value)}
            />
            <CheckboxField
              label="יש לבן/בת הזוג הכנסה"
              checked={form.spouse.hasIncome}
              onChange={(value) => updateSpouse("hasIncome", value)}
            />
          </div>
        </Section>

        <Section title="ד. פרטים על הכנסותיי ממעסיק זה">
          <div className="mb-4 max-w-xs">
            <TextInput
              label="תאריך תחילת עבודה בשנת המס"
              type="date"
              value={form.workStartDate}
              onChange={(value) => update("workStartDate", value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <CheckboxField
              label="משכורת חודש"
              checked={form.incomeType.monthlySalary}
              onChange={(value) => updateIncome("monthlySalary", value)}
            />
            <CheckboxField
              label="משכורת נוספת"
              checked={form.incomeType.extraSalary}
              onChange={(value) => updateIncome("extraSalary", value)}
            />
            <CheckboxField
              label="משכורת בעד משרה נוספת"
              checked={form.incomeType.partialSalary}
              onChange={(value) => updateIncome("partialSalary", value)}
            />
            <CheckboxField
              label="שכר עבודה יומי"
              checked={form.incomeType.dailyWage}
              onChange={(value) => updateIncome("dailyWage", value)}
            />
            <CheckboxField
              label="קצבה"
              checked={form.incomeType.allowance}
              onChange={(value) => updateIncome("allowance", value)}
            />
            <CheckboxField
              label="מלגה"
              checked={form.incomeType.pension}
              onChange={(value) => updateIncome("pension", value)}
            />
          </div>
        </Section>

        <Section title="ה. פרטים על הכנסות אחרות">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <CheckboxField
              label="אין לי הכנסות אחרות"
              checked={form.otherIncome.noOtherIncome}
              onChange={(value) => updateOtherIncome("noOtherIncome", value)}
            />
            <CheckboxField
              label="משכורת חודש"
              checked={form.otherIncome.monthlySalary}
              onChange={(value) => updateOtherIncome("monthlySalary", value)}
            />
            <CheckboxField
              label="משכורת נוספת"
              checked={form.otherIncome.extraSalary}
              onChange={(value) => updateOtherIncome("extraSalary", value)}
            />
            <CheckboxField
              label="משכורת בעד משרה נוספת"
              checked={form.otherIncome.partialSalary}
              onChange={(value) => updateOtherIncome("partialSalary", value)}
            />
            <CheckboxField
              label="שכר עבודה יומי"
              checked={form.otherIncome.dailyWage}
              onChange={(value) => updateOtherIncome("dailyWage", value)}
            />
            <CheckboxField
              label="קצבה"
              checked={form.otherIncome.allowance}
              onChange={(value) => updateOtherIncome("allowance", value)}
            />
            <CheckboxField
              label="מלגה"
              checked={form.otherIncome.scholarship}
              onChange={(value) => updateOtherIncome("scholarship", value)}
            />
          </div>
        </Section>

        <Section title="ו. פרטים על ילדים">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 p-3 text-right">
                    #
                  </th>
                  <th className="border border-slate-200 p-3 text-right">
                    שם הילד/ה
                  </th>
                  <th className="border border-slate-200 p-3 text-right">
                    מספר זהות
                  </th>
                  <th className="border border-slate-200 p-3 text-right">
                    תאריך לידה
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.children.map((child, index) => (
                  <tr key={index}>
                    <td className="border border-slate-200 p-2 font-bold">
                      {index + 1}
                    </td>
                    <td className="border border-slate-200 p-2">
                      <input
                        value={child.name}
                        onChange={(event) =>
                          updateChild(index, "name", event.target.value)
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-right outline-none focus:border-sky-400"
                      />
                    </td>
                    <td className="border border-slate-200 p-2">
                      <input
                        value={child.idNumber}
                        onChange={(event) =>
                          updateChild(index, "idNumber", event.target.value)
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-right outline-none focus:border-sky-400"
                      />
                    </td>
                    <td className="border border-slate-200 p-2">
                      <input
                        type="date"
                        value={child.birthDate}
                        onChange={(event) =>
                          updateChild(index, "birthDate", event.target.value)
                        }
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-right outline-none focus:border-sky-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="ח. בקשה לפטור או זיכוי ממס">
          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxField
              label="אני תושב/ת ישראל"
              checked={form.taxCredits.resident}
              onChange={(value) => updateTaxCredit("resident", value)}
            />
            <CheckboxField
              label="אני נכה 100% / עיוור/ת לצמיתות"
              checked={form.taxCredits.disabled100}
              onChange={(value) => updateTaxCredit("disabled100", value)}
            />
            <CheckboxField
              label="אני תושב/ת יישוב מזכה"
              checked={form.taxCredits.settlement}
              onChange={(value) => updateTaxCredit("settlement", value)}
            />
            <CheckboxField
              label="אני עולה חדש/ה"
              checked={form.taxCredits.newImmigrant}
              onChange={(value) => updateTaxCredit("newImmigrant", value)}
            />
            <CheckboxField
              label="בן/בת זוג ללא הכנסה"
              checked={form.taxCredits.spouseNoIncome}
              onChange={(value) => updateTaxCredit("spouseNoIncome", value)}
            />
            <CheckboxField
              label="הורה במשפחה חד הורית"
              checked={form.taxCredits.singleParent}
              onChange={(value) => updateTaxCredit("singleParent", value)}
            />
            <CheckboxField
              label="ילדים בחזקתי"
              checked={form.taxCredits.childrenCustody}
              onChange={(value) => updateTaxCredit("childrenCustody", value)}
            />
            <CheckboxField
              label="ילד עם מוגבלות"
              checked={form.taxCredits.specialChild}
              onChange={(value) => updateTaxCredit("specialChild", value)}
            />
            <CheckboxField
              label="תשלום מזונות"
              checked={form.taxCredits.alimony}
              onChange={(value) => updateTaxCredit("alimony", value)}
            />
            <CheckboxField
              label="חייל/ת משוחרר/ת / שירות לאומי"
              checked={form.taxCredits.soldier}
              onChange={(value) => updateTaxCredit("soldier", value)}
            />
            <CheckboxField
              label="סיום לימודים לתואר אקדמי"
              checked={form.taxCredits.academic}
              onChange={(value) => updateTaxCredit("academic", value)}
            />
            <CheckboxField
              label="סיום לימודי מקצוע / תעודה"
              checked={form.taxCredits.diploma}
              onChange={(value) => updateTaxCredit("diploma", value)}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <TextInput
              label="שם יישוב מזכה"
              value={form.taxCredits.settlementName}
              onChange={(value) => updateTaxCredit("settlementName", value)}
            />
            <TextInput
              label="תאריך תחילת מגורים ביישוב"
              type="date"
              value={form.taxCredits.settlementDate}
              onChange={(value) => updateTaxCredit("settlementDate", value)}
            />
            <TextInput
              label="ילדים שנולדו בשנת המס"
              value={form.taxCredits.childrenBornThisYear}
              onChange={(value) =>
                updateTaxCredit("childrenBornThisYear", value)
              }
            />
            <TextInput
              label="ילדים בגיל 1 עד 5"
              value={form.taxCredits.childrenAgeOneToFive}
              onChange={(value) =>
                updateTaxCredit("childrenAgeOneToFive", value)
              }
            />
            <TextInput
              label="ילדים בגיל 6 עד 17"
              value={form.taxCredits.childrenAgeSixToSeventeen}
              onChange={(value) =>
                updateTaxCredit("childrenAgeSixToSeventeen", value)
              }
            />
            <TextInput
              label="ילדים בגיל 18"
              value={form.taxCredits.childrenAgeEighteen}
              onChange={(value) =>
                updateTaxCredit("childrenAgeEighteen", value)
              }
            />
          </div>
        </Section>

        <Section title="ט. תיאום מס">
          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxField
              label="לא הייתה לי הכנסה מתחילת שנת המס עד תחילת עבודתי"
              checked={form.taxCredits.noIncomeThisYear}
              onChange={(value) => updateTaxCredit("noIncomeThisYear", value)}
            />
            <CheckboxField
              label="יש לי הכנסות נוספות לצורך תיאום מס"
              checked={form.taxCredits.hasOtherIncomeForTaxCoordination}
              onChange={(value) =>
                updateTaxCredit("hasOtherIncomeForTaxCoordination", value)
              }
            />
          </div>
        </Section>

        <Section
          title="י. הצהרה"
          subtitle="בלחיצה על שליחת הטופס המערכת תייצר PDF על גבי הטופס הרשמי."
        >
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
            אני מצהיר/ה כי הפרטים שמסרתי בטופס זה מלאים ונכונים. ידוע לי כי
            מסירת פרטים לא נכונים מהווה עבירה על פקודת מס הכנסה. אני מתחייב/ת
            להודיע למעסיק על כל שינוי בפרטים.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextInput
              label="תאריך חתימה"
              type="date"
              value={form.signatureDate}
              onChange={(value) => update("signatureDate", value)}
            />
            <TextInput
              label="חתימה / שם מלא"
              value={form.signatureText}
              onChange={(value) => update("signatureText", value)}
              placeholder="שם מלא לאישור"
            />
          </div>
        </Section>

        <div className="sticky bottom-4 z-20 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">
                סיום מילוי טופס 101
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                לאחר השליחה ייפתח PDF מלא על גבי הטופס המקורי.
              </p>
            </div>

            <button
              type="button"
              onClick={() => submitForm101(form)}
              disabled={submitting}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-sky-600 px-8 text-sm font-black text-white shadow-lg transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "מייצר PDF..." : "שלח טופס וצור PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}