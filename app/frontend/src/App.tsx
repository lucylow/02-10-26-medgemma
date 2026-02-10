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
import Settings from "./pages/Settings";
import Education from "./pages/Education";

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
              <Route path="settings" element={<Settings />} />
              <Route path="education" element={<Education />} />
              <Route path="learn-more" element={<LearnMore />} />
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
