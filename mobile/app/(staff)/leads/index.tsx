import { RecordsScreen } from "@/src/records";

export default function StaffLeads() {
  return (
    <RecordsScreen
      title="הלידים שלי"
      path="/api/employee/leads"
      metaKeys={["phone", "email", "status", "source"]}
      hrefForItem={(item) => `/(staff)/leads/${item._id || item.id}` as never}
    />
  );
}
