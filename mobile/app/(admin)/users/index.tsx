import { RecordsScreen } from "@/src/records";

export default function AdminUsers() {
  return (
    <RecordsScreen
      title="ניהול משתמשים"
      path="/api/admin/users"
      metaKeys={["email", "phone", "role", "packageName", "hasPaid"]}
      hrefForItem={(item) => `/(admin)/users/${item._id || item.id}` as never}
    />
  );
}
