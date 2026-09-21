import { RecordsScreen } from "@/src/records";

export default function AdminEmployees() {
  return (
    <RecordsScreen
      title="עובדים"
      path="/api/admin/employees"
      metaKeys={["email", "phone", "role", "staffType", "status"]}
      hrefForItem={(item) => `/(admin)/employees/${item._id || item.id}` as never}
    />
  );
}
