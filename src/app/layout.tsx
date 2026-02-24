import type React from "react";
import PatientContextBar from "@/components/layout/patient-context-bar";
import { SidebarNavigation } from "@/components/layout/sidebar-nav";
import GlobalSearch from "@/components/layout/global-search";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const currentPatient = {
    id: "emma-001",
    name: "Emma Rodriguez",
    ageMonths: 24,
    status: "active" as const,
    riskLevel: "MEDIUM" as const,
    lastScreeningAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PatientContextBar patient={currentPatient} />
      <div className="flex">
        <SidebarNavigation />
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
      <GlobalSearch />
      <Toaster />
    </div>
  );
}

