import { useLocalSearchParams } from "expo-router";
import { RecordDetailScreen } from "@/src/records";

export default function StaffLead() {
  const { leadId } = useLocalSearchParams<{ leadId: string }>();
  return (
    <RecordDetailScreen
      path={`/api/employee/leads/${leadId}`}
      fields={[
        { key: "name", label: "שם" },
        { key: "fullName", label: "שם מלא" },
        { key: "phone", label: "טלפון" },
        { key: "email", label: "אימייל" },
        { key: "status", label: "סטטוס" },
        { key: "notes", label: "הערות" },
      ]}
    />
  );
}
