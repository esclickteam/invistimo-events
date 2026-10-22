import ProducerDashboardHeader from "@/app/dashboard/ProducerDashboardHeader";
import { NOINDEX } from "@/lib/seo/site";

export const metadata = NOINDEX;

export default function EventsLayout({
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
