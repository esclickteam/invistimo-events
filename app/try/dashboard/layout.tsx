import DashboardLayout from "@/app/dashboard/layout";
import DemoExperience from "@/components/demo/DemoExperience";

export default function TryDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoExperience>
      <DashboardLayout>{children}</DashboardLayout>
    </DemoExperience>
  );
}
