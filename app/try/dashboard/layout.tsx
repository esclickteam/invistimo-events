import DashboardLayout from "@/app/dashboard/layout";

export default function TryDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
