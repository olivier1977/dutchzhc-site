import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import AgentsPage from './pages/AgentsPage';
import ProcessesPage from './pages/ProcessesPage';
import IntegrationsPage from './pages/IntegrationsPage';

export default function App() {
  return (
    <Routes>
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
