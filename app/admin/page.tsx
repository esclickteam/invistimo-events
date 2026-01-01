// app/admin/page.tsx
export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6">סקירת מערכת</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminBox title="משתמשים" value="—" />
        <AdminBox title="אירועים פעילים" value="—" />
        <AdminBox title="שירותי שיחות פעילים" value="—" />
      </div>
    </div>
  );
}

function AdminBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm text-center">
      <div className="text-gray-500 mb-2">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
