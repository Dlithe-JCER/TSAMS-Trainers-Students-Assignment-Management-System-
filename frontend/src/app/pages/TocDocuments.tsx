import { useEffect, useState } from 'react';
import { Download, Eye, UploadCloud, Edit2, Trash2 } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../../lib/api';
import { toast } from 'sonner';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

type TocDocument = {
  _id: string;
  college: string;
  assignmentName: string;
  title: string;
  level: string;
  fileUrl: string;
  fileName: string;
};

type Assignment = {
  _id: string;
  name: string;
  college: string;
};

export default function TocDocuments() {
  const { user } = useAuth();
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
  const assignedCollege = isSuperAdmin ? null : (user?.allottedCollege ?? null);

  const [docs, setDocs] = useState<TocDocument[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [colleges, setColleges] = useState<{ code: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [college, setCollege] = useState(assignedCollege ?? '');
  const [assignmentName, setAssignmentName] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState('Basic to Intermediate');
  const [uploading, setUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TocDocument | null>(null);

  const collegeOptions = isSuperAdmin ? colleges.map((c) => c.code) : (assignedCollege ? [assignedCollege] : []);
  const levelOptions = ['Basic to Intermediate', 'Intermediate to Advanced', 'Generic'];

  const filteredAssignments = assignments.filter((a) => a.college === college);

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/assignments/all`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!response.ok) return;
      const data = await response.json();
      setAssignments(data);
    } catch {
      // non-critical, silently fail
    }
  };

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }
      const response = await fetch(`${API_URL}/toc`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Unable to load TOC documents');
      const data = await response.json();
      setDocs(data);
      setError('');
    } catch (error) {
      console.error(error);
      setError('Failed to load TOC documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/colleges`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setColleges(list);
        if (!assignedCollege && list.length > 0) setCollege((prev) => prev || list[0].code);
      })
      .catch(() => {});
    fetchDocs();
    fetchAssignments();
  }, []);

  const resetForm = () => {
    setCollege(assignedCollege ?? colleges[0]?.code ?? '');
    setAssignmentName('');
    setTitle('');
    setFile(null);
    setLevel('Basic to Intermediate');
    setEditingDoc(null);
    setError('');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setError('Only superadmin may manage TOC documents');
      return;
    }
    if (!assignmentName.trim()) {
      setError('Please enter an assignment name');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title for the agenda / TOC');
      return;
    }
    if (!editingDoc && !file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('college', college);
      formData.append('assignmentName', assignmentName);
      formData.append('title', title);
      formData.append('level', level);
      if (file) {
        formData.append('file', file);
      }

      const url = editingDoc ? `${API_URL}/toc/${editingDoc._id}` : `${API_URL}/toc/upload`;
      const method = editingDoc ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      toast.success(editingDoc ? 'TOC document updated' : 'TOC document uploaded');
      resetForm();
      fetchDocs();
    } catch (uploadError) {
      console.error(uploadError);
      const msg = (uploadError as Error).message || 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (doc: TocDocument) => {
    setEditingDoc(doc);
    setCollege(doc.college);
    setAssignmentName(doc.assignmentName);
    setTitle(doc.title);
    setLevel(doc.level);
    setFile(null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (docId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('Delete this TOC document?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/toc/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Delete failed');
      }
      fetchDocs();
    } catch (deleteError) {
      console.error(deleteError);
      setError((deleteError as Error).message || 'Delete failed');
    }
  };

  const groupedDocs = docs.reduce<Record<string, TocDocument[]>>((groups, doc) => {
    const key = doc.level || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
    return groups;
  }, {});

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl text-red-700 mb-2">TOC Documents</h1>
        {/* <p className="text-muted-foreground">Upload and view TOC files grouped by level.</p> */}
      </div>

      {isSuperAdmin ? (
        <div className="bg-card border border-border p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <UploadCloud className="w-4 h-4 text-card-foreground" />
            {/* <h2 className="text-lg text-red-700">{editingDoc ? 'Edit TOC Document' : 'Upload TOC Document'}</h2> */}
          </div>

          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">College Name</label>
            <select
              value={college}
              onChange={(e) => { setCollege(e.target.value); setAssignmentName(''); }}
              className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
            >
              {collegeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Assignment Name</label>
            <select
              value={assignmentName}
              onChange={(e) => setAssignmentName(e.target.value)}
              className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
            >
              <option value="">-- Select Assignment --</option>
              {filteredAssignments.map((a) => (
                <option key={a._id} value={a.name}>
                  {a.name}
                </option>
              ))}
              {filteredAssignments.length === 0 && (
                <option disabled>No assignments for {college}</option>
              )}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-muted-foreground mb-2">Title of Agenda / TOC</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 1 — Introduction to Java"
              className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-muted-foreground mb-2">TOC File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-card-foreground"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-2 border border-border bg-card text-card-foreground focus:outline-none focus:border-primary"
            >
              {levelOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-between md:col-span-2 gap-3">
            {editingDoc ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={uploading}
                className="px-6 py-2 border border-border text-card-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
              >
                Cancel edit
              </button>
            ) : null}
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-red-700 text-primary-foreground hover:bg-red-700/90 transition-colors disabled:bg-muted disabled:text-muted-foreground"
            >
              {uploading ? (editingDoc ? 'Saving...' : 'Uploading...') : editingDoc ? 'Update TOC' : 'Upload TOC'}
            </button>
          </div>
        </form>
      </div>
      ) : (null)
      }

      <div className="bg-card border border-border p-6">
        {loading ? (
          <p className="text-card-foreground">Loading documents...</p>
        ) : docs.length === 0 ? (
          <p className="text-card-foreground">No TOC documents uploaded yet.</p>
        ) : (
          Object.entries(groupedDocs).map(([levelKey, documents]) => (
            <div key={levelKey} className="mb-8">
              <h2 className="text-lg  mb-4">{levelKey}</h2>
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border border-border rounded-lg bg-card p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-card-foreground">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">College: {doc.college}</p>
                      {doc.assignmentName && (
                        <p className="text-sm text-muted-foreground">Assignment: {doc.assignmentName}</p>
                      )}
                      <p className="text-sm text-muted-foreground">File: {doc.fileName}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-card-foreground hover:bg-card/90"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </a>
                      <a
                        href={doc.fileUrl}
                        download={doc.fileName}
                        className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm text-primary-foreground hover:bg-red-700/90"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                      {isSuperAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(doc)}
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-card-foreground hover:bg-card/90"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc._id)}
                            className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
