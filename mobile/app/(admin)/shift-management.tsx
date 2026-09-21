import { RecordsScreen } from "@/src/records";

export default function ShiftManagement() {
  return (
    <RecordsScreen
      title="ניהול משמרת"
      path="/api/admin/shift-management"
      metaKeys={["softphone.status", "shift.active", "email", "role"]}
      emptyText="אין עובדים במשמרת."
    />
  );
}
