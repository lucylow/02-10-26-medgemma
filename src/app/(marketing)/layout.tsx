import type React from "react";
import RootLayout from "../layout";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <RootLayout>{children}</RootLayout>;
}

