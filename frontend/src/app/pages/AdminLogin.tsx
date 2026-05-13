import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'trainer' ? '/toc' : '/admin/dashboard'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900 text-white mb-4">
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-2xl text-red-900 mb-2 ">Admin Login</h1>
          <p className="text-zinc-600">Access the trainer management portal</p>
        </div>

        <div className="bg-white border border-zinc-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Email, Username or Phone</label>
              <input
                type="text"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email, username or phone"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-700 mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:cursor-not-allowed"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-900 text-white py-3 hover:bg-red-700/90 transition-colors disabled:bg-zinc-600 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-200">
            <p className="text-sm text-zinc-600 text-center">
              Use your registered trainer credentials to login
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
