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
  Navigate,
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
import EdgeDevices from "./pages/EdgeDevices";
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
import InteractiveScreeningDemo from "./pages/InteractiveScreeningDemo";
import AgentPipelineScreen from "./pages/AgentPipelineScreen";
import AgentDashboard from "./pages/AgentDashboard";
import VoiceInputScreen from "./pages/VoiceInputScreen";
import PatientScreening from "./pages/PatientScreening";
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
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import PrivacyPage from "./pages/PrivacyPage";
import HelpPage from "./pages/HelpPage";
import BlockchainKaggleDemo from "./pages/BlockchainKaggleDemo";
import OracleDashboardPage from "./pages/OracleDashboardPage";
import DAOGovernancePage from "./pages/DAOGovernancePage";
import ClinicianReviewWithCollab from "./pages/ClinicianReviewWithCollab";
import PediatricShowcasePage from "./pages/PediatricShowcasePage";
import HumanCenteredPatientsPage from "./pages/HumanCenteredPatientsPage";
import UltraDashboard from "./pages/UltraDashboard";
import { HealthDashboard } from "./components/HealthDashboard";
import MultiAgentHealthDashboard from "./components/MultiAgentHealthDashboard";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ThemeProvider } from "./theme";
import { ThemeProvider as ClinicalTokensProvider } from "./providers/ThemeProvider";
import { AccessiblePediScreenProvider } from "./components/a11y/AccessiblePediScreenProvider";
import GlobalSearch from "./components/layout/global-search";
import { ErrorBoundary } from "./components/ErrorBoundary";
import IoTDashboardPage from "./pages/IoTDashboard";
import { IoTProvider } from "./components/iot";
import IoTMonitoring from "./pages/iot/IoTMonitoring";
import PatientDashboard from "./pages/iot/PatientDashboard";
import DeviceSetup from "./pages/iot/DeviceSetup";

interface RouterFutureConfig {
  v7_startTransition?: boolean;
}

const queryClient = new QueryClient();

const appRoutes = createRoutesFromElements(
  <>
    <Route path="/" element={<Index />} />
    <Route path="/screen" element={<Navigate to="/pediscreen/screening" replace />} />
    <Route element={<MainLayout />}>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/health-dashboard"
        element={
          <ProtectedRoute>
            <HealthDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/iot"
        element={
          <ProtectedRoute>
            <IoTMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/iot/patient"
        element={
          <ProtectedRoute>
            <PatientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/iot/devices"
        element={
          <ProtectedRoute>
            <DeviceSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases"
        element={
          <ProtectedRoute>
            <CasesIndex />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <ProtectedRoute>
            <CaseDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/signup" element={<Signup />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route
        path="/iot-dashboard"
        element={
          <ProtectedRoute>
            <IoTDashboardPage />
          </ProtectedRoute>
        }
      />
    </Route>
    <Route path="/telemetry" element={<Telemetry />} />
    <Route path="/smart/launch" element={<SmartLaunch />} />
    <Route path="/smart/callback" element={<SmartCallback />} />
    <Route path="/clinician" element={<ClinicianDashboard />} />
    <Route path="/clinician/review" element={<RealtimeHitlDashboard />} />
    <Route path="/patients" element={<Navigate to="/pediscreen/patients" replace />} />
    <Route path="/pediscreen" element={<PediScreenLayout />}>
      <Route index element={<PediScreenHome />} />
      <Route path="dashboard" element={<AgentDashboard />} />
      <Route path="agent-pipeline" element={<AgentPipelineScreen />} />
      <Route path="multi-agent-health" element={<MultiAgentHealthDashboard />} />
      <Route path="edge-devices" element={<EdgeDevices />} />
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
      <Route path="demo" element={<InteractiveScreeningDemo />} />
      <Route path="pediatric" element={<PediatricShowcasePage />} />
      <Route path="ultra" element={<UltraDashboard />} />
      <Route path="federated" element={<FederatedLearningPage />} />
      <Route path="blockchain" element={<BlockchainPage />} />
      <Route path="blockchain-dashboard" element={<BlockchainPage />} />
      <Route path="blockchain-kaggle" element={<BlockchainKaggleDemo />} />
      <Route path="oracle-dashboard" element={<OracleDashboardPage />} />
      <Route path="dao" element={<DAOGovernancePage />} />
      <Route path="healthchain" element={<HealthChainPage />} />
      <Route path="integrations" element={<IntegrationsPage />} />
      <Route path="guidelines" element={<GuidelinesPage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="faq" element={<FAQPage />} />
      <Route path="privacy" element={<PrivacyPage />} />
      <Route path="help" element={<HelpPage />} />
      <Route path="report/:reportId" element={<DetailedReportEditor />} />
      <Route path="report/:reportId/collab" element={<ClinicianReviewWithCollab />} />
      <Route path="case/:id" element={<PediScreenCaseDetail />} />
      <Route path="patients" element={<HumanCenteredPatientsPage />} />
      <Route path="patient/:id" element={<PatientScreening />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </>
);

// Use BASE_URL (from Vite base) so client-side routing works when deployed under a subpath (e.g. Lovable)
const routerBasename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") || "/";
const defaultRouter = createBrowserRouter(appRoutes, {
  basename: routerBasename,
  future: { v7_startTransition: true } as any,
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
    <ErrorBoundary>
      <ThemeProvider>
        <ClinicalTokensProvider>
          <QueryClientProvider client={queryClient}>
            <SupabaseAuthProvider>
              <TooltipProvider>
                <AgentProvider>
                  <ScreeningProvider>
                    <AccessiblePediScreenProvider>
                      <IoTProvider>
                        <Toaster />
                        <Sonner />
                        <RouterProvider router={router} />
                      </IoTProvider>
                    </AccessiblePediScreenProvider>
                  </ScreeningProvider>
                </AgentProvider>
              </TooltipProvider>
            </SupabaseAuthProvider>
          </QueryClientProvider>
        </ClinicalTokensProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
export { appRoutes, createMemoryRouter, createRoutesFromElements };
