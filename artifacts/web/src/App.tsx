import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";

// Pages
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import DataSourcesPage from "@/pages/data-sources";
import FindingsPage from "@/pages/findings";
import FindingDetailPage from "@/pages/finding-detail";
import RecommendationsPage from "@/pages/recommendations";
import RecommendationDetailPage from "@/pages/recommendation-detail";
import OrganizationsPage from "@/pages/organizations";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function GuestLanding() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (user) {
    return <Redirect to="/dashboard" />;
  }
  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={GuestLanding} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/data-sources">
        <ProtectedRoute>
          <DataSourcesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/findings">
        <ProtectedRoute>
          <FindingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/findings/:id">
        <ProtectedRoute>
          <FindingDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/recommendations">
        <ProtectedRoute>
          <RecommendationsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/recommendations/:id">
        <ProtectedRoute>
          <RecommendationDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/organizations">
        <ProtectedRoute>
          <OrganizationsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
