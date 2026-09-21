import { RecordsScreen } from "@/src/records";

export default function AdminWeddingChallengesSales() {
  return (
    <RecordsScreen
      title="Wedding Challenges"
      path="/api/admin/wedding-challenges/sales"
      metaKeys={["email", "phone", "status", "paymentStatus"]}
    />
  );
}
