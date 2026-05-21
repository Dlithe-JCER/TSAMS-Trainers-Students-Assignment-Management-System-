import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

interface Trainer {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  username?: string;
  allottedCollege?: string;
  allottedProgrammingLanguage?: string;
  allottedLevel?: string;
  assignmentName?: string;
  allottedBatch?: string;
  topicCoverage?: string;
  adminRemark?: string;
  assignedTocId?: string;
  createdAt: string;
}

interface TocDoc {
  _id: string;
  title: string;
  college: string;
  level: string;
}

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

function generateUsername(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`;
  return `${base}${suffix}`;
}


export default function TrainerManagement() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
  const assignedCollege = isSuperAdmin ? null : (user?.allottedCollege ?? null);
  const [colleges, setColleges] = useState<{ code: string }[]>([]);
  const collegeOptions = isSuperAdmin ? colleges.map((c) => c.code) : (assignedCollege ? [assignedCollege] : []);

  const getToken = () => localStorage.getItem('token');

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    allottedCollege: assignedCollege ?? '',
    allottedProgrammingLanguage: '',
    allottedLevel: '',
    assignmentName: '',
    allottedBatch: '',
    remark: '',
    assignedTocId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [allAssignments, setAllAssignments] = useState<{ name: string; college: string }[]>([]);
  const [assignmentNamesLoading, setAssignmentNamesLoading] = useState(false);
  const [tocDocuments, setTocDocuments] = useState<TocDoc[]>([]);
  const [tocLoading, setTocLoading] = useState(false);

  // Fetch colleges from API — no hardcoding
  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/colleges`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => setColleges(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Fetch trainers on mount
  useEffect(() => {
    fetchTrainers();
  }, []);

  // Fetch batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setBatchesLoading(true);
        const headers: Record<string, string> = {};
        const token = getToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/trainers/batches`, {
          headers: { ...headers, Authorization: `Bearer ${getToken()}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch batches');
        }

        const data = await response.json();
        setBatches(data);
      } catch (error) {
        console.error('Error fetching batches:', error);
      } finally {
        setBatchesLoading(false);
      }
    };

    fetchBatches();
  }, []);

  // Fetch active assignments created by admin
  useEffect(() => {
    const fetchAssignmentNames = async () => {
      try {
        setAssignmentNamesLoading(true);
        const token = getToken();
        const response = await fetch(`${API_URL}/assignments`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error('Failed to fetch assignments');
        const data: { name: string; college: string; isActive: boolean }[] = await response.json();
        setAllAssignments(data.map((a) => ({ name: a.name, college: a.college })));
      } catch (error) {
        console.error('Error fetching assignments:', error);
        setAllAssignments([]);
      } finally {
        setAssignmentNamesLoading(false);
      }
    };

    fetchAssignmentNames();
  }, [assignedCollege]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchTocDocs = async () => {
      try {
        setTocLoading(true);
        const token = getToken();
        const res = await fetch(`${API_URL}/toc`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        setTocDocuments(data);
      } catch {
      } finally {
        setTocLoading(false);
      }
    };
    fetchTocDocs();
  }, [isSuperAdmin]);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/trainers`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trainers');
      }

      const data = await response.json();
      setTrainers(data);
      setErrorMessage('');
    } catch (error) {
      console.error('Error fetching trainers:', error);
      setErrorMessage('Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!formData.phone.match(/^\d{10}$/)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (!formData.allottedCollege.trim()) newErrors.allottedCollege = 'College is required';
    if (!formData.allottedProgrammingLanguage.trim()) newErrors.allottedProgrammingLanguage = 'Programming language is required';
    if (!formData.allottedLevel.trim()) newErrors.allottedLevel = 'Level is required';
    if (!formData.assignmentName.trim()) newErrors.assignmentName = 'Assignment name is required';
    if (!formData.allottedBatch.trim()) newErrors.allottedBatch = 'Batch is required';
    if (!formData.remark.trim()) newErrors.remark = 'Remark is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenModal = (trainer?: Trainer) => {
    if (!isSuperAdmin) return;
    if (trainer) {
      setEditingTrainer(trainer);
      setFormData({
        name: trainer.name,
        phone: trainer.phone,
        allottedCollege: trainer.allottedCollege || assignedCollege || '',
        allottedProgrammingLanguage: trainer.allottedProgrammingLanguage || '',
        allottedLevel: trainer.allottedLevel || '',
        assignmentName: trainer.assignmentName || '',
        allottedBatch: trainer.allottedBatch || '',
        remark: trainer.adminRemark || '',
        assignedTocId: trainer.assignedTocId || '',
      });
    } else {
      setEditingTrainer(null);
      setFormData({ name: '', phone: '', allottedCollege: assignedCollege ?? '', allottedProgrammingLanguage: '', allottedLevel: '', assignmentName: '', allottedBatch: '', remark: '', assignedTocId: '' });
    }
    setErrors({});
    setErrorMessage('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTrainer(null);
    setFormData({ name: '', phone: '', allottedCollege: assignedCollege ?? '', allottedProgrammingLanguage: '', allottedLevel: '', assignmentName: '', allottedBatch: '', remark: '', assignedTocId: '' });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = getToken();
      const trainerId = editingTrainer?._id || editingTrainer?.id;

      if (editingTrainer && trainerId) {
        // Update trainer
        const response = await fetch(`${API_URL}/trainers/${trainerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            allottedProgrammingLanguage: formData.allottedProgrammingLanguage,
            allottedLevel: formData.allottedLevel,
            assignmentName: formData.assignmentName,
            allottedBatch: formData.allottedBatch,
            remark: formData.remark,
            assignedTocId: formData.assignedTocId || null,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update trainer');
        }

        await fetchTrainers();
        toast.success('Trainer updated');
      } else {
        // Create new trainer via backend - generate username and password automatically
        const generatedUsername = generateUsername(formData.name);
        const generatedPassword = Math.random().toString(36).slice(-8);

        const response = await fetch(`${API_URL}/trainers/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            username: generatedUsername,
            password: generatedPassword,
            allottedCollege: formData.allottedCollege,
            allottedProgrammingLanguage: formData.allottedProgrammingLanguage,
            allottedLevel: formData.allottedLevel,
            assignmentName: formData.assignmentName,
            allottedBatch: formData.allottedBatch,
            remark: formData.remark,
            assignedTocId: formData.assignedTocId || null,
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message = data?.errors
            ? data.errors.map((err: any) => err.msg).join(', ')
            : data?.message || 'Failed to create trainer';
          setErrorMessage(message);
          throw new Error(message);
        }

        await fetchTrainers();
        toast.success('Trainer created');
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving trainer:', error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Failed to save trainer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (trainerId: string) => {
    const remark = prompt('Enter remark for deleting this trainer');
    if (!remark?.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`${API_URL}/trainers/${trainerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ remark: remark.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete trainer');
      }

      await fetchTrainers();
      toast.success('Trainer deleted');
    } catch (error) {
      console.error('Error deleting trainer:', error);
      toast.error('Failed to delete trainer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-red-700 mb-2">Trainer Management</h1>
          {/* <p className="text-muted-foreground">View and manage trainer records</p> */}
        </div>
        {isSuperAdmin ? (
          <button
            onClick={() => handleOpenModal()}
            className="bg-red-700 text-primary-foreground px-6 py-2 hover:bg-red-700/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Trainer
          </button>
        ) : (
          // <div className="rounded-md border border-muted/50 bg-muted/20 px-4 py-2 text-sm text-muted-foreground">
          //   Read-only access for normal admins
          // </div>
          null
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="bg-card border border-border p-8 text-center">
          <p className="text-card-foreground">Loading trainers...</p>
        </div>
      ) : (
        <div className="bg-card border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-6 py-3 text-left text-sm ">Name</th>
                  {isSuperAdmin && <th className="px-6 py-3 text-left text-sm ">Phone</th>}
                  <th className="px-6 py-3 text-left text-sm ">Language</th>
                  <th className="px-6 py-3 text-left text-sm ">Level</th>
                  <th className="px-6 py-3 text-left text-sm ">Assignment</th>
                  <th className="px-6 py-3 text-left text-sm ">Batch</th>
                  <th className="px-6 py-3 text-left text-sm ">Created</th>
                  {isSuperAdmin && <th className="px-6 py-3 text-right text-sm ">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {trainers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 8 : 6} className="px-6 py-8 text-center text-card-foreground">
                      No trainers found
                    </td>
                  </tr>
                ) : (
                  trainers.map((trainer) => (
                    <tr key={trainer._id} className="border-b border-border hover:bg-card/50">
                      <td className="px-6 py-4 text-sm text-card-foreground">{trainer.name}</td>
                      {isSuperAdmin && <td className="px-6 py-4 text-sm text-card-foreground">{trainer.phone}</td>}
                      <td className="px-6 py-4 text-sm text-card-foreground">{trainer.allottedProgrammingLanguage || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-card-foreground">{trainer.allottedLevel || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-card-foreground">{trainer.assignmentName || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-card-foreground">
                        {(() => {
                          const batch = trainer.allottedBatch ? batches.find(b => b._id === trainer.allottedBatch) : null;
                          if (!batch) return trainer.allottedBatch ? 'Unknown' : 'N/A';
                          return (
                            <span className="flex items-center gap-1.5">
                              {batch.name}
                              <span className={`px-1.5 py-0.5 text-xs border rounded ${batch.type === 'technical' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-purple-300 text-purple-700 bg-purple-50'}`}>
                                {batch.type === 'technical' ? 'Tech' : 'Non-Tech'}
                              </span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(trainer.createdAt).toLocaleDateString()}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleOpenModal(trainer)}
                              className="p-2 text-card-foreground hover:text-primary hover:bg-card/70 transition-colors disabled:opacity-50"
                              disabled={submitting}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(trainer._id)}
                              className="p-2 text-card-foreground hover:text-destructive hover:bg-card/70 transition-colors disabled:opacity-50"
                              disabled={submitting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">
          <div className="bg-card border border-border w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg text-red-700">
                {editingTrainer ? 'Edit Trainer' : 'Add Trainer'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-card-foreground hover:text-red-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                />
                {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  College <span className="text-red-600">*</span>
                </label>
                {isSuperAdmin ? (
                  <select
                    value={formData.allottedCollege}
                    onChange={(e) => setFormData({ ...formData, allottedCollege: e.target.value, allottedBatch: '', assignmentName: '' })}
                    className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                    disabled={submitting}
                  >
                    <option value="">Select college</option>
                    {collegeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2 border border-border bg-muted/30 text-card-foreground cursor-not-allowed">
                    {assignedCollege}
                  </div>
                )}
                {errors.allottedCollege && <p className="text-sm text-red-600 mt-1">{errors.allottedCollege}</p>}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Programming Language <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.allottedProgrammingLanguage}
                  onChange={(e) => setFormData({ ...formData, allottedProgrammingLanguage: e.target.value })}
                  placeholder="e.g., Java, Python, JavaScript"
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                />
                {errors.allottedProgrammingLanguage && <p className="text-sm text-red-600 mt-1">{errors.allottedProgrammingLanguage}</p>}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Level <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.allottedLevel}
                  onChange={(e) => setFormData({ ...formData, allottedLevel: e.target.value })}
                  placeholder="e.g., Level 1, Beginner, Advanced"
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                />
                {errors.allottedLevel && <p className="text-sm text-red-600 mt-1">{errors.allottedLevel}</p>}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Assignment Name <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.assignmentName}
                  onChange={(e) => setFormData({ ...formData, assignmentName: e.target.value })}
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting || assignmentNamesLoading || !formData.allottedCollege}
                >
                  <option value="">
                    {assignmentNamesLoading ? 'Loading...' : !formData.allottedCollege ? 'Select college first' : 'Select assignment'}
                  </option>
                  {allAssignments
                    .filter((a) => !formData.allottedCollege || a.college === formData.allottedCollege)
                    .map((a) => (
                      <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                </select>
                {errors.assignmentName && <p className="text-sm text-red-600 mt-1">{errors.assignmentName}</p>}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Batch <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.allottedBatch}
                  onChange={(e) => setFormData({ ...formData, allottedBatch: e.target.value })}
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting || batchesLoading || !formData.allottedCollege}
                >
                  <option value="">
                    {batchesLoading ? 'Loading batches...' : !formData.allottedCollege ? 'Select college first' : 'Select batch'}
                  </option>
                  {batches
                    .filter((b) => !formData.allottedCollege || b.college?.toLowerCase() === formData.allottedCollege.toLowerCase())
                    .map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name} — {batch.type === 'technical' ? 'Technical' : 'Non-Technical'}
                      </option>
                    ))}
                </select>
                {errors.allottedBatch && <p className="text-sm text-red-600 mt-1">{errors.allottedBatch}</p>}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Remark <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                />
                {errors.remark && <p className="text-sm text-red-600 mt-1">{errors.remark}</p>}
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Assigned TOC</label>
                <select
                  value={formData.assignedTocId}
                  onChange={(e) => setFormData({ ...formData, assignedTocId: e.target.value })}
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting || tocLoading}
                >
                  <option value="">{tocLoading ? 'Loading...' : '-- None (use level-based matching) --'}</option>
                  {tocDocuments
                    .filter((d) => !formData.allottedCollege || d.college === formData.allottedCollege)
                    .map((d) => (
                      <option key={d._id} value={d._id}>{d.title} ({d.level})</option>
                    ))}
                </select>
              </div>

              {errorMessage && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {errorMessage}
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-border text-card-foreground hover:bg-card/70 transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-700 text-primary-foreground hover:bg-red-700/90 transition-colors disabled:bg-muted disabled:text-muted-foreground"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingTrainer ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
