import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Download, Upload, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { API_URL } from '../../lib/api';

interface Student {
  _id: string;
  name: string;
  usn: string;
  college: string;
  sec: string;
  sem: string;
  branch: string;
  email: string;
  cleanKey: string;
  registrationStatus: string;
  personalEmailId: string;
  contactNumber: string;
  formProgrammingLanguage: string;
  toolProgrammingLanguage: string;
  questionTitle: string;
  assessmentStatus: string;
  assignedBatch: string;
  createdAt: string;
}

const ALL_COLLEGES = ['Nitte', 'MITE', 'SDMIT'];
const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';
const COLLEGE_EMAIL_MAP: Record<string, string> = { sdmit: 'SDMIT', mite: 'MITE', nitte: 'Nitte' };

function getCollegeAccess(email?: string): string | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  if (lower === SUPER_ADMIN_EMAIL) return null;
  const prefix = lower.split('@')[0];
  return COLLEGE_EMAIL_MAP[prefix] ?? null;
}


const EMPTY_FORM = {
  name: '',
  usn: '',
  college: '',
  sec: '',
  sem: '',
  branch: '',
  email: '',
  cleanKey: '',
  registrationStatus: '',
  personalEmailId: '',
  contactNumber: '',
  formProgrammingLanguage: '',
  toolProgrammingLanguage: '',
  questionTitle: '',
  assessmentStatus: '',
  assignedBatch: '',
};

const ASSESSMENT_STATUSES = ['Pending', 'Completed', 'Exempted', 'Absent'];
const REGISTRATION_STATUSES = ['Registered', 'Not Registered', 'Pending'];

