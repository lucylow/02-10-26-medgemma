import type React from "react";
import RootLayout from "../layout";

export default function MedicalAppLayout({ children }: { children: React.ReactNode }) {
  return <RootLayout>{children}</RootLayout>;
}

