import type { ReactNode } from "react";

export default function InviteRsvpLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-[#faf9f6] text-[#5c4632]">
        {children}
      </body>
    </html>
  );
}
