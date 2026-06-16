import React from "react";
import SoftphoneStatusPanel from "@/app/components/staff/SoftphoneStatusPanel";

export const dynamic = "force-dynamic";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SoftphoneStatusPanel />
      {children}
    </>
  );
}
