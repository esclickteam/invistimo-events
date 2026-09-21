import { RecordsScreen } from "@/src/records";

export default function CallRecordings() {
  return (
    <RecordsScreen
      title="הקלטות שיחות"
      path="/api/admin/call-recordings"
      metaKeys={["clientName", "employeeName", "createdAt", "duration", "status"]}
    />
  );
}
