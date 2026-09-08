import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        if (result.isPlatformAdmin) {
          navigate('/platform/tenants');
        } else {
          navigate('/tenant/dashboard');
        }
      } else {
        setError('Invalid username or password');
      }
    } catch {
      setError('Connection error. Make sure OFBiz is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glass-card">
        <div className="login-header">
          <div className="login-icon">
            <Truck />
          </div>
          <h1 className="login-title">Fleet Parts</h1>
          <p className="login-subtitle">Heavy Equipment Inventory Platform</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <div className="login-form-group">
            <label className="login-label">Username</label>
            <input
              type="text"
              className="login-input"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              required
              autoFocus
            />
          </div>

          <div className="login-form-group">
            <label className="login-label">Password</label>
            <input
              type="password"
              className="login-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="login-spinner" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-hint">Demo: admin / ofbiz</p>
        </div>
      </div>
    </div>
  );
}
