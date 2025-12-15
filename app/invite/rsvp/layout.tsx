import type { ReactNode } from "react";

export default function InviteRsvpLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-[#f7f3ee] text-[#5c4632]">
        {children}
      </body>
    </html>
  );
}