export default function StudentManagement() {
  const { user } = useAuth();
  const assignedCollege = getCollegeAccess(user?.email);
  const isSuperAdmin = assignedCollege === null;
  const collegeOptions = isSuperAdmin ? ALL_COLLEGES : [assignedCollege!];

  const getToken = () => localStorage.getItem('token');
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM, college: assignedCollege ?? 'Nitte' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [filterCollege, setFilterCollege] = useState(assignedCollege ?? 'Nitte');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterAssessment, setFilterAssessment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/students`, { headers: authHeaders() });
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const forCollege = students.filter((s) => s.college === filterCollege);
  const batches = [...new Set(forCollege.map((s) => s.assignedBatch).filter(Boolean))].sort();
  const branches = [...new Set(forCollege.map((s) => s.branch).filter(Boolean))].sort();

  const filtered = forCollege.filter((s) => {
    if (filterBatch && s.assignedBatch !== filterBatch) return false;
    if (filterBranch && s.branch !== filterBranch) return false;
    if (filterAssessment && s.assessmentStatus !== filterAssessment) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.usn.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.branch?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.usn.trim()) e.usn = 'USN is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEditingStudent(null);
    setFormData({ ...EMPTY_FORM, college: assignedCollege ?? filterCollege });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setFormData({
      name: s.name,
      usn: s.usn,
      college: s.college,
      sec: s.sec || '',
      sem: s.sem || '',
      branch: s.branch || '',
      email: s.email || '',
      cleanKey: s.cleanKey || '',
      registrationStatus: s.registrationStatus || '',
      personalEmailId: s.personalEmailId || '',
      contactNumber: s.contactNumber || '',
      formProgrammingLanguage: s.formProgrammingLanguage || '',
      toolProgrammingLanguage: s.toolProgrammingLanguage || '',
      questionTitle: s.questionTitle || '',
      assessmentStatus: s.assessmentStatus || '',
      assignedBatch: s.assignedBatch || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingStudent(null); setErrors({}); };

  const field = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { ...formData, usn: formData.usn.trim().toUpperCase() };
      if (editingStudent) {
        const res = await fetch(`${API_URL}/students/${editingStudent._id}`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update');
        setStudents((prev) => prev.map((s) => (s._id === editingStudent._id ? data : s)));
        toast.success('Student updated');
      } else {
        const res = await fetch(`${API_URL}/students`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to create');
        setStudents((prev) => [...prev, data]);
        toast.success('Student added');
      }
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error();
      setStudents((prev) => prev.filter((s) => s._id !== id));
      toast.success('Student deleted');
    } catch { toast.error('Failed to delete student'); }
  };

  const handleExport = () => {
    const rows = filtered.map((s) => ({
      USN: s.usn,
      Name: s.name,
      Section: s.sec || '',
      Semester: s.sem || '',
      Branch: s.branch || '',
      Email: s.email || '',
      'Clean Key': s.cleanKey || '',
      'Registration Status': s.registrationStatus || '',
      'Personal Email': s.personalEmailId || '',
      'Contact Number': s.contactNumber || '',
      'Form Programming Language': s.formProgrammingLanguage || '',
      'Tool Programming Language': s.toolProgrammingLanguage || '',
      'Question Title': s.questionTitle || '',
      'Assessment Status': s.assessmentStatus || '',
      'Assigned Batch': s.assignedBatch || '',
      College: s.college,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map((k) => ({
      wch: Math.max(k.length, ...rows.map((r) => String((r as any)[k] ?? '').length)),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `students-${filterCollege}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      USN: '4NM22CS001', Name: 'Aditya Kumar', Section: 'A', Semester: '4',
      Branch: 'CSE', Email: 'aditya@college.edu', 'Clean Key': 'KEY123',
      'Registration Status': 'Registered', 'Personal Email': 'aditya@gmail.com',
      'Contact Number': '9876543210', 'Form Programming Language': 'Python',
      'Tool Programming Language': 'VS Code', 'Question Title': 'Arrays & Strings',
      'Assessment Status': 'Completed', 'Assigned Batch': 'CS-A', College: 'Nitte',
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        const errs: string[] = [];
        const parsed = rows.map((row, i) => {
          const name = String(row['Name'] || row['name'] || '').trim();
          const usn = String(row['USN'] || row['usn'] || '').trim().toUpperCase();
          if (!name) errs.push(`Row ${i + 2}: Name missing`);
          if (!usn) errs.push(`Row ${i + 2}: USN missing`);
          return {
            name, usn,
            college: String(row['College'] || row['college'] || filterCollege).trim(),
            sec: String(row['Section'] || row['sec'] || '').trim(),
            sem: String(row['Semester'] || row['sem'] || '').trim(),
            branch: String(row['Branch'] || row['branch'] || '').trim(),
            email: String(row['Email'] || row['email'] || '').trim(),
            cleanKey: String(row['Clean Key'] || row['cleanKey'] || '').trim(),
            registrationStatus: String(row['Registration Status'] || row['registrationStatus'] || '').trim(),
            personalEmailId: String(row['Personal Email'] || row['personalEmailId'] || '').trim(),
            contactNumber: String(row['Contact Number'] || row['contactNumber'] || '').trim(),
            formProgrammingLanguage: String(row['Form Programming Language'] || row['formProgrammingLanguage'] || '').trim(),
            toolProgrammingLanguage: String(row['Tool Programming Language'] || row['toolProgrammingLanguage'] || '').trim(),
            questionTitle: String(row['Question Title'] || row['questionTitle'] || '').trim(),
            assessmentStatus: String(row['Assessment Status'] || row['assessmentStatus'] || '').trim(),
            assignedBatch: String(row['Assigned Batch'] || row['assignedBatch'] || '').trim(),
          };
        });
        setImportRows(parsed);
        setImportErrors(errs);
      } catch { setImportErrors(['Failed to parse file']); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleImportSubmit = async () => {
    if (importErrors.length > 0) return;
    setImporting(true);
    let success = 0; let failed = 0;
    for (const row of importRows) {
      try {
        const res = await fetch(`${API_URL}/students`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify(row),
        });
        if (res.ok) success++; else failed++;
      } catch { failed++; }
    }
    toast.success(`Imported ${success} students${failed ? `, ${failed} failed` : ''}`);
    setImportRows([]); setImportErrors([]);
    fetchStudents();
    setImporting(false);
  };

  const inp = 'w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary';
  const sel = inp;
  const lbl = 'block text-xs text-muted-foreground mb-1';

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-red-700 mb-1">Student Management</h1>
          <p className="text-muted-foreground text-sm">Manage student records across colleges and batches</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white text-sm hover:bg-red-900 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Student
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-5 mb-5">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 items-end">
          <div>
            <label className={lbl}>College</label>
            {isSuperAdmin ? (
              <select value={filterCollege} onChange={(e) => { setFilterCollege(e.target.value); setFilterBatch(''); setFilterBranch(''); }} className={sel}>
                {collegeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <div className="px-3 py-2 border border-border text-sm bg-muted/30 cursor-not-allowed">{assignedCollege}</div>
            )}
          </div>
          <div>
            <label className={lbl}>Batch</label>
            <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} className={sel}>
              <option value="">All Batches</option>
              {batches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Branch</label>
            <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className={sel}>
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Assessment Status</label>
            <select value={filterAssessment} onChange={(e) => setFilterAssessment(e.target.value)} className={sel}>
              <option value="">All</option>
              {ASSESSMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className={lbl}>Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, USN, email, branch…"
                className="w-full pl-9 pr-3 py-2 border border-border text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Import / Export */}
      <div className="bg-card border border-border p-5 mb-5">
        <h2 className="text-sm font-medium text-card-foreground mb-3">Bulk Import / Export</h2>
        <div className="flex flex-wrap gap-3 items-center">
          {isSuperAdmin && (
            <>
              <label className="flex items-center gap-2 px-4 py-2 border border-border text-sm text-foreground hover:bg-muted cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                Import Excel
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
              </label>
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">
                <Download className="w-4 h-4" /> Download Template
              </button>
            </>
          )}
          <button
            onClick={handleExport} disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white text-sm hover:bg-red-900 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export ({filtered.length})
          </button>
        </div>

        {isSuperAdmin && importRows.length > 0 && (
          <div className="mt-4 border border-border">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-medium">{importRows.length} rows to import</p>
              <div className="flex gap-2">
                <button onClick={() => { setImportRows([]); setImportErrors([]); }} className="px-3 py-1 text-xs border border-border hover:bg-muted">Cancel</button>
                <button onClick={handleImportSubmit} disabled={importing || importErrors.length > 0}
                  className="px-3 py-1 text-xs bg-red-700 text-white hover:bg-red-900 disabled:opacity-50">
                  {importing ? 'Importing…' : 'Confirm Import'}
                </button>
              </div>
            </div>
            {importErrors.length > 0 && (
              <div className="px-4 py-3 bg-red-50 text-sm text-red-700">{importErrors.map((e, i) => <p key={i}>{e}</p>)}</div>
            )}
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['USN','Name','Sec','Sem','Branch','Email','Batch','Assessment Status'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((r, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-3 py-1.5 font-mono">{r.usn}</td>
                      <td className="px-3 py-1.5">{r.name}</td>
                      <td className="px-3 py-1.5">{r.sec || '—'}</td>
                      <td className="px-3 py-1.5">{r.sem || '—'}</td>
                      <td className="px-3 py-1.5">{r.branch || '—'}</td>
                      <td className="px-3 py-1.5">{r.email || '—'}</td>
                      <td className="px-3 py-1.5">{r.assignedBatch || '—'}</td>
                      <td className="px-3 py-1.5">{r.assessmentStatus || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total (College)', value: forCollege.length },
          { label: 'Showing', value: filtered.length },
          { label: 'Batches', value: batches.length },
          { label: 'Branches', value: branches.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-semibold text-card-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm text-muted-foreground">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''} — {filterCollege}
            {filterBatch && <span> · {filterBatch}</span>}
            {filterBranch && <span> · {filterBranch}</span>}
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No students found. Add one or adjust filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-card">
                  {['USN','Name','Sec','Sem','Branch','Email','Clean Key','Reg. Status','Personal Email','Contact','Form Lang','Tool Lang','Question Title','Assessment Status','Assigned Batch'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-foreground whitespace-nowrap">{h}</th>
                  ))}
                  {isSuperAdmin && <th className="px-4 py-3 text-left text-xs text-foreground whitespace-nowrap"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs font-mono text-card-foreground whitespace-nowrap">{s.usn}</td>
                    <td className="px-4 py-3 text-xs text-card-foreground font-medium whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.sec || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.sem || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.branch || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.email || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.cleanKey || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {s.registrationStatus ? (
                        <span className={`px-1.5 py-0.5 text-xs border ${s.registrationStatus === 'Registered' ? 'border-green-300 text-green-700 bg-green-50' : s.registrationStatus === 'Not Registered' ? 'border-red-300 text-red-700 bg-red-50' : 'border-yellow-300 text-yellow-700 bg-yellow-50'}`}>
                          {s.registrationStatus}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.personalEmailId || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.contactNumber || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.formProgrammingLanguage || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.toolProgrammingLanguage || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                      <div className="truncate" title={s.questionTitle}>{s.questionTitle || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {s.assessmentStatus ? (
                        <span className={`px-1.5 py-0.5 text-xs border ${s.assessmentStatus === 'Completed' ? 'border-green-300 text-green-700 bg-green-50' : s.assessmentStatus === 'Absent' ? 'border-red-300 text-red-700 bg-red-50' : s.assessmentStatus === 'Exempted' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-yellow-300 text-yellow-700 bg-yellow-50'}`}>
                          {s.assessmentStatus}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{s.assignedBatch || '—'}</td>
                    {isSuperAdmin && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(s._id, s.name)} className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-card-foreground font-medium">{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5">

              {/* Basic Info */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Basic Info</p>
              <div className="grid gap-4 md:grid-cols-3 mb-5">
                <div>
                  <label className={lbl}>USN *</label>
                  <input type="text" value={formData.usn} onChange={field('usn')}
                    onBlur={() => setFormData((p) => ({ ...p, usn: p.usn.trim().toUpperCase() }))}
                    placeholder="4NM22CS001" className={`${inp} font-mono`} />
                  {errors.usn && <p className="text-xs text-red-600 mt-1">{errors.usn}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Full Name *</label>
                  <input type="text" value={formData.name} onChange={field('name')} placeholder="Aditya Kumar" className={inp} />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className={lbl}>Section</label>
                  <input type="text" value={formData.sec} onChange={field('sec')} placeholder="A" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Semester</label>
                  <input type="text" value={formData.sem} onChange={field('sem')} placeholder="4" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Branch</label>
                  <input type="text" value={formData.branch} onChange={field('branch')} placeholder="CSE" className={inp} />
                </div>
              </div>

              {/* College & Batch */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">College & Batch</p>
              <div className="grid gap-4 md:grid-cols-2 mb-5">
                <div>
                  <label className={lbl}>College</label>
                  {isSuperAdmin ? (
                    <select value={formData.college} onChange={field('college')} className={sel}>
                      <option value="">Select College</option>
                      {ALL_COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <div className="px-3 py-2 border border-border text-sm bg-muted/30">{assignedCollege}</div>
                  )}
                </div>
                <div>
                  <label className={lbl}>Assigned Batch</label>
                  <input type="text" value={formData.assignedBatch} onChange={field('assignedBatch')} placeholder="CS-A" className={inp} />
                </div>
              </div>

              {/* Contact */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact</p>
              <div className="grid gap-4 md:grid-cols-3 mb-5">
                <div>
                  <label className={lbl}>College Email</label>
                  <input type="email" value={formData.email} onChange={field('email')} placeholder="aditya@college.edu" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Personal Email</label>
                  <input type="email" value={formData.personalEmailId} onChange={field('personalEmailId')} placeholder="aditya@gmail.com" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Contact Number</label>
                  <input type="tel" value={formData.contactNumber} onChange={field('contactNumber')} placeholder="9876543210" className={inp} />
                </div>
              </div>

              {/* Registration */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Registration</p>
              <div className="grid gap-4 md:grid-cols-2 mb-5">
                <div>
                  <label className={lbl}>Clean Key</label>
                  <input type="text" value={formData.cleanKey} onChange={field('cleanKey')} placeholder="KEY123" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Registration Status</label>
                  <select value={formData.registrationStatus} onChange={field('registrationStatus')} className={sel}>
                    <option value="">Select Status</option>
                    {REGISTRATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Assessment */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Assessment</p>
              <div className="grid gap-4 md:grid-cols-2 mb-5">
                <div>
                  <label className={lbl}>Form Programming Language</label>
                  <input type="text" value={formData.formProgrammingLanguage} onChange={field('formProgrammingLanguage')} placeholder="Python" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Tool Programming Language</label>
                  <input type="text" value={formData.toolProgrammingLanguage} onChange={field('toolProgrammingLanguage')} placeholder="VS Code" className={inp} />
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Question Title</label>
                  <input type="text" value={formData.questionTitle} onChange={field('questionTitle')} placeholder="Arrays & Strings" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Assessment Status</label>
                  <select value={formData.assessmentStatus} onChange={field('assessmentStatus')} className={sel}>
                    <option value="">Select Status</option>
                    {ASSESSMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-6 py-2 bg-red-700 text-white text-sm hover:bg-red-900 disabled:opacity-60 flex items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4" />
                  {submitting ? 'Saving…' : editingStudent ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
