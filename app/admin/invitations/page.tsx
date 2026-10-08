export default function AdminInvitationsPage() {
  return (
    <div dir="rtl" className="space-y-3">
      <p className="text-xs font-medium text-[var(--admin-muted)]">
        ניהול אירועים מרכזי — הנתונים זמינים גם דרך משתמשים ותיקי לקוח
      </p>
      <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-6 text-sm font-semibold text-[var(--admin-muted)] shadow-[var(--admin-shadow)]">
        מסך זה ישמש לניהול אירועים מרוכז. כרגע ניתן לנהל אירועים דרך דף המשתמשים
        או כניסת ניהול כאדמין לחשבון הלקוח.
      </div>
    </div>
  );
}
