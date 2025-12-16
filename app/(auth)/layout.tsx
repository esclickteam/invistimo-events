// app/(auth)/layout.tsx
"use client";

import Providers from "../providers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
