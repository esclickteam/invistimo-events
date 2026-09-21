import { useAuth } from "@/src/auth";
import { RecordDetailScreen } from "@/src/records";
import { openOnWebsite } from "@/src/website";

export default function StaffFile() {
  const { user } = useAuth();
  return (
    <RecordDetailScreen
      path={`/api/admin/employees/${user?._id}/profile`}
      fields={[
        { key: "name", label: "שם" },
        { key: "email", label: "אימייל" },
        { key: "phone", label: "טלפון" },
        { key: "staffType", label: "סוג עובד" },
      ]}
      actions={[
        { label: "מסמכים באתר", onPress: () => void openOnWebsite("/staff/dashboard") },
      ]}
    />
  );
}
