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
import EndToEndDemo from "./pages/EndToEndDemo";

const queryClient = new QueryClient();

const appRoutes = createRoutesFromElements(
  <>
    <Route element={<MainLayout />}>
      <Route path="/" element={<Index />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/cases" element={<CasesIndex />} />
      <Route path="/cases/:id" element={<CaseDetail />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/signup" element={<Signup />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
    </Route>
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
      <Route path="end2end-demo" element={<EndToEndDemo />} />
      <Route path="report/:reportId" element={<DetailedReportEditor />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </>
);

const defaultRouter = createBrowserRouter(appRoutes);

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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScreeningProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </ScreeningProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
export { appRoutes, createMemoryRouter, createRoutesFromElements };
