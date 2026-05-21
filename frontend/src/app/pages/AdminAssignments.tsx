import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';


type AssignmentType = {
  _id: string;
  name: string;
  college: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  adminRemark?: string;
};

const EMPTY_FORM = { name: '', college: '', startDate: '', endDate: '', remark: '' };

export default function AdminAssignments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate('/admin/dashboard', { replace: true });
  }, [authLoading, isSuperAdmin]);

  const [colleges, setColleges] = useState<{ code: string }[]>([]);
  const [assignments, setAssignments] = useState<AssignmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingAssignment, setEditingAssignment] = useState<AssignmentType | null>(null);
  const [editForm, setEditForm] = useState({ name: '', college: '', startDate: '', endDate: '', isActive: true, remark: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/assignments/all`, { headers: authHeaders() });
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchAssignments();
      fetch(`${API_URL}/colleges`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => setColleges(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [authLoading, isSuperAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Assignment name is required');
      return;
    }
    if (!form.remark.trim()) {
      setFormError('Remark is required');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/assignments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create');
      setForm(EMPTY_FORM);
      fetchAssignments();
      toast.success('Assignment created');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (a: AssignmentType) => {
    const remark = prompt('Enter remark for this assignment status change');
    if (!remark?.trim()) return;
    try {
      const payload = {
        name: a.name,
        college: a.college,
        startDate: a.startDate,
        endDate: a.endDate,
        isActive: !a.isActive,
        remark: remark.trim(),
      };
      const res = await fetch(`${API_URL}/assignments/${a._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setAssignments((prev) => prev.map((x) => (x._id === a._id ? data : x)));
      toast.success('Assignment updated');
    } catch {
      toast.error('Failed to update assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment? This cannot be undone.')) return;
    const remark = prompt('Enter remark for deleting this assignment');
    if (!remark?.trim()) return;
    try {
      await fetch(`${API_URL}/assignments/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ remark: remark.trim() }),
      });
      setAssignments((prev) => prev.filter((a) => a._id !== id));
      toast.success('Assignment deleted');
    } catch {
      toast.error('Failed to delete assignment');
    }
  };

  const handleEditOpen = (a: AssignmentType) => {
    setEditingAssignment(a);
    setEditForm({
      name: a.name,
      college: a.college,
      startDate: a.startDate ? a.startDate.slice(0, 10) : '',
      endDate: a.endDate ? a.endDate.slice(0, 10) : '',
      isActive: a.isActive,
      remark: a.adminRemark || '',
    });
    setEditError('');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) { setEditError('Name is required'); return; }
    if (!editForm.remark.trim()) { setEditError('Remark is required'); return; }
    setEditError('');
    setEditSaving(true);
    try {
      const res = await fetch(`${API_URL}/assignments/${editingAssignment!._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update');
      setAssignments((prev) => prev.map((x) => (x._id === editingAssignment!._id ? data : x)));
      setEditingAssignment(null);
      toast.success('Assignment updated');
    } catch (err: any) {
      setEditError(err.message || 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const filtered = assignments.filter((a) =>
    filter === 'all' ? true : filter === 'active' ? a.isActive : !a.isActive
  );

  if (!isSuperAdmin) return null;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl text-card-foreground mb-1 text-red-700">Manage Assignments</h1>
        <p className="text-muted-foreground text-sm">Add and manage assignments visible to trainers in the submission form</p>
      </div>

      {/* Add Assignment Form */}
      <div className="bg-card border border-border p-6 mb-6">
        {/* <h2 className="text-card-foreground font-medium mb-4">Add New Assignment</h2> */}
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Assignment Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. DSA Batch 2026"
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">College *</label>
            <select
              value={form.college}
              onChange={(e) => setForm((p) => ({ ...p, college: e.target.value }))}
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            >
              {colleges.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Remark *</label>
            <textarea
              value={form.remark}
              onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
            />
          </div>
          {formError && (
            <p className="md:col-span-2 text-sm text-red-600">{formError}</p>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-red-700 text-primary-foreground text-sm hover:bg-red-700/90 disabled:opacity-60 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Adding...' : 'Add Assignment'}
            </button>
          </div>
        </form>
      </div>

      {/* Assignments List */}
      <div className="bg-card border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} assignment{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-1">
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs border transition-colors ${
                  filter === f
                    ? 'border-red-700 text-red-700 bg-red-700/5'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No assignments found</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((a) => (
              <div key={a._id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-card-foreground font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.college}
                      {a.startDate && ` · from ${new Date(a.startDate).toLocaleDateString()}`}
                      {a.endDate && ` to ${new Date(a.endDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(a)}
                    className={`px-2 py-0.5 text-xs border rounded transition-colors ${
                      a.isActive
                        ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                        : 'border-zinc-300 text-zinc-500 bg-zinc-50 hover:bg-zinc-100'
                    }`}
                  >
                    {a.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditOpen(a)}
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                    title="Edit assignment"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a._id)}
                    className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors"
                    title="Delete assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editingAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">
          <div className="bg-card border border-border w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg text-card-foreground">Edit Assignment</h2>
              <button onClick={() => setEditingAssignment(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Assignment Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                  disabled={editSaving}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">College *</label>
                <select
                  value={editForm.college}
                  onChange={(e) => setEditForm((p) => ({ ...p, college: e.target.value }))}
                  className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                  disabled={editSaving}
                >
                  {colleges.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                    disabled={editSaving}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                    disabled={editSaving}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Remark *</label>
                <textarea
                  value={editForm.remark}
                  onChange={(e) => setEditForm((p) => ({ ...p, remark: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
                  disabled={editSaving}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Status</label>
                <button
                  type="button"
                  onClick={() => setEditForm((p) => ({ ...p, isActive: !p.isActive }))}
                  className={`px-3 py-1 text-xs border rounded transition-colors ${
                    editForm.isActive
                      ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                      : 'border-zinc-300 text-zinc-500 bg-zinc-50 hover:bg-zinc-100'
                  }`}
                  disabled={editSaving}
                >
                  {editForm.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="flex-1 px-4 py-2 border border-border text-sm text-card-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-700 text-primary-foreground text-sm hover:bg-red-700/90 disabled:opacity-60"
                  disabled={editSaving}
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
