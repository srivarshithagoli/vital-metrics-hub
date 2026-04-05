import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { FirebaseProvider } from "@/contexts/FirebaseContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Records from "./pages/Records";
import Analytics from "./pages/Analytics";
import ResourceInsights from "./pages/ResourceInsights";
import InfrastructurePlanning from "./pages/InfrastructurePlanning";
import StaffManagement from "./pages/StaffManagement";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <FirebaseProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/records" element={<Records />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/resources" element={<ResourceInsights />} />
                  <Route path="/infrastructure" element={<InfrastructurePlanning />} />
                  <Route path="/staff" element={<StaffManagement />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </FirebaseProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
