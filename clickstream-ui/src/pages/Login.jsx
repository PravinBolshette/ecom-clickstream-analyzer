import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API || 'http://localhost:4000';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('clickstream123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      sessionStorage.setItem('clickstream_token', data.token);
      sessionStorage.setItem('clickstream_user', data.username || username);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      <section className="login-hero-pane">
        <div className="login-hero-content">
          <div className="logo-badge">Hadoop + MapReduce</div>
          <h1 className="login-brand">Clickstream</h1>
          <p className="login-tagline">
            E-commerce log analysis on a Hadoop cluster.
          </p>
          <div className="login-pills">
            <span className="pill pill-view">2M Events</span>
            <span className="pill pill-cart">11 HDFS Splits</span>
            <span className="pill pill-buy">YARN Streaming</span>
          </div>
        </div>
      </section>

      <section className="login-form-pane">
        <div className="login-card">
          <header className="login-card-header">
            <h2>Sign in to continue</h2>
            <p className="sub">Access real-time cluster metrics and user funnel telemetry.</p>
          </header>

          {error && (
            <div className="login-error-banner" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Authenticating…' : 'Sign in'}
            </button>
          </form>

          <footer className="login-card-footer">
            <p className="demo-credentials-note">
              <strong>Demo credentials:</strong> <code>admin</code> / <code>clickstream123</code>
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}
