import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import AgentsPage from './pages/AgentsPage';
import ProcessesPage from './pages/ProcessesPage';
import IntegrationsPage from './pages/IntegrationsPage';
import PublicTraProfilePage from './pages/PublicTraProfilePage';
import OnboardingPage from './pages/OnboardingPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes — no auth */}
      <Route path="/public/agents/:id/tra-score" element={<PublicTraProfilePage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Authenticated app shell */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="processes" element={<ProcessesPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
      </Route>
    </Routes>
  );
}
