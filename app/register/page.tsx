import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">טוען...</div>}>
      <RegisterForm />
     </Suspense>
  );
}
