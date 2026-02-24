import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import { ScreeningProvider } from "./contexts/ScreeningContext";
import { AgentProvider } from "./contexts/AgentContext";
import { SupabaseAuthProvider } from "./contexts/SupabaseAuthContext";
import { initializeAccessibility } from "@/components/pediscreen/AccessibilityBar";
import { toast } from "sonner";
import { flush, dataURLToFile } from "@/services/offlineQueue";
import { submitScreening } from "@/services/screeningApi";
import MainLayout from "./components/layout/MainLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import CasesIndex from "./pages/cases/CasesIndex";
import CaseDetail from "./pages/cases/CaseDetail";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
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
import RealtimeHitlDashboard from "./pages/RealtimeHitlDashboard";
import EndToEndDemo from "./pages/EndToEndDemo";
import AgentPipelineScreen from "./pages/AgentPipelineScreen";
import AgentDashboard from "./pages/AgentDashboard";
import VoiceInputScreen from "./pages/VoiceInputScreen";
import PediScreenCaseDetail from "./pages/pediscreen/PediScreenCaseDetail";
import ChildProfileDetail from "./pages/pediscreen/ChildProfileDetail";
import Telemetry from "./pages/Telemetry";
import SmartLaunch from "./pages/SmartLaunch";
import SmartCallback from "./pages/SmartCallback";
import FederatedLearningPage from "./pages/FederatedLearningPage";
import BlockchainPage from "./pages/BlockchainPage";
import HealthChainPage from "./pages/HealthChainPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import CT3DEdge from "./pages/CT3DEdge";
import GuidelinesPage from "./pages/GuidelinesPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ThemeProvider } from "./theme";
import { AccessiblePediScreenProvider } from "./components/a11y/AccessiblePediScreenProvider";

const queryClient = new QueryClient();

const appRoutes = createRoutesFromElements(
  <>
    <Route path="/" element={<Index />} />
    <Route element={<MainLayout />}>
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><CasesIndex /></ProtectedRoute>} />
      <Route path="/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/signup" element={<Signup />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
    <Route path="/telemetry" element={<Telemetry />} />
    <Route path="/smart/launch" element={<SmartLaunch />} />
    <Route path="/smart/callback" element={<SmartCallback />} />
    <Route path="/clinician" element={<ClinicianDashboard />} />
    <Route path="/clinician/review" element={<RealtimeHitlDashboard />} />
    <Route path="/pediscreen" element={<PediScreenLayout />}>
      <Route index element={<PediScreenHome />} />
      <Route path="dashboard" element={<AgentDashboard />} />
      <Route path="agent-pipeline" element={<AgentPipelineScreen />} />
      <Route path="voice" element={<VoiceInputScreen />} />
      <Route path="screening" element={<ScreeningScreen />} />
      <Route path="results" element={<ResultsScreen />} />
      <Route path="history" element={<ScreeningHistory />} />
      <Route path="profiles" element={<Profiles />} />
      <Route path="profiles/:childId" element={<ChildProfileDetail />} />
      <Route path="settings" element={<Settings />} />
      <Route path="education" element={<Education />} />
      <Route path="learn-more" element={<LearnMore />} />
      <Route path="radiology" element={<RadiologyQueue />} />
      <Route path="ct-3d" element={<CT3DEdge />} />
      <Route path="technical-writer" element={<TechnicalWriter />} />
      <Route path="end2end-demo" element={<EndToEndDemo />} />
      <Route path="federated" element={<FederatedLearningPage />} />
      <Route path="blockchain" element={<BlockchainPage />} />
      <Route path="blockchain-dashboard" element={<BlockchainPage />} />
      <Route path="healthchain" element={<HealthChainPage />} />
      <Route path="integrations" element={<IntegrationsPage />} />
      <Route path="guidelines" element={<GuidelinesPage />} />
      <Route path="report/:reportId" element={<DetailedReportEditor />} />
      <Route path="case/:id" element={<PediScreenCaseDetail />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </>
);

const defaultRouter = createBrowserRouter(appRoutes, {
  future: { v7_startTransition: true },
});

interface AppProps {
  router?: ReturnType<typeof createMemoryRouter>;
}

const App = ({ router: customRouter }: AppProps = {}) => {
  const router = customRouter ?? defaultRouter;
  useEffect(() => {
    initializeAccessibility();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      const sendPayload = async (payload: {
        childAge: string;
        domain: string;
        observations: string;
        imagePreview?: string | null;
        imageFile?: { name: string } | null;
      }) => {
        let imageFile: File | null = null;
        if (payload.imagePreview) {
          imageFile = dataURLToFile(
            payload.imagePreview,
            payload.imageFile?.name || "upload.jpg"
          );
        }
        await submitScreening({
          childAge: payload.childAge,
          domain: payload.domain,
          observations: payload.observations,
          imageFile,
        });
      };
      flush(sendPayload).then((count) => {
        if (count > 0) toast.success(`${count} screening(s) uploaded`);
      });
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SupabaseAuthProvider>
          <TooltipProvider>
            <AgentProvider>
              <ScreeningProvider>
                <AccessiblePediScreenProvider>
                  <Toaster />
                  <Sonner />
                  <RouterProvider router={router} />
                </AccessiblePediScreenProvider>
              </ScreeningProvider>
            </AgentProvider>
          </TooltipProvider>
        </SupabaseAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
export { appRoutes, createMemoryRouter, createRoutesFromElements };
