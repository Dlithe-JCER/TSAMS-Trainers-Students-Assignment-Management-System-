import { useState, useEffect, type FormEvent } from 'react';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';
const BATCH_TYPES = ['technical', 'non-technical'];
const BATCH_STATUSES = ['active', 'completed', 'inactive'];

const EMPTY_BATCH_FORM = {
  name: '',
  assignmentName: '',
  college: '',
  type: 'technical',
  status: 'active',
  startDate: '',
  endDate: '',
};

type BatchType = {
  _id: string;
  name: string;
  assignmentName?: string;
  college: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
};

type AssignmentType = {
  _id: string;
  name: string;
  college: string;
};

function getCollegeAccess(email?: string): string | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  if (lower === SUPER_ADMIN_EMAIL) return null;
  const prefix = lower.split('@')[0];
  if (prefix === 'nitte') return 'Nitte';
  if (prefix === 'mite') return 'MITE';
  if (prefix === 'sdmit') return 'SDMIT';
  return null;
}

export default function AdminBatches() {
  const { user, loading: authLoading } = useAuth();
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
  const assignedCollege = getCollegeAccess(user?.email);

  const [batches, setBatches] = useState<BatchType[]>([]);
  const [collegeOptions, setCollegeOptions] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<AssignmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_BATCH_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchType | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_BATCH_FORM);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'inactive'>('all');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const query = assignedCollege ? `?college=${encodeURIComponent(assignedCollege)}` : '';
      const res = await fetch(`${API_URL}/trainers/batches${query}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch(`${API_URL}/assignments/all`, { headers: authHeaders() });
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchBatches();
      fetchAssignments();
      fetch(`${API_URL}/colleges`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => {
          const codes = Array.isArray(d) ? d.map((c: { code: string }) => c.code) : [];
          setCollegeOptions(codes);
          if (codes.length > 0) setForm((prev) => ({ ...prev, college: prev.college || codes[0] }));
        })
        .catch(() => {});
    }
  }, [authLoading, isSuperAdmin]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Batch name is required');
      return;
    }
    if (!form.assignmentName.trim()) {
      setFormError('Assignment name is required');
      return;
    }
    if (!form.college.trim()) {
      setFormError('College is required');
      return;
    }

    setFormError('');
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/trainers/batches`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add batch');
      }

      setForm(EMPTY_BATCH_FORM);
      fetchBatches();
      toast.success('Batch created');
    } catch (error: any) {
      setFormError(error?.message || 'Failed to add batch');
    } finally {
      setSaving(false);
    }
  };

  const handleEditOpen = (batch: BatchType) => {
    setEditingBatch(batch);
    setEditForm({
      name: batch.name,
      assignmentName: batch.assignmentName || '',
      college: batch.college,
      type: batch.type,
      status: batch.status,
      startDate: batch.startDate ? batch.startDate.slice(0, 10) : '',
      endDate: batch.endDate ? batch.endDate.slice(0, 10) : '',
    });
    setEditError('');
  };

  const handleEditSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    if (!editForm.name.trim()) {
      setEditError('Batch name is required');
      return;
    }
    if (!editForm.assignmentName.trim()) {
      setEditError('Assignment name is required');
      return;
    }

    setEditError('');
    setEditSaving(true);

    try {
      const res = await fetch(`${API_URL}/trainers/batches/${editingBatch._id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update batch');
      }

      setEditingBatch(null);
      fetchBatches();
      toast.success('Batch updated');
    } catch (error: any) {
      setEditError(error?.message || 'Failed to update batch');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this batch? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_URL}/trainers/batches/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete batch');
      }
      setBatches((prev) => prev.filter((b) => b._id !== id));
      toast.success('Batch deleted');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to delete batch');
    }
  };

  const filteredBatches = batches.filter((batch) =>
    filter === 'all' ? true : batch.status === filter
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Manage Batches</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View batch and assignment name mappings. {isSuperAdmin ? 'You can add, edit, and delete batches.' : 'You have view-only access.'}
            </p>
          </div>
          {!isSuperAdmin && (
            <div className="rounded-md bg-yellow-100 border border-yellow-200 px-4 py-2 text-sm text-yellow-900">
              View-only access for non-super admin users.
            </div>
          )}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Batch</h2>
          <form onSubmit={handleCreate} className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Assignment Name *</label>
              <select
                value={form.assignmentName}
                onChange={(e) => setForm((prev) => ({ ...prev, assignmentName: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Select assignment</option>
                {assignments.map((assignment) => (
                  <option key={assignment._id} value={assignment.name}>
                    {assignment.name} ({assignment.college})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Batch Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter batch name"
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">College *</label>
              <select
                value={form.college}
                onChange={(e) => setForm((prev) => ({ ...prev, college: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {collegeOptions.map((college) => (
                  <option key={college} value={college}>
                    {college}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Batch Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {BATCH_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {BATCH_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            {formError && (
              <p className="text-sm text-red-600 lg:col-span-2">{formError}</p>
            )}
            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Adding batch...' : 'Add Batch'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Showing {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All</option>
              {BATCH_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading batches...</p>
        ) : filteredBatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No batches found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-zinc-100 text-left text-zinc-700">
                  <th className="px-4 py-3 border-b border-zinc-200">Assignment</th>
                  <th className="px-4 py-3 border-b border-zinc-200">Batch</th>
                  <th className="px-4 py-3 border-b border-zinc-200">College</th>
                  <th className="px-4 py-3 border-b border-zinc-200">Type</th>
                  <th className="px-4 py-3 border-b border-zinc-200">Status</th>
                  <th className="px-4 py-3 border-b border-zinc-200">Dates</th>
                  {isSuperAdmin && <th className="px-4 py-3 border-b border-zinc-200">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch._id} className="odd:bg-white even:bg-zinc-50">
                    <td className="px-4 py-3 border-b border-zinc-200">{batch.assignmentName || '—'}</td>
                    <td className="px-4 py-3 border-b border-zinc-200">{batch.name}</td>
                    <td className="px-4 py-3 border-b border-zinc-200">{batch.college}</td>
                    <td className="px-4 py-3 border-b border-zinc-200 capitalize">{batch.type}</td>
                    <td className="px-4 py-3 border-b border-zinc-200 capitalize">{batch.status}</td>
                    <td className="px-4 py-3 border-b border-zinc-200">
                      {batch.startDate ? batch.startDate.slice(0, 10) : '—'}
                      {' / '}
                      {batch.endDate ? batch.endDate.slice(0, 10) : '—'}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 border-b border-zinc-200">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditOpen(batch)}
                            className="inline-flex items-center gap-2 rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(batch._id)}
                            className="inline-flex items-center gap-2 rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingBatch && isSuperAdmin && (
        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Edit Batch</h2>
              <p className="text-sm text-muted-foreground">Update batch and assignment details.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingBatch(null)}
              className="rounded-full border border-zinc-300 p-2 text-zinc-600 hover:bg-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleEditSave} className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Assignment Name *</label>
              <select
                value={editForm.assignmentName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, assignmentName: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Select assignment</option>
                {assignments.map((assignment) => (
                  <option key={assignment._id} value={assignment.name}>
                    {assignment.name} ({assignment.college})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Batch Name *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">College *</label>
              <select
                value={editForm.college}
                onChange={(e) => setEditForm((prev) => ({ ...prev, college: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {collegeOptions.map((college) => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Batch Type</label>
              <select
                value={editForm.type}
                onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {BATCH_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {BATCH_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Start Date</label>
              <input
                type="date"
                value={editForm.startDate}
                onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">End Date</label>
              <input
                type="date"
                value={editForm.endDate}
                onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            {editError && (
              <p className="text-sm text-red-600 lg:col-span-2">{editError}</p>
            )}
            <div className="lg:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={editSaving}
                className="inline-flex items-center gap-2 rounded bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="inline-flex items-center gap-2 rounded border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
