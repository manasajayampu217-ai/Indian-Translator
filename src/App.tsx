import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClerkLoginPage from "./components/ClerkLoginPage";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SignedOut>
          <ClerkLoginPage />
        </SignedOut>
        <SignedIn>
          <AuthenticatedApp />
        </SignedIn>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

function AuthenticatedApp() {
  const { user } = useUser();

  const handleLogout = () => {
    // Clerk handles logout via UserButton
  };

  const userData = {
    email: user?.primaryEmailAddress?.emailAddress || '',
    name: user?.fullName || user?.firstName || 'User',
  };

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Index user={userData} onLogout={handleLogout} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
