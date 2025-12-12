export default function RsvpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-[#faf9f6]">
        {children}
      </body>
    </html>
  );
}
