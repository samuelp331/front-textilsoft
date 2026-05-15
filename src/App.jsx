import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RecoverPage } from './pages/RecoverPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { InventoryPage } from './pages/InventoryPage.jsx';
import { ReportsHubPage } from './pages/ReportsHubPage.jsx';
import { MovementsReportPage } from './pages/MovementsReportPage.jsx';
import { ConsumptionReportPage } from './pages/ConsumptionReportPage.jsx';
import { AlertsPage } from './pages/AlertsPage.jsx';
import { SuppliersPage } from './pages/SuppliersPage.jsx';
import { AdminPage } from './pages/AdminPage.jsx';

function ProtectedRoute({ children, pageId }) {
  const { user, hasPageAccess } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!hasPageAccess(pageId)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const publicPaths = ['/login', '/recover', '/reset-password'];
  const isPublic = publicPaths.includes(location.pathname);

  if (user && isPublic && location.pathname !== '/reset-password') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recover" element={<RecoverPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute pageId="dashboardPage">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute pageId="profilePage">
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute pageId="productPage">
            <InventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute pageId="reportsPage">
            <ReportsHubPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/movements"
        element={
          <ProtectedRoute pageId="inventoryMovementsPage">
            <MovementsReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/consumption"
        element={
          <ProtectedRoute pageId="consumptionReportPage">
            <ConsumptionReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute pageId="alertsPage">
            <AlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute pageId="suppliersPage">
            <SuppliersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute pageId="adminPage">
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
