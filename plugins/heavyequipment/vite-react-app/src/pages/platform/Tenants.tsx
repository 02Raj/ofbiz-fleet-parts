import React, { useEffect, useState } from 'react';
import { ofbizFetch } from '../../api/client';
import type { Tenant, TenantOnboardResult } from '../../api/types';
import { ShieldPlus, KeyRound, Copy, CheckCircle } from 'lucide-react';

export const TenantsManagement: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // Onboard new tenant form
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset / fix admin for existing tenant (separate state!)
  const [resetTenantId, setResetTenantId] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [result, setResult] = useState<TenantOnboardResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTenants = () => {
    setLoading(true);
    ofbizFetch<Tenant[]>('/tenants?action=list')
      .then(data => setTenants(Array.isArray(data) ? data : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  useEffect(() => {
    if (tenantId && !adminUsername) {
      setAdminUsername(tenantId.toLowerCase() + '_admin');
    }
  }, [tenantId, adminUsername]);

  useEffect(() => {
    if (resetTenantId && !resetUsername) {
      setResetUsername(resetTenantId.toLowerCase() + '_admin');
    }
  }, [resetTenantId, resetUsername]);

  const createTenant = () => {
    setCreating(true);
    setResult(null);
    setCopied(false);
    const params = new URLSearchParams({
      action: 'create',
      tenantId,
      tenantName,
      adminUsername: adminUsername || tenantId.toLowerCase() + '_admin',
      adminPassword,
      adminFirstName: adminFirstName || 'Tenant',
      adminLastName: adminLastName || 'Admin',
    });
    if (adminEmail) params.set('adminEmail', adminEmail);

    ofbizFetch<TenantOnboardResult>(`/tenants?${params}`, { method: 'POST' })
      .then(data => {
        setResult(data);
        if (data.success) {
          fetchTenants();
          setTenantId(''); setTenantName(''); setAdminUsername('');
          setAdminPassword(''); setAdminFirstName(''); setAdminLastName(''); setAdminEmail('');
        }
      })
      .catch(err => setResult({ error: err.message }))
      .finally(() => setCreating(false));
  };

  const resetAdminPassword = () => {
    setResetting(true);
    setResult(null);
    setCopied(false);
    const params = new URLSearchParams({
      action: 'resetPassword',
      tenantId: resetTenantId,
      adminPassword: resetPassword,
    });
    if (resetUsername) params.set('adminUsername', resetUsername);

    ofbizFetch<TenantOnboardResult>(`/tenants?${params}`, { method: 'POST' })
      .then(data => {
        setResult(data);
        if (data.success) fetchTenants();
      })
      .catch(err => setResult({ error: err.message }))
      .finally(() => setResetting(false));
  };

  const quickReset = (tid: string, uname: string) => {
    setResetTenantId(tid);
    setResetUsername(uname);
    setResetPassword('ofbiz');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const copyCredentials = () => {
    if (!result?.adminUser) return;
    const text = `Tenant: ${result.tenantName || result.tenantId}\nUsername: ${result.adminUser.userLoginId}\nPassword: ${result.adminUser.temporaryPassword}\nLogin: http://localhost:5173/heavyequipment/vite-react-app/#/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' };
  const labelStyle = { display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' };

  return (
    <div>
      <h2 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>Tenant Administration</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Onboard tenants with admin credentials. <strong>Save the password you set</strong> — it is required for tenant login.
      </p>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        <div className="ui-card" style={{ flex: '2 1 400px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem' }}>Active Tenants</h3>
          {loading ? <p>Loading...</p> : tenants.length === 0 ? (
            <p className="text-muted">No tenants yet.</p>
          ) : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem' }}>Tenant ID</th>
                  <th style={{ padding: '0.75rem' }}>Company</th>
                  <th style={{ padding: '0.75rem' }}>Admin User</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.tenantId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{t.tenantId}</td>
                    <td style={{ padding: '0.75rem' }}>{t.tenantName}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {t.adminUsers?.length ? t.adminUsers.map(a => (
                        <div key={a.userLoginId}>
                          <code>{a.userLoginId}</code>
                          {a.enabled === 'N' && <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>(disabled)</span>}
                        </div>
                      )) : (
                        <span style={{ color: '#b45309' }}>No admin linked</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {t.adminUsers?.[0] && (
                        <button
                          onClick={() => quickReset(t.tenantId, t.adminUsers![0].userLoginId)}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff' }}>
                          Reset Password
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ui-card" style={{ flex: '1 1 320px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Onboard New Tenant</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Creates tenant + admin account in one step</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>Company</div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Tenant ID *</label>
                <input value={tenantId} onChange={e => setTenantId(e.target.value.toUpperCase())} placeholder="ABC_FLEET" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Company Name *</label>
                <input value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="ABC Fleet Company" style={inputStyle} />
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#92400e', marginBottom: '0.5rem' }}>Tenant Admin Login</div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Username *</label>
                <input value={adminUsername} onChange={e => setAdminUsername(e.target.value.toLowerCase())} placeholder="abc_fleet_admin" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={labelStyle}>Password * (remember this!)</label>
                <input type="text" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="ofbiz" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>First Name</label>
                  <input value={adminFirstName} onChange={e => setAdminFirstName(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Last Name</label>
                  <input value={adminLastName} onChange={e => setAdminLastName(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            <button onClick={createTenant} disabled={creating || !tenantId || !tenantName || !adminPassword}
              style={{ padding: '0.75rem', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <ShieldPlus className="w-4 h-4" />
              {creating ? 'Provisioning...' : 'Provision Tenant + Admin'}
            </button>
          </div>
        </div>
      </div>

      {/* Reset Password Section */}
      <div className="ui-card" style={{ marginTop: '1.5rem', border: '2px solid #fde68a' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e' }}>
          <KeyRound className="w-4 h-4" /> Fix Login — Reset Admin Password
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Login failing? User exists but password was forgotten? Use this to set a <strong>new known password</strong> for an existing tenant admin (e.g. <code>xyz_logistics_admin</code>).
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Tenant ID *</label>
            <input value={resetTenantId} onChange={e => { setResetTenantId(e.target.value.toUpperCase()); setResetUsername(''); }}
              placeholder="XYZ_LOGISTICS" style={{ ...inputStyle, width: '180px' }} />
          </div>
          <div>
            <label style={labelStyle}>Admin Username</label>
            <input value={resetUsername} onChange={e => setResetUsername(e.target.value.toLowerCase())}
              placeholder="xyz_logistics_admin" style={{ ...inputStyle, width: '200px' }} />
          </div>
          <div>
            <label style={labelStyle}>New Password *</label>
            <input type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
              placeholder="ofbiz" style={{ ...inputStyle, width: '150px' }} />
          </div>
          <button onClick={resetAdminPassword} disabled={resetting || !resetTenantId || !resetPassword}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#b45309', color: '#fff', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer' }}>
            {resetting ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: result.error ? '#fee2e2' : '#ecfdf5', border: `1px solid ${result.error ? '#fecaca' : '#a7f3d0'}` }}>
          {result.error ? (
            <p style={{ color: '#991b1b', margin: 0 }}>{result.error}</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#166534' }}>
                <CheckCircle className="w-5 h-5" />
                <strong>{result.message}</strong>
              </div>
              {result.adminUser && (
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '1rem' }}>Login Credentials — save these now:</p>
                  <table style={{ width: '100%', background: '#f0fdf4', borderRadius: '6px' }}>
                    <tbody>
                      <tr><td style={{ padding: '0.5rem 0.75rem', color: '#64748b', width: '100px' }}>Tenant</td><td style={{ padding: '0.5rem' }}><strong>{result.tenantName || result.tenantId}</strong></td></tr>
                      <tr><td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>Username</td><td style={{ padding: '0.5rem' }}><code style={{ fontSize: '1.1rem' }}>{result.adminUser.userLoginId}</code></td></tr>
                      <tr><td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>Password</td><td style={{ padding: '0.5rem' }}><code style={{ fontSize: '1.1rem', color: '#166534' }}>{result.adminUser.temporaryPassword}</code></td></tr>
                    </tbody>
                  </table>
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>{result.loginInstructions}</p>
                  <button onClick={copyCredentials} style={{ marginTop: '0.75rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc' }}>
                    <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy Credentials'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
