import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useEffect } from 'react';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from "./components/AppLayout";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Grupos from "./pages/Grupos";
import Chatbot from "./pages/Chatbot";
import Alertas from "./pages/Alertas";
import Scorecard from "./pages/Scorecard";
import Relatorios from "./pages/Relatorios";
import Central from "./pages/Central";
import Reunioes from "./pages/Reunioes";
import Fluxos from "./pages/Fluxos";
import Contacts from "./pages/Contacts";
import Orders from "./pages/Orders";
import WhatsAppSetup from "./pages/WhatsAppSetup";
import WhatsAppConnect from "./pages/WhatsAppConnect";
import Issues from "./pages/Issues";
import Tags from "./pages/Tags";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => document.documentElement.classList.toggle('dark', e.matches);
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Chat />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/grupos" element={<Grupos />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/alertas" element={<Alertas />} />
        <Route path="/scorecard" element={<Scorecard />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/central" element={<Central />} />
        <Route path="/reunioes" element={<Reunioes />} />
        <Route path="/fluxos" element={<Fluxos />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/whatsapp-setup" element={<WhatsAppSetup />} />
        <Route path="/whatsapp-connect" element={<WhatsAppConnect />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/tags" element={<Tags />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App