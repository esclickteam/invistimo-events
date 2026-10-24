import Link from "next/link";
import { NOINDEX } from "@/lib/seo/site";

export const metadata = {
  ...NOINDEX,
  title: { absolute: "העמוד לא נמצא | Invistimo" },
};

export default function NotFound() {
  return (
    {/* Landmark <main> lives in LayoutShell when wrapped; keep a single landmark root. */}
    <div dir="rtl" className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-24 text-center text-[#3F3025]">
      <h1 className="text-4xl font-black">העמוד לא נמצא</h1>
      <p className="mt-4 leading-8 text-[#5C4A3A]">
        הכתובת לא קיימת. אם קיבלתם קישור מאורח או מהודעה, בדקו שהוא הועתק במלואו.
      </p>
      <Link href="/" className="mt-8 inline-flex rounded-full bg-[#3A2B22] px-6 py-3 font-black text-white">
        חזרה לדף הבית
      </Link>
    </div>
  );
}
