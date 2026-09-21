import { RecordsScreen } from "@/src/records";

export default function StaffShifts() {
  return (
    <RecordsScreen
      title="המשמרות שלי"
      path="/api/employee/shifts"
      metaKeys={["date", "startTime", "endTime", "location", "hallName"]}
    />
  );
}
