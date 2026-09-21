import { RecordsScreen } from "@/src/records";

export default function AdminCustomers() {
  return (
    <RecordsScreen
      title="לקוחות"
      path="/api/admin/customers"
      metaKeys={["email", "phone", "packageName", "status", "leadStatus", "venueName"]}
      hrefForItem={(item) => `/(admin)/customers/${item._id || item.id}` as never}
    />
  );
}
