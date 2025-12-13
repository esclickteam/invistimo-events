import { Suspense } from "react";
import PurchaseSMSClient from "./PurchaseSMSClient";

export default function PurchaseSMSPage() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <PurchaseSMSClient />
    </Suspense>
  );
}
