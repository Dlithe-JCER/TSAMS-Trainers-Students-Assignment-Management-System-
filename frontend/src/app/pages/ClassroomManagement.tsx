import { useState, useEffect, useRef } from 'react';
import { Plus, X, Upload, Download, CheckCircle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

interface Batch {
  _id: string;
  name: string;
  college: string;
}

interface Assignment {
  _id: string;
  name: string;
  college: string;
}

interface Classroom {
  _id: string;
  college: string;
  assignmentName: string;
  name: string;
  batch?: Batch | null;
  status: 'available' | 'allocated' | 'maintenance';
  capacity: number;
  description: string;
  adminRemark?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;


function parseDescription(desc: string) {
  const result = { block: '', projector: '', type: '' };
  if (!desc) return result;
  for (const part of desc.split(',').map((p) => p.trim())) {
    if (part.startsWith('Block:')) result.block = part.slice(6).trim();
    else if (part.startsWith('Projector:')) result.projector = part.slice(10).trim();
    else if (part.startsWith('Type:')) result.type = part.slice(5).trim();
  }
  return result;
}

function buildDescription(block: string, projector: string, type: string) {
  return [
    block ? `Block: ${block}` : '',
    projector ? `Projector: ${projector}` : '',
    type ? `Type: ${type}` : '',
  ]
    .filter(Boolean)
    .join(', ');
}

function isHidden(classroom: Classroom) {
  if (!classroom.endDate) return false;
  return Date.now() > new Date(classroom.endDate).getTime() + WEEK_MS;
}

function toDateInput(iso?: string) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/** Converts an Excel cell value (Date object, serial number, or string) to YYYY-MM-DD. */
function excelDateToISO(val: any): string {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    // Use local date parts to avoid UTC timezone shift (e.g. IST -5:30 moving date back 1 day)
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Excel serial: days since 1900-01-00 (with Lotus 1-2-3 leap-year bug offset)
    const d = new Date((val - 25569) * 86400 * 1000);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${dd}`;
  }
  return String(val).trim();
}

function displayExcelDate(val: any): string {
  const iso = excelDateToISO(val);
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const statusOptions = ['available', 'allocated', 'maintenance'] as const;

const emptyForm = {
  college: '',
  assignmentName: '',
  name: '',
  block: '',
  projector: '',
  type: '',
  batch: '',
  status: 'available' as Classroom['status'],
  capacity: 30,
  startDate: '',
  endDate: '',
  remark: '',
};

export default function ClassroomManagement() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
  const assignedCollege = isSuperAdmin ? null : (user?.allottedCollege ?? null);
  const [colleges, setColleges] = useState<{ code: string }[]>([]);
  const collegeOptions = isSuperAdmin ? colleges.map((c) => c.code) : (assignedCollege ? [assignedCollege] : []);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm, college: assignedCollege ?? '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCollege, setBulkCollege] = useState(assignedCollege ?? '');
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/colleges`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => setColleges(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetchClassrooms();
    fetchBatches();
    fetchAssignments();
  }, []);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(`${API_URL}/classrooms/admin`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch classrooms');
      const data = await response.json();
      setClassrooms(assignedCollege ? data.filter((c: Classroom) => c.college === assignedCollege) : data);
      setErrorMessage('');
    } catch {
      setErrorMessage('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/trainers/batches/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      setBatches(await response.json());
    } catch {}
  };

  const fetchAssignments = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/assignments/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      setAssignments(await response.json());
    } catch {}
  };

  // Filter out classrooms whose endDate + 7 days has passed — hidden from UI, not deleted from DB
  const visibleClassrooms = classrooms.filter((c) => !isHidden(c));

  const batchesForCollege = batches.filter((b) => !formData.college || b.college === formData.college);
  const assignmentsForCollege = assignments.filter((a) => !formData.college || a.college === formData.college);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.college.trim()) newErrors.college = 'College is required';
    if (!formData.name.trim()) newErrors.name = 'Classroom number is required';
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate)
      newErrors.endDate = 'End date must be after start date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenModal = (classroom?: Classroom) => {
    if (!isSuperAdmin) return;
    if (classroom) {
      const parsed = parseDescription(classroom.description || '');
      setEditingClassroom(classroom);
      setFormData({
        college: classroom.college,
        assignmentName: classroom.assignmentName || '',
        name: classroom.name,
        block: parsed.block,
        projector: parsed.projector,
        type: parsed.type,
        batch: (classroom.batch as Batch)?._id || '',
        status: classroom.status,
        capacity: classroom.capacity,
        startDate: toDateInput(classroom.startDate),
        endDate: toDateInput(classroom.endDate),
        remark: classroom.adminRemark || '',
      });
    } else {
      setEditingClassroom(null);
      setFormData({ ...emptyForm, college: assignedCollege ?? '', remark: '' });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClassroom(null);
    setFormData({ ...emptyForm, college: assignedCollege ?? '' });
    setErrors({});
  };

  const handleCollegeChange = (college: string) => {
    setFormData((prev) => ({ ...prev, college, batch: '', assignmentName: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = getToken();
      const payload = {
        college: formData.college,
        assignmentName: formData.assignmentName || undefined,
        name: formData.name,
        batch: formData.batch || undefined,
        status: formData.status,
        capacity: formData.capacity,
        description: buildDescription(formData.block, formData.projector, formData.type) || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        remark: formData.remark,
      };
      const url = editingClassroom
        ? `${API_URL}/classrooms/${editingClassroom._id}`
        : `${API_URL}/classrooms`;
      const response = await fetch(url, {
        method: editingClassroom ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to save classroom');
      await fetchClassrooms();
      toast.success(editingClassroom ? 'Classroom updated' : 'Classroom created');
      handleCloseModal();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save classroom');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (classroomId: string) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;
    setSubmitting(true);
    try {
      const remark = prompt('Enter remark for deleting this classroom (optional)') ?? '';
      const response = await fetch(`${API_URL}/classrooms/${classroomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ remark: remark.trim() }),
      });
      if (!response.ok) throw new Error('Failed to delete classroom');
      await fetchClassrooms();
      toast.success('Classroom deleted');
    } catch {
      toast.error('Failed to delete classroom');
    } finally {
      setSubmitting(false);
    }
  };

  const normalizeStatus = (val: string): Classroom['status'] => {
    const v = String(val).toLowerCase().trim();
    if (v.includes('allocat')) return 'allocated';
    if (v.includes('mainten')) return 'maintenance';
    return 'available';
  };

  const mapRowToPayload = (row: any, college: string) => {
    const batchName = String(row['Batch'] || '').trim();
    const matchedBatch = batchName
      ? batches.find((b) => b.name.toLowerCase() === batchName.toLowerCase() && b.college === college)
      : undefined;
    return {
      college,
      name: String(row['Classroom'] || '').trim(),
      assignmentName: String(row['Assignment Name'] || '').trim() || undefined,
      capacity: parseInt(String(row['Capacity'] || '30')) || 30,
      status: normalizeStatus(String(row['Classroom availability'] || 'available')),
      batch: matchedBatch?._id || undefined,
      description:
        buildDescription(
          String(row['Block'] || ''),
          String(row['Projector'] || ''),
          String(row['Type'] || '')
        ) || undefined,
      startDate: excelDateToISO(row['Start Date']) || undefined,
      endDate: excelDateToISO(row['End Date']) || undefined,
    };
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkResults(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const workbook = XLSX.read(evt.target?.result, { type: 'binary', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      setBulkRows(XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[]);
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkUpload = async () => {
    if (!bulkCollege) { toast.error('Please select a college first'); return; }
    if (!bulkRows.length) { toast.error('No data rows found in the file'); return; }
    setBulkUploading(true);
    setBulkResults(null);
    const token = getToken();
    let success = 0, failed = 0;
    const errors: string[] = [];
    for (const row of bulkRows) {
      const payload = mapRowToPayload(row, bulkCollege);
      if (!payload.name) { failed++; errors.push('A row is missing the Classroom value — skipped'); continue; }
      try {
        const res = await fetch(`${API_URL}/classrooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          success++;
        } else {
          const d = await res.json();
          failed++;
          errors.push(`${payload.name}: ${d.message || 'Failed to save'}`);
        }
      } catch {
        failed++;
        errors.push(`${payload.name}: Network error`);
      }
    }
    setBulkResults({ success, failed, errors });
    setBulkUploading(false);
    if (success > 0) {
      await fetchClassrooms();
      toast.success(`${success} classroom${success > 1 ? 's' : ''} imported`);
    }
    if (failed > 0) toast.error(`${failed} row${failed > 1 ? 's' : ''} failed to import`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Classroom', 'Assignment Name', 'Block', 'Capacity', 'Projector', 'Type', 'Classroom availability', 'Batch', 'Start Date', 'End Date'],
      ['Lab A', 'NITTE-MAY29-JUNE14-PlacementTraining', 'Block 1', 30, 'Yes', 'Lab', 'available', '', '2025-05-01', '2025-05-31'],
      ['Room 101', '', 'Block 2', 60, 'No', 'Lecture Hall', 'available', '', '2025-05-01', '2025-06-14'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classrooms');
    XLSX.writeFile(wb, 'classroom_bulk_template.xlsx');
  };

  const handleOpenBulkModal = () => {
    setBulkCollege(assignedCollege ?? '');
    setBulkRows([]);
    setBulkResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowBulkModal(true);
  };

  const handleCloseBulkModal = () => {
    setShowBulkModal(false);
    setBulkRows([]);
    setBulkResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStatusColor = (status: string) => {
    if (status === 'available') return 'text-green-600 bg-green-50 border border-green-200';
    if (status === 'allocated') return 'text-blue-600 bg-blue-50 border border-blue-200';
    return 'text-red-600 bg-red-50 border border-red-200';
  };

  const grouped = collegeOptions.reduce<Record<string, Classroom[]>>((acc, col) => {
    acc[col] = visibleClassrooms.filter((c) => c.college === col);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-red-700 mb-2">Classroom Allotment Details</h1>
          {/* <p className="text-muted-foreground">Manage classroom allocations by college</p> */}
        </div>
        <div className="flex gap-2">
            {isSuperAdmin ? (
              <>
                <button
                  onClick={handleOpenBulkModal}
                  className="border border-border text-card-foreground px-5 py-2 hover:bg-muted/30 transition-colors flex items-center gap-2 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Upload
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="bg-red-700 text-primary-foreground px-6 py-2 hover:bg-red-700/90 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Classroom
                </button>
              </>
            ) : (
              // <div className="rounded-md border border-muted/50 bg-muted/20 px-4 py-2 text-sm text-muted-foreground">
              //   Read-only access for normal admins
              // </div>
              null
            )}
        </div>
      </div>

      {loading ? (
        <div className="bg-card border border-border p-8 text-center">
          <p className="text-card-foreground">Loading classrooms...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {collegeOptions.map((college) => (
            <div key={college} className="bg-card border border-border">
              <div className="px-6 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{college}</h2>
                <span className="text-xs text-muted-foreground">{grouped[college]?.length ?? 0} classroom(s)</span>
              </div>

              {!grouped[college]?.length ? (
                <div className="px-6 py-6 text-sm text-muted-foreground text-center">
                  No classrooms added for {college}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Assignment</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Classroom No.</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Start Date</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">End Date</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Batch</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Block</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Projector</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Type</th>
                        <th className="px-4 py-3 text-left text-xs  uppercase whitespace-nowrap">Capacity</th>
                        {isSuperAdmin && (
                          <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase whitespace-nowrap">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[college].map((classroom) => {
                        const parsed = parseDescription(classroom.description || '');
                        return (
                          <tr key={classroom._id} className="border-b border-border hover:bg-muted/10">
                            <td className="px-4 py-4 text-sm text-card-foreground">
                              {classroom.assignmentName || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-card-foreground">{classroom.name}</td>
                            <td className="px-4 py-4 text-sm text-card-foreground whitespace-nowrap">
                              {classroom.startDate
                                ? new Date(classroom.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-4 text-sm text-card-foreground whitespace-nowrap">
                              {classroom.endDate
                                ? new Date(classroom.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(classroom.status)}`}>
                                {classroom.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-card-foreground">
                              {(classroom.batch as Batch)?.name || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-4 text-sm text-card-foreground">
                              {parsed.block || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-4 text-sm text-card-foreground">
                              {parsed.projector || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-4 text-sm text-card-foreground">
                              {parsed.type || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-4 text-sm text-card-foreground">{classroom.capacity}</td>
                            {isSuperAdmin && (
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenModal(classroom)}
                                    className="p-2 text-card-foreground hover:text-primary hover:bg-muted/20 rounded transition-colors"
                                    disabled={submitting}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(classroom._id)}
                                    className="p-2 text-card-foreground hover:text-destructive hover:bg-muted/20 rounded transition-colors"
                                    disabled={submitting}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">
          <div className="bg-card border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg text-red-700">
                {editingClassroom ? 'Edit Classroom' : 'Add Classroom'}
              </h2>
              <button onClick={handleCloseModal} className="text-card-foreground hover:text-red-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* College */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  College <span className="text-red-600">*</span>
                </label>
                {isSuperAdmin ? (
                  <select
                    value={formData.college}
                    onChange={(e) => handleCollegeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                    disabled={submitting}
                  >
                    <option value="">Select college</option>
                    {collegeOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2 border border-border bg-muted/30 text-card-foreground cursor-not-allowed">
                    {assignedCollege}
                  </div>
                )}
                {errors.college && <p className="text-sm text-red-600 mt-1">{errors.college}</p>}
              </div>

              {/* Assignment Name */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Assignment Name</label>
                <select
                  value={formData.assignmentName}
                  onChange={(e) => setFormData({ ...formData, assignmentName: e.target.value })}
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting || !formData.college}
                >
                  <option value="">
                    {!formData.college ? 'Select college first' : '-- Select Assignment --'}
                  </option>
                  {assignmentsForCollege.map((a) => (
                    <option key={a._id} value={a.name}>{a.name}</option>
                  ))}
                  {formData.college && assignmentsForCollege.length === 0 && (
                    <option disabled>No assignments for {formData.college}</option>
                  )}
                </select>
              </div>

              {/* Classroom Number */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Classroom Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Lab A, Room 101"
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Block */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Block</label>
                <input
                  type="text"
                  value={formData.block}
                  onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                  placeholder="e.g. Block A"
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                />
              </div>

              {/* Projector + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Projector</label>
                  <input
                    type="text"
                    value={formData.projector}
                    onChange={(e) => setFormData({ ...formData, projector: e.target.value })}
                    placeholder="Yes / No"
                    className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Type</label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="e.g. Lab, Lecture Hall"
                    className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Availability dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, endDate: val });
                      if (val) {
                        const hideDate = new Date(new Date(val).getTime() + WEEK_MS).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                        toast.warning(`Classroom will be hidden from UI on ${hideDate} (7 days after end date). It will remain in the database.`);
                      }
                    }}
                    className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                    disabled={submitting}
                  />
                  {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>}
                </div>
              </div>

              {/* Batch */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Batch Assigned</label>
                <select
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting || !formData.college}
                >
                  <option value="">
                    {!formData.college ? 'Select college first' : 'Select batch (optional)'}
                  </option>
                  {batchesForCollege.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Remark
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

              {/* Status */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Classroom['status'] })}
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })}
                  min="1"
                  className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-border text-card-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-700 text-primary-foreground hover:bg-red-700/90 transition-colors disabled:bg-muted disabled:text-muted-foreground"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingClassroom ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk upload modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">
          <div className="bg-card border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg text-red-700">Bulk Upload Classrooms</h2>
              <button onClick={handleCloseBulkModal} className="text-card-foreground hover:text-red-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* College */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  College <span className="text-red-600">*</span>
                </label>
                {isSuperAdmin ? (
                  <select
                    value={bulkCollege}
                    onChange={(e) => {
                      setBulkCollege(e.target.value);
                      setBulkRows([]);
                      setBulkResults(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
                    disabled={bulkUploading}
                  >
                    <option value="">Select college</option>
                    {collegeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <div className="w-full px-4 py-2 border border-border bg-muted/30 text-card-foreground cursor-not-allowed">
                    {assignedCollege}
                  </div>
                )}
              </div>

              {/* File upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-muted-foreground">
                    Excel File <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center gap-1 text-xs text-red-700 hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    Download template
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkFileChange}
                  disabled={bulkUploading}
                  className="w-full text-sm text-card-foreground file:mr-4 file:py-2 file:px-4 file:border file:border-border file:bg-muted/30 file:text-card-foreground file:cursor-pointer hover:file:bg-muted/50"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Expected columns: Classroom, Assignment Name, Block, Capacity, Projector, Type, Classroom availability, Batch, Start Date, End Date
                </p>
              </div>

              {/* Preview */}
              {bulkRows.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{bulkRows.length} row(s) detected — preview:</p>
                  <div className="overflow-x-auto border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr>
                          {['Classroom', 'Assignment Name', 'Block', 'Capacity', 'Projector', 'Type', 'Classroom availability', 'Batch', 'Start Date', 'End Date'].map((col) => (
                            <th key={col} className="px-3 py-2 text-left text-muted-foreground uppercase whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/10">
                            <td className="px-3 py-2 text-card-foreground whitespace-nowrap">{String(row['Classroom'] || '—')}</td>
                            <td className="px-3 py-2 text-card-foreground whitespace-nowrap">{String(row['Assignment Name'] || '—')}</td>
                            <td className="px-3 py-2 text-card-foreground whitespace-nowrap">{String(row['Block'] || '—')}</td>
                            <td className="px-3 py-2 text-card-foreground">{String(row['Capacity'] || '—')}</td>
                            <td className="px-3 py-2 text-card-foreground">{String(row['Projector'] || '—')}</td>
                            <td className="px-3 py-2 text-card-foreground">{String(row['Type'] || '—')}</td>
                            <td className="px-3 py-2 text-card-foreground whitespace-nowrap">{String(row['Classroom availability'] || '—')}</td>
                            <td className="px-3 py-2 text-card-foreground whitespace-nowrap">{String(row['Batch'] || '—')}</td>
                            <td className="px-3 py-2 text-card-foreground whitespace-nowrap">{displayExcelDate(row['Start Date'])}</td>
                            <td className="px-3 py-2 text-card-foreground whitespace-nowrap">{displayExcelDate(row['End Date'])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {bulkRows.length > 10 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                        … and {bulkRows.length - 10} more row(s) not shown
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Results */}
              {bulkResults && (
                <div className="space-y-2">
                  {bulkResults.success > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      {bulkResults.success} classroom(s) added successfully
                    </div>
                  )}
                  {bulkResults.failed > 0 && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {bulkResults.failed} row(s) failed
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        {bulkResults.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseBulkModal}
                  className="flex-1 px-4 py-2 border border-border text-card-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
                  disabled={bulkUploading}
                >
                  {bulkResults ? 'Close' : 'Cancel'}
                </button>
                {!bulkResults && (
                  <button
                    type="button"
                    onClick={handleBulkUpload}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:bg-muted disabled:text-muted-foreground"
                    disabled={bulkUploading || !bulkRows.length || !bulkCollege}
                  >
                    {bulkUploading
                      ? `Uploading… (${bulkRows.length} rows)`
                      : `Upload ${bulkRows.length || ''} Classrooms`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
