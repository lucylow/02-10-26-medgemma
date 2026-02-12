import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScreeningProvider } from "./contexts/ScreeningContext";
import { initializeAccessibility } from "@/components/pediscreen/AccessibilityBar";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PediScreenLayout from "./components/pediscreen/PediScreenLayout";
import PediScreenHome from "./pages/PediScreenHome";
import ScreeningScreen from "./pages/ScreeningScreen";
import ResultsScreen from "./pages/ResultsScreen";
import ScreeningHistory from "./pages/ScreeningHistory";
import Profiles from "./pages/Profiles";
import Settings from "./pages/Settings";
import Education from "./pages/Education";
import LearnMore from "./pages/LearnMore";
import RadiologyQueue from "./pages/RadiologyQueue";
import TechnicalWriter from "./pages/TechnicalWriter";
import DetailedReportEditor from "./pages/DetailedReportEditor";
import ClinicianDashboard from "./pages/ClinicianDashboard";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initializeAccessibility();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ScreeningProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/clinician" element={<ClinicianDashboard />} />
            <Route path="/pediscreen" element={<PediScreenLayout />}>
              <Route index element={<PediScreenHome />} />
              <Route path="screening" element={<ScreeningScreen />} />
              <Route path="results" element={<ResultsScreen />} />
              <Route path="history" element={<ScreeningHistory />} />
              <Route path="profiles" element={<Profiles />} />
              <Route path="settings" element={<Settings />} />
              <Route path="education" element={<Education />} />
              <Route path="learn-more" element={<LearnMore />} />
              <Route path="radiology" element={<RadiologyQueue />} />
              <Route path="technical-writer" element={<TechnicalWriter />} />
              <Route path="report/:reportId" element={<DetailedReportEditor />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ScreeningProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
