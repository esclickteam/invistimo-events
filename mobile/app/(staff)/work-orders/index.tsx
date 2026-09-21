import { RecordsScreen } from "@/src/records";

export default function WorkOrders() {
  return (
    <RecordsScreen
      title="הוראות עבודה"
      path="/api/employee/work-orders"
      metaKeys={["status", "eventName", "clientName", "roundNumber", "createdAt"]}
      hrefForItem={(item) => `/(staff)/work-orders/${item._id || item.id}` as never}
    />
  );
}
