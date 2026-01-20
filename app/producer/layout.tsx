import ProducerDashboardHeader from "@/app/dashboard/ProducerDashboardHeader";

export default function ProducerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProducerDashboardHeader />
      <main className="pt-16 min-h-screen bg-[#faf6f1]">
        {children}
      </main>
    </>
  );
}
