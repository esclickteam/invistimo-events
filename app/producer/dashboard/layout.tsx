import ProducerDashboardHeader from "@/app/dashboard/ProducerDashboardHeader";


export default function ProducerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProducerDashboardHeader />
      <main className="pt-16">
        {children}
      </main>
    </>
  );
}
