import { RecordsScreen } from "@/src/records";

export default function AdminShifts() {
  return (
    <RecordsScreen
      title="שיבוץ משמרות"
      path="/api/admin/employees/shifts"
      metaKeys={["employeeName", "date", "startTime", "endTime", "location"]}
    />
  );
}
