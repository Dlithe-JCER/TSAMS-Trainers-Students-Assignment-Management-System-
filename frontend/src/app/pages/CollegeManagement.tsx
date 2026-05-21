import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Edit2, X, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

type CollegeType = {
  _id: string;
  name: string;
  code: string;
  department?: string;
  location?: string;
  isActive: boolean;
};

const EMPTY_FORM = { name: '', code: '', department: '', location: '' };

export default function CollegeManagement() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate('/admin/dashboard', { replace: true });
  }, [authLoading, isSuperAdmin]);

  const [colleges, setColleges] = useState<CollegeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCollege, setEditingCollege] = useState<CollegeType | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/colleges`, { headers: authHeaders() });
      const data = await res.json();
      setColleges(Array.isArray(data) ? data : []);
    } catch {
      setColleges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) fetchColleges();
  }, [authLoading, isSuperAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Name and code are required');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/colleges`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...form, code: form.code.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create');
      setForm(EMPTY_FORM);
      fetchColleges();
      toast.success('College added');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create college');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollege) return;
    if (!editForm.name.trim() || !editForm.code.trim()) {
      setEditError('Name and code are required');
      return;
    }
    setEditError('');
    setEditSaving(true);
    try {
      const res = await fetch(`${API_URL}/colleges/${editingCollege._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ ...editForm, code: editForm.code.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update');
      setEditingCollege(null);
      fetchColleges();
      toast.success('College updated');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update college');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this college? This cannot be undone.')) return;
    try {
      await fetch(`${API_URL}/colleges/${id}`, { method: 'DELETE', headers: authHeaders() });
      setColleges((prev) => prev.filter((c) => c._id !== id));
      toast.success('College deleted');
    } catch {
      toast.error('Failed to delete college');
    }
  };

  const handleResetAdmin = async (c: CollegeType) => {
    try {
      const res = await fetch(`${API_URL}/colleges/${c._id}/reset-admin`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Admin ready: ${data.email} / dlithe2026`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset admin');
    }
  };

  const handleToggleStatus = async (c: CollegeType) => {
    try {
      const res = await fetch(`${API_URL}/colleges/${c._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setColleges((prev) => prev.map((x) => (x._id === c._id ? data : x)));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (authLoading) return null;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl text-red-700 mb-1">College Management</h1>
        <p className="text-muted-foreground text-sm">Add and manage registered colleges</p>
      </div>

      {/* Add form */}
      <div className="bg-card border border-border p-6 mb-6">
        <h2 className="text-card-foreground font-medium mb-4">Add New College</h2>
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">College Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. NMAMIT Nitte"
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. NMAMIT-NITTE-ENG"
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Select department</option>
              <option value="ENG">Engineering (ENG)</option>
              <option value="MCA">MCA</option>
              <option value="POLY">Polytechnic (POLY)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Mangalore"
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          {formError && <p className="md:col-span-2 text-sm text-red-600">{formError}</p>}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Adding...' : 'Add College'}
            </button>
          </div>
        </form>
      </div>

      {/* Edit modal */}
      {editingCollege && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border border-border p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-card-foreground font-medium">Edit College</h2>
              <button
                type="button"
                onClick={() => setEditingCollege(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">College Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Code *</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Department</label>
                <select
                  value={editForm.department}
                  onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Select department</option>
                  <option value="ENG">Engineering (ENG)</option>
                  <option value="MCA">MCA</option>
                  <option value="POLY">Polytechnic (POLY)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                />
              </div>
              {editError && <p className="md:col-span-2 text-sm text-red-600">{editError}</p>}
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-6 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-60"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCollege(null)}
                  className="px-4 py-2 border border-border text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium text-card-foreground">Registered Colleges</p>
          <p className="text-xs text-muted-foreground">{colleges.length} total</p>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : colleges.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No colleges found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Dept</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {colleges.map((c) => (
                  <tr key={c._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-card-foreground">{c.code}</td>
                    <td className="px-6 py-4 text-card-foreground">{c.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{c.department || '—'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{c.location || '—'}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`px-2 py-0.5 text-xs border rounded transition-colors ${
                          c.isActive
                            ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                            : 'border-zinc-300 text-zinc-500 bg-zinc-50 hover:bg-zinc-100'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCollege(c);
                            setEditForm({
                              name: c.name,
                              code: c.code,
                              department: c.department || '',
                              location: c.location || '',
                            });
                            setEditError('');
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetAdmin(c)}
                          className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors"
                          title={`Reset admin: ${c.code.toLowerCase()}@dlithe.com`}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c._id)}
                          className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
