import { Suspense } from "react";

export default function EventProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#7C6A58]">
          טוען נתוני אירוע…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
