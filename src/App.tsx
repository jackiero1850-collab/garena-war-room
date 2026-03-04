import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DailyInput from "@/pages/DailyInput";
import UserManagement from "@/pages/UserManagement";
import TeamRoster from "@/pages/TeamRoster";
import SystemSettings from "@/pages/SystemSettings";
import Settings from "@/pages/Settings";
import Assignments from "@/pages/Assignments";
import GraphicBriefs from "@/pages/GraphicBriefs";
import Resources from "@/pages/Resources";
import TeamPerformance from "@/pages/TeamPerformance";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, managerOnly }: { children: React.ReactNode; managerOnly?: boolean }) => {
  const { user, loading, role } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (managerOnly && role !== "manager") return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/daily-input" element={<ProtectedRoute><DailyInput /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute managerOnly><UserManagement /></ProtectedRoute>} />
            <Route path="/roster" element={<ProtectedRoute managerOnly><TeamRoster /></ProtectedRoute>} />
            <Route path="/system-settings" element={<ProtectedRoute managerOnly><SystemSettings /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
            <Route path="/briefs" element={<ProtectedRoute><GraphicBriefs /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
            <Route path="/team-performance" element={<ProtectedRoute><TeamPerformance /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
