
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlatformAdminLayout } from './components/layout/PlatformAdminLayout';
import { TenantAppLayout } from './components/layout/TenantAppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/tenant/Dashboard';
import { EquipmentDirectory } from './pages/tenant/Equipment';
import { SuppliersList } from './pages/tenant/Suppliers';
import { InventoryManagement } from './pages/tenant/Inventory';
import { PurchaseOrders } from './pages/tenant/PurchaseOrders';
import { WorkOrders } from './pages/tenant/WorkOrders';
import { PartsManagement } from './pages/tenant/Parts';

import { TenantsManagement } from './pages/platform/Tenants';

// Temporary Mock Pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="ui-card">
    <h2>{title}</h2>
    <p className="text-muted">This page is under construction.</p>
  </div>
);

// Protected Route — redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Loading...</div>
          <p>Checking session</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Platform Admin Route — requires admin role
function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user?.isPlatformAdmin) {
    return <Navigate to="/tenant/dashboard" replace />;
  }

  return <>{children}</>;
}

// Smart redirect based on user role
function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.isPlatformAdmin) {
    return <Navigate to="/platform/tenants" replace />;
  }
  
  return <Navigate to="/tenant/dashboard" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Login Route */}
      <Route path="/login" element={
        isAuthenticated ? <RootRedirect /> : <Login />
      } />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Platform Admin Routes — Protected + Admin Only */}
      <Route path="/platform" element={
        <ProtectedRoute>
          <PlatformAdminRoute>
            <PlatformAdminLayout />
          </PlatformAdminRoute>
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<PlaceholderPage title="System Status" />} />
        <Route path="tenants" element={<TenantsManagement />} />
      </Route>

      {/* Tenant (Business User) Routes — Protected */}
      <Route path="/tenant" element={
        <ProtectedRoute>
          <TenantAppLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="parts" element={<PartsManagement />} />
        <Route path="equipment" element={<EquipmentDirectory />} />
        <Route path="inventory" element={<InventoryManagement />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="suppliers" element={<SuppliersList />} />
        <Route path="work-orders" element={<WorkOrders />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
