import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, Wrench, LogOut, FileText, Users, Boxes } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/layout.css';

export const TenantAppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout-container">
      {/* Tenant Sidebar */}
      <aside className="layout-sidebar">
        <div className="sidebar-header">
          <Truck className="w-6 h-6 text-primary-500" />
          {user?.tenantName || 'Fleet Operations'}
        </div>
        <nav className="sidebar-nav">
          <NavLink 
            to="/tenant/dashboard" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>
          
          <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-gray-500)', fontWeight: 600 }}>
            Operations
          </div>
          
          <NavLink 
            to="/tenant/parts" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Boxes className="w-5 h-5" />
            Parts Master
          </NavLink>
          <NavLink 
            to="/tenant/equipment" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Truck className="w-5 h-5" />
            Equipment
          </NavLink>
          <NavLink 
            to="/tenant/inventory" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Package className="w-5 h-5" />
            Inventory
          </NavLink>
          
          <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-gray-500)', fontWeight: 600 }}>
            Procurement
          </div>
          
          <NavLink 
            to="/tenant/purchase-orders" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <FileText className="w-5 h-5" />
            Purchase Orders
          </NavLink>
          <NavLink 
            to="/tenant/suppliers" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users className="w-5 h-5" />
            Suppliers
          </NavLink>

          <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-gray-500)', fontWeight: 600 }}>
            Maintenance
          </div>
          <NavLink 
            to="/tenant/work-orders" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Wrench className="w-5 h-5" />
            Work Orders
          </NavLink>

        </nav>
      </aside>

      {/* Main Content */}
      <div className="layout-content-wrapper">
        <header className="layout-topbar">
          <div className="topbar-left">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Business Portal</h2>
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.displayName || 'User'}</span>
            <button 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-gray-600)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>
        
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
