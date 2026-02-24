import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScreeningProvider } from "./contexts/ScreeningContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PediScreenLayout from "./components/pediscreen/PediScreenLayout";
import PediScreenHome from "./pages/PediScreenHome";
import ScreeningScreen from "./pages/ScreeningScreen";
import ResultsScreen from "./pages/ResultsScreen";
import ScreeningHistory from "./pages/ScreeningHistory";
import LearnMore from "./pages/LearnMore";
import Profiles from "./pages/Profiles";
import ChildProfileDetail from "./pages/pediscreen/ChildProfileDetail";
import Settings from "./pages/Settings";
import Education from "./pages/Education";
import Monitoring from "./pages/Monitoring";
import TechnicalWriter from "./pages/TechnicalWriter";
import ParentPortal from "./pages/ParentPortal";
import ClinicianReview from "./pages/ClinicianReview";
import Wearables from "./pages/Wearables";
import TeamManagement from "./pages/TeamManagement";
import OnboardingWizard from "./pages/OnboardingWizard";
import AdminPanel from "./pages/AdminPanel";
import Agents from "./pages/Agents";
import CT3DEdge from "./pages/CT3DEdge";
import VirtualAssistants from "./pages/VirtualAssistants";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ScreeningProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* PediScreen AI with shared layout */}
            <Route path="/pediscreen" element={<PediScreenLayout />}>
              <Route index element={<PediScreenHome />} />
              <Route path="screening" element={<ScreeningScreen />} />
              <Route path="results" element={<ResultsScreen />} />
              <Route path="history" element={<ScreeningHistory />} />
              <Route path="profiles" element={<Profiles />} />
              <Route path="profiles/:childId" element={<ChildProfileDetail />} />
              <Route path="parent-portal" element={<ParentPortal />} />
              <Route path="clinician-review" element={<ClinicianReview />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="wearables" element={<Wearables />} />
              <Route path="team" element={<TeamManagement />} />
              <Route path="onboarding" element={<OnboardingWizard />} />
              <Route path="admin" element={<AdminPanel />} />
              <Route path="agents" element={<Agents />} />
              <Route path="virtual-assistants" element={<VirtualAssistants />} />
              <Route path="ct-3d" element={<CT3DEdge />} />
              <Route path="settings" element={<Settings />} />
              <Route path="education" element={<Education />} />
              <Route path="learn-more" element={<LearnMore />} />
              <Route path="technical-writer" element={<TechnicalWriter />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ScreeningProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
