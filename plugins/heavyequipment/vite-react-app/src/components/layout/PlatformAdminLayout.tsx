
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Settings, Users, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/layout.css';

export const PlatformAdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout-container">
      {/* Platform Admin Sidebar */}
      <aside className="layout-sidebar layout-sidebar-platform">
        <div className="sidebar-header">
          <Shield className="w-6 h-6 text-primary-500" />
          Platform Admin
        </div>
        <nav className="sidebar-nav">
          <NavLink 
            to="/platform/dashboard" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Settings className="w-5 h-5" />
            System Status
          </NavLink>
          <NavLink 
            to="/platform/tenants" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users className="w-5 h-5" />
            Tenants
          </NavLink>

          <div style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-gray-500)', fontWeight: 600 }}>
            Switch View
          </div>
          <NavLink 
            to="/tenant/dashboard" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Settings className="w-5 h-5" />
            Tenant Portal
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="layout-content-wrapper">
        <header className="layout-topbar">
          <div className="topbar-left">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>Global Administration</h2>
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.displayName || 'Admin'}</span>
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
