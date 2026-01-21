import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PropertiesPage from './pages/PropertiesPage';
import TenantsPage from './pages/TenantsPage';
import ContractsPage from './pages/ContractsPage';
import ContractDetailPage from './pages/ContractDetailPage';
import AccrualsPage from './pages/AccrualsPage';
import PaymentsPage from './pages/PaymentsPage';
import DepositsPage from './pages/DepositsPage';
import AccountPage from './pages/AccountPage';
import AccountsPage from './pages/AccountsPage';
import ForecastPage from './pages/ForecastPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/accruals" element={<AccrualsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/deposits" element={<DepositsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<div className="text-2xl font-bold">Настройки (в разработке)</div>} />
          <Route path="/help" element={<div className="text-2xl font-bold">Помощь (в разработке)</div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
