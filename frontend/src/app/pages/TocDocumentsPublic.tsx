import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LogIn, Eye, Download, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../../lib/api';


type TocDocument = {
  _id: string;
  title: string;
  level: string;
  college: string;
  fileUrl: string;
  fileName: string;
  assignmentName?: string;
};

type TrainerInfo = {
  name: string;
  college: string;
  level: string;
  assignmentName?: string;
};

export default function TocDocumentsPublic() {
  const [searchParams] = useSearchParams();
  const trainerId = searchParams.get('trainerId');

  const { isAuthenticated, user, login, logout, loading } = useAuth();

  // State for password-less trainer view (trainerId in URL)
  const [trainerDocs, setTrainerDocs] = useState<TocDocument[]>([]);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);
  const [trainerFetching, setTrainerFetching] = useState(false);
  const [trainerError, setTrainerError] = useState('');

  // State for authenticated (logged-in) trainer view
  const [authDocs, setAuthDocs] = useState<TocDocument[]>([]);
  const [fetchError, setFetchError] = useState('');
  const [fetching, setFetching] = useState(false);

  // State for login form
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If trainerId in URL → fetch docs without login
  useEffect(() => {
    if (!trainerId) return;

    const fetchByTrainer = async () => {
      try {
        setTrainerFetching(true);
        setTrainerError('');
        const res = await fetch(`${API_URL}/toc/by-trainer/${trainerId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setTrainerError(data?.message || 'Trainer not found.');
          return;
        }
        const data = await res.json();
        setTrainerDocs(data.docs || []);
        setTrainerInfo(data.trainer || null);
      } catch {
        setTrainerError('Failed to load TOC documents. Please try again.');
      } finally {
        setTrainerFetching(false);
      }
    };

    fetchByTrainer();
  }, [trainerId]);

  // If authenticated via login → fetch docs with token
  useEffect(() => {
    if (isAuthenticated && !trainerId) {
      fetchAuthDocs();
    }
  }, [isAuthenticated]);

  const fetchAuthDocs = async () => {
    try {
      setFetching(true);
      setFetchError('');
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/toc`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFetchError(data?.message || 'Unable to load TOC documents.');
        return;
      }
      setAuthDocs(await res.json());
    } catch {
      setFetchError('Failed to load TOC documents.');
    } finally {
      setFetching(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError('');
    const result = await login(usernameOrEmail, password);
    if (!result.success) setLoginError(result.error || 'Login failed.');
    setSubmitting(false);
  };

  const handleLogout = () => {
    logout();
    setAuthDocs([]);
    setUsernameOrEmail('');
    setPassword('');
    setLoginError('');
    setFetchError('');
  };

  // ── Trainer view via URL param (no login required) ────────────────────────
  if (trainerId) {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 text-white">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-900">TOC Documents</h1>
                {trainerInfo && (
                  <p className="text-sm text-zinc-500">
                    {trainerInfo.name} · {trainerInfo.college} · {trainerInfo.level}
                    {trainerInfo.assignmentName && ` · ${trainerInfo.assignmentName}`}
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 self-start"
            >
              ← Back to Submission
            </Link>
          </div>

          {trainerError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
              {trainerError}
            </div>
          )}

          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            {trainerFetching ? (
              <p className="text-zinc-600">Loading your TOC documents...</p>
            ) : trainerDocs.length === 0 ? (
              <div className="text-zinc-600">
                <p className="mb-2">No TOC documents are available for your assigned level.</p>
                <p className="text-sm text-zinc-500">Please contact your admin.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trainerDocs.map((doc) => (
                  <DocCard key={doc._id} doc={doc} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading session check ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-600">Checking your session...</p>
      </div>
    );
  }

  // ── Not authenticated → show login form ───────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full bg-white border border-zinc-200 p-10 rounded-3xl shadow-sm">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 text-white mx-auto mb-6">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-semibold text-zinc-900 mb-2 text-center">Trainer TOC Login</h1>
          <p className="text-zinc-500 mb-6 text-center text-sm">
            Sign in to view your TOC documents, or go back to the submission form where your documents load automatically after selecting your name.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Email, Username or Phone</label>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-zinc-300 rounded-md bg-white text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-700 mb-2">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-zinc-300 rounded-md bg-white text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            {loginError && <p className="text-sm text-red-600">{loginError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2 text-sm text-zinc-500">
            <p>
              <Link to="/" className="text-zinc-900 hover:underline">
                ← Back to Submission Form
              </Link>
            </p>
            <p>
              Admin?{' '}
              <Link to="/admin/login" className="text-zinc-900 hover:underline">
                Admin Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated trainer view ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">TOC Documents</h1>
            <p className="text-zinc-600">Documents matching your assigned level.</p>
            <p className="text-sm text-zinc-500">Level: {user?.allottedLevel || 'Not assigned'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Logout
            </button>
            <Link
              to="/"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {fetchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">
            {fetchError}
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-2xl p-6">
          {fetching ? (
            <p className="text-zinc-600">Loading your TOC documents...</p>
          ) : authDocs.length === 0 ? (
            <div className="text-zinc-600">
              <p className="mb-2">No TOC documents available for your assigned level.</p>
              <p className="text-sm text-zinc-500">Please contact your admin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {authDocs.map((doc) => (
                <DocCard key={doc._id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- SHARED DOC CARD ---------- */

function DocCard({ doc }: { doc: TocDocument }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-zinc-900">{doc.title}</p>
          <p className="text-sm text-zinc-500">Level: {doc.level} · College: {doc.college}</p>
          {doc.assignmentName && (
            <p className="text-sm text-zinc-400">Assignment: {doc.assignmentName}</p>
          )}
          <p className="text-sm text-zinc-500">File: {doc.fileName}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-200"
          >
            <Eye className="w-4 h-4" />
            Preview
          </a>
          <a
            href={doc.fileUrl}
            download={doc.fileName}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
