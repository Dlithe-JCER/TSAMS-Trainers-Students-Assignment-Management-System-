import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Eye, Download, Loader } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { API_URL } from '../../lib/api';


/* ---------- TYPES ---------- */

type Assignment = {
  _id: string;
  name: string;
  college: string;
  startDate?: string;
  endDate?: string;
};

type Trainer = {
  id: string;
  name: string;
  college?: string;
  assignmentName?: string;
  batchName?: string;
};

type FormDataType = {
  assignmentId: string;
  assignmentName: string;
  college: string;
  trainerName: string;
  batchName: string;
  githubLink: string;
  topicsCovered: string;
  assignmentLink: string;
  sessionDate: string;
  morningSession1: string;
  morningSession2: string;
  afternoonSession1: string;
  afternoonSession2: string;
  classroom: string;
};

type TocDocument = {
  _id: string;
  title: string;
  level: string;
  college: string;
  assignmentName: string;
  fileUrl: string;
  fileName: string;
};

const today = new Date().toISOString().split("T")[0];

const EMPTY_FORM: FormDataType = {
  assignmentId: "",
  assignmentName: "",
  college: "",
  trainerName: "",
  batchName: "",
  githubLink: "",
  topicsCovered: "",
  assignmentLink: "",
  sessionDate: today,
  morningSession1: "",
  morningSession2: "",
  afternoonSession1: "",
  afternoonSession2: "",
  classroom: "",
};

/* ---------- STUDENT ATTENDANCE SECTION ---------- */

const SESSIONS = [
  { key: "morning1",   label: "Morning Session 1" },
  { key: "morning2",   label: "Morning Session 2" },
  { key: "afternoon1", label: "Afternoon Session 1" },
  { key: "afternoon2", label: "Afternoon Session 2" },
];

type CardState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "used_today" }
  | { status: "loading" }
  | { status: "active"; token: string; qrUrl: string; timeLeft: number }
  | { status: "expired" }
  | { status: "error"; message: string };

function SessionCard({
  session,
  batchId,
  batchName,
  college,
  disabled,
}: {
  session: { key: string; label: string };
  batchId: string;
  batchName: string;
  college: string;
  disabled: boolean;
}) {
  const [state, setState] = useState<CardState>({ status: "idle" });

  useEffect(() => {
    if (state.status !== "active") return;
    if (state.timeLeft <= 0) { setState({ status: "expired" }); return; }
    const t = setTimeout(() =>
      setState((prev) =>
        prev.status === "active"
          ? { ...prev, timeLeft: prev.timeLeft - 1 }
          : prev
      ), 1000);
    return () => clearTimeout(t);
  }, [state]);

  // Check if this session was already generated today for this batch
  useEffect(() => {
    if (!batchId) { setState({ status: "idle" }); return; }
    setState({ status: "checking" });
    const date = new Date().toISOString().split("T")[0];
    fetch(`${API_URL}/sessions/check?batchId=${encodeURIComponent(batchId)}&date=${date}`)
      .then((r) => r.json())
      .then((data) => setState(data[session.key] ? { status: "used_today" } : { status: "idle" }))
      .catch(() => setState({ status: "idle" }));
  }, [batchId, session.key]);

  const handleGenerate = async () => {
    if (!batchId) return;
    setState({ status: "loading" });
    try {
      const res = await fetch(`${API_URL}/sessions/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: session.key, batchId, batchName, college }),
      });
      const data = await res.json();
      if (res.status === 409) { setState({ status: "used_today" }); return; }
      if (!res.ok) { setState({ status: "error", message: data.message || "Failed" }); return; }
      const qrUrl = `${window.location.origin}/attend?token=${data.token}`;
      setState({ status: "active", token: data.token, qrUrl, timeLeft: 300 });
    } catch {
      setState({ status: "error", message: "Network error" });
    }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const pct = state.status === "active" ? (state.timeLeft / 300) * 100 : 0;
  const urgent = state.status === "active" && state.timeLeft <= 60;

  return (
    <div className={`border rounded-lg p-4 flex flex-col gap-3 ${state.status === "expired" ? "border-zinc-200 bg-zinc-50 opacity-60" : "border-zinc-200"}`}>
      <p className="text-xs font-semibold text-zinc-800 uppercase tracking-wide">{session.label}</p>

      {state.status === "checking" && (
        <div className="flex justify-center py-4">
          <Loader className="w-4 h-4 animate-spin text-zinc-300" />
        </div>
      )}

      {state.status === "used_today" && (
        <div className="flex flex-col items-center gap-1 py-3 text-center">
          <p className="text-xs font-semibold text-amber-700">Already Generated Today</p>
          <p className="text-[10px] text-zinc-400">Available again tomorrow</p>
        </div>
      )}

      {state.status === "idle" && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled}
          className="w-full px-3 py-2 bg-red-900 text-white text-xs font-medium rounded hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Generate QR
        </button>
      )}

      {state.status === "loading" && (
        <div className="flex justify-center py-4">
          <Loader className="w-5 h-5 animate-spin text-red-900" />
        </div>
      )}

      {state.status === "active" && (
        <>
          {/* Timer bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500">Expires in</span>
              <span className={`text-sm font-mono font-bold ${urgent ? "text-red-600" : "text-zinc-800"}`}>
                {fmt(state.timeLeft)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${urgent ? "bg-red-500" : "bg-green-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex justify-center p-3 bg-white rounded border">
            <QRCode value={state.qrUrl} size={110} level="H" />
          </div>
          <p className="text-[10px] text-zinc-400 text-center">{batchName}</p>
        </>
      )}

      {state.status === "expired" && (
        <div className="flex flex-col items-center gap-1 py-3">
          <p className="text-xs font-medium text-zinc-500">QR Expired</p>
          <p className="text-[10px] text-zinc-400">Session closed</p>
        </div>
      )}

      {state.status === "error" && (
        <p className="text-xs text-red-600">{state.message}</p>
      )}
    </div>
  );
}

function StudentAttendanceSection() {
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState("");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch(`${API_URL}/trainers/batches/all`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setBatches(Array.isArray(d) ? d : []))
      .catch(() => setBatches([]))
      .finally(() => setBatchesLoading(false));
  }, []);

  const batch = batches.find((b) => b._id === selectedBatch);

  return (
    <div className="bg-white border border-red-200 p-6 space-y-5 rounded">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-red-900">Session QR Codes</h3>
        <span className="text-xs text-zinc-400 font-mono">{today}</span>
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700">Select Batch</label>
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm mt-1"
        >
          <option value="">{batchesLoading ? "Loading batches..." : "Choose a batch"}</option>
          {batches.map((b) => (
            <option key={b._id} value={b._id}>{b.name} — {b.college}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SESSIONS.map((session) => (
          <SessionCard
            key={session.key}
            session={session}
            batchId={selectedBatch}
            batchName={batch?.name || ""}
            college={batch?.college || ""}
            disabled={!selectedBatch}
          />
        ))}
      </div>
    </div>
  );
}

export default function TrainerSubmission() {
  const [formData, setFormData] = useState<FormDataType>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  const [trainerSearch, setTrainerSearch] = useState("");
  const [showTrainerDropdown, setShowTrainerDropdown] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);

  const [classrooms, setClassrooms] = useState<string[]>([]);

  const [tocDocuments, setTocDocuments] = useState<TocDocument[]>([]);
  const [tocLoading, setTocLoading] = useState(false);
  const [tocFetched, setTocFetched] = useState(false);

  /* ---------- FETCHES ---------- */

  useEffect(() => {
    setAssignmentsLoading(true);
    fetch(`${API_URL}/assignments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAssignments(Array.isArray(d) ? d : []))
      .catch(() => setAssignments([]))
      .finally(() => setAssignmentsLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/classrooms`)
      .then((r) => r.json())
      .then((d) => setClassrooms(Array.isArray(d) ? d : []))
      .catch(() => setClassrooms(["Lab A (Nitte)", "Lab B (Nitte)", "Room 101 (MITE)", "Computer Lab (SDMIT)"]));
  }, []);

  // Fetch trainers filtered by selected assignment
  useEffect(() => {
    if (!formData.assignmentName) {
      setTrainers([]);
      return;
    }
    setTrainersLoading(true);
    const assignmentName = formData.assignmentName.trim();
    fetch(`${API_URL}/trainers/public?assignmentName=${encodeURIComponent(assignmentName)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const fetchedTrainers = Array.isArray(data) ? data : [];
        setTrainers(
          fetchedTrainers
            .map((t) => ({
              id: t._id || t.id,
              name: t.name,
              college: t.allottedCollege || t.college,
              assignmentName: t.assignmentName,
              batchName: t.allottedBatch?.name || "",
            }))
            .filter((trainer) => trainer.assignmentName?.trim() === assignmentName)
        );
      })
      .catch(() => setTrainers([]))
      .finally(() => setTrainersLoading(false));
  }, [formData.assignmentName]);

  // Fetch TOC docs when trainer selected
  useEffect(() => {
    if (!selectedTrainerId) {
      setTocDocuments([]);
      setTocFetched(false);
      return;
    }
    setTocLoading(true);
    fetch(`${API_URL}/toc/by-trainer/${selectedTrainerId}`)
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      .then((data) => {
        setTocDocuments(Array.isArray(data.docs) ? data.docs : []);
        setTocFetched(true);
      })
      .catch(() => {
        setTocDocuments([]);
        setTocFetched(true);
      })
      .finally(() => setTocLoading(false));
  }, [selectedTrainerId]);

  /* ---------- HANDLERS ---------- */

  const handleAssignmentSelect = (assignment: Assignment) => {
    setFormData((prev) => ({
      ...prev,
      assignmentId: assignment._id,
      assignmentName: assignment.name,
      college: assignment.college,
      trainerName: "",
      batchName: "",
    }));
    setTrainerSearch("");
    setSelectedTrainerId("");
    setTrainers([]);
    setShowTrainerDropdown(false);
    setTocDocuments([]);
    setTocFetched(false);
  };

  const handleTrainerSelect = (trainer: Trainer) => {
    setTrainerSearch(trainer.name);
    setSelectedTrainerId(trainer.id);
    setFormData((prev) => ({
      ...prev,
      trainerName: trainer.name,
      batchName: trainer.batchName || prev.batchName,
    }));
    setShowTrainerDropdown(false);
  };

  const filteredTrainers = trainers.filter((t) =>
    t.name.toLowerCase().includes(trainerSearch.toLowerCase())
  );

  /* ---------- VALIDATION ---------- */

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.assignmentName) newErrors.assignmentName = "Assignment required";
    if (!formData.college) newErrors.college = "College required";

    if (!formData.trainerName) {
      newErrors.trainerName = "Trainer name required";
    } else if (!trainers.find((t) => t.name === formData.trainerName)) {
      newErrors.trainerName = "Select trainer from list";
    }

    if (!formData.batchName) newErrors.batchName = "Batch required";

    if (!formData.githubLink) newErrors.githubLink = "GitHub link required";
    else if (!/^https?:\/\/.+/.test(formData.githubLink)) newErrors.githubLink = "Enter valid URL";

    if (!formData.sessionDate) newErrors.sessionDate = "Session date required";

    // if (!formData.morningSession1) newErrors.morningSession1 = "Required";
    // if (!formData.morningSession2) newErrors.morningSession2 = "Required";
    // if (!formData.afternoonSession1) newErrors.afternoonSession1 = "Required";
    // if (!formData.afternoonSession2) newErrors.afternoonSession2 = "Required";

    if (!formData.classroom) newErrors.classroom = "Classroom required";
    if (!formData.topicsCovered) newErrors.topicsCovered = "Topics required";

    if (!formData.assignmentLink) newErrors.assignmentLink = "Assignment link required";
    else if (!/^https?:\/\/.+/.test(formData.assignmentLink)) newErrors.assignmentLink = "Enter valid URL";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---------- SUBMIT ---------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await fetch(`${API_URL}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerName: formData.trainerName,
          college: formData.college,
          assignmentName: formData.assignmentName,
          batchName: formData.batchName,
          githubLink: formData.githubLink,
          topicsCovered: formData.topicsCovered,
          assignmentLink: formData.assignmentLink,
          sessionDate: formData.sessionDate,
          classroom: formData.classroom,
          trainerId: selectedTrainerId || undefined,
          morningSession1: Number(formData.morningSession1),
          morningSession2: Number(formData.morningSession2),
          afternoonSession1: Number(formData.afternoonSession1),
          afternoonSession2: Number(formData.afternoonSession2),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      toast.success("Session submitted successfully!");
      setFormData({ ...EMPTY_FORM });
      setTrainerSearch("");
      setSelectedTrainerId("");
      setTocDocuments([]);
      setTocFetched(false);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit session. Please try again.");
    }
  };

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between">
          <h1 className="text-xl text-zinc-900">Trainer Management Portal</h1>
          <div className="flex items-center gap-6">
            {selectedTrainerId ? (
              <Link
                to={`/toc?trainerId=${selectedTrainerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-600 hover:text-zinc-900"
              >
                TOC Documents
              </Link>
            ) : (
              <span
                className="text-sm text-zinc-300 cursor-not-allowed select-none"
                title="Select your name first"
              >
                TOC Documents
              </span>
            )}
            <Link to="/admin/login" className="text-sm text-zinc-600 hover:text-zinc-900">
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-6">
          <h2 className="text-2xl text-red-900">Training Session & Student Attendance</h2>
          <p className="text-zinc-600">Left: Submit session details | Right: Generate QR & manage attendance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Trainer Session Form */}
          <div className="bg-white border border-red-200 p-6 space-y-5 rounded">
            <h3 className="text-lg font-semibold text-red-900">Submit Session Details</h3>
            <form onSubmit={handleSubmit} className="space-y-5">

          {/* 1. Assignment Name */}
          <div>
            <label className="text-sm text-zinc-700">Assignment Name *</label>
            <select
              value={formData.assignmentId}
              onChange={(e) => {
                const selected = assignments.find((a) => a._id === e.target.value);
                if (selected) handleAssignmentSelect(selected);
                else setFormData({ ...EMPTY_FORM, sessionDate: formData.sessionDate });
              }}
              className="w-full px-4 py-2 border"
            >
              <option value="">
                {assignmentsLoading ? "Loading assignments..." : "Select assignment"}
              </option>
              {assignments.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.college})
                </option>
              ))}
            </select>
            {errors.assignmentName && <p className="text-red-600 text-sm">{errors.assignmentName}</p>}
          </div>

          {/* 2. College — auto-filled */}
          <div>
            <label className="text-sm text-zinc-700">College</label>
            <input
              type="text"
              value={formData.college}
              readOnly
              placeholder="Auto-filled from assignment"
              className="w-full px-4 py-2 border bg-zinc-50 text-zinc-600 cursor-not-allowed"
            />
            {errors.college && <p className="text-red-600 text-sm">{errors.college}</p>}
          </div>

          {/* 3. Trainer Name */}
          <div>
            <label className="text-sm text-zinc-700">Trainer Name *</label>
            <div className="relative">
              <input
                type="text"
                value={trainerSearch}
                placeholder={
                  !formData.assignmentName
                    ? "Select assignment first"
                    : "Search your name..."
                }
                disabled={!formData.assignmentName}
                onChange={(e) => {
                  setTrainerSearch(e.target.value);
                  setShowTrainerDropdown(true);
                  setSelectedTrainerId("");
                  setTocDocuments([]);
                  setTocFetched(false);
                  setFormData((prev) => ({ ...prev, trainerName: "", batchName: "" }));
                }}
                onFocus={() => setShowTrainerDropdown(true)}
                className="w-full px-4 py-2 border disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {showTrainerDropdown && formData.assignmentName && (
                <div className="absolute w-full border bg-white z-10 max-h-48 overflow-y-auto shadow-md">
                  {trainersLoading ? (
                    <div className="px-4 py-2 text-sm text-zinc-500">Loading trainers...</div>
                  ) : filteredTrainers.length > 0 ? (
                    filteredTrainers.map((trainer) => (
                      <button
                        key={trainer.id}
                        type="button"
                        onClick={() => handleTrainerSelect(trainer)}
                        className="block w-full px-4 py-2 text-left hover:bg-zinc-50 text-sm"
                      >
                        {trainer.name}
                        {trainer.batchName && (
                          <span className="ml-2 text-xs text-zinc-400">({trainer.batchName})</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-zinc-500">No trainers found</div>
                  )}
                </div>
              )}
            </div>
            {errors.trainerName && <p className="text-red-600 text-sm">{errors.trainerName}</p>}
          </div>

          {/* TOC Documents panel */}
          {(tocLoading || tocFetched) && (
            <div className="border border-zinc-200 rounded p-4 bg-zinc-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-zinc-700">TOC Documents</span>
                <Link
                  to={`/toc?trainerId=${selectedTrainerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-600 hover:text-zinc-900 underline"
                >
                  View all on TOC page →
                </Link>
              </div>
              {tocLoading ? (
                <p className="text-sm text-zinc-500">Loading documents...</p>
              ) : tocDocuments.length === 0 ? (
                <p className="text-sm text-zinc-500">No TOC documents assigned to you yet.</p>
              ) : (
                <div className="space-y-2">
                  {tocDocuments.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center justify-between bg-white border border-zinc-200 rounded px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-800">{doc.title}</p>
                        <p className="text-xs text-zinc-500">{doc.level} · {doc.college}</p>
                        {doc.assignmentName && (
                          <p className="text-xs text-zinc-400">{doc.assignmentName}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs border border-zinc-300 text-zinc-700 hover:bg-zinc-100 rounded"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </a>
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-zinc-900 text-white hover:bg-zinc-700 rounded"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Batch Name — auto-filled from trainer */}
          <div>
            <label className="text-sm text-zinc-700">Batch Name</label>
            <input
              type="text"
              value={formData.batchName}
              readOnly
              placeholder="Auto-filled when trainer is selected"
              className="w-full px-4 py-2 border bg-zinc-50 text-zinc-600 cursor-not-allowed"
            />
            {errors.batchName && <p className="text-red-600 text-sm">{errors.batchName}</p>}
          </div>

          {/* 5. GitHub Link */}
          <div>
            <label className="text-sm">GitHub Link *</label>
            <input
              type="text"
              value={formData.githubLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, githubLink: e.target.value }))}
              className="w-full px-4 py-2 border"
            />
            {errors.githubLink && <p className="text-red-600 text-sm">{errors.githubLink}</p>}
          </div>

          {/* 6. Session Date — defaults to today */}
          <div>
            <label className="text-sm">Session Date *</label>
            <input
              type="date"
              value={formData.sessionDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, sessionDate: e.target.value }))}
              className="w-full px-4 py-2 border"
            />
            {errors.sessionDate && <p className="text-red-600 text-sm">{errors.sessionDate}</p>}
          </div>

          {/* 7. Morning Attendance */}
          <div>
            <label className="text-sm font-medium block mb-2">Morning Attendance *</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-600">Session 1 Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.morningSession1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, morningSession1: e.target.value }))}
                  className="w-full px-4 py-2 border"
                />
                {errors.morningSession1 && <p className="text-red-600 text-sm">{errors.morningSession1}</p>}
              </div>
              <div>
                <label className="text-xs text-zinc-600">Session 2 Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.morningSession2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, morningSession2: e.target.value }))}
                  className="w-full px-4 py-2 border"
                />
                {errors.morningSession2 && <p className="text-red-600 text-sm">{errors.morningSession2}</p>}
              </div>
            </div>
          </div>

          {/* 8. Afternoon Attendance */}
          <div>
            <label className="text-sm font-medium block mb-2">Afternoon Attendance *</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-600">Session 1 Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.afternoonSession1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, afternoonSession1: e.target.value }))}
                  className="w-full px-4 py-2 border"
                />
                {errors.afternoonSession1 && <p className="text-red-600 text-sm">{errors.afternoonSession1}</p>}
              </div>
              <div>
                <label className="text-xs text-zinc-600">Session 2 Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.afternoonSession2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, afternoonSession2: e.target.value }))}
                  className="w-full px-4 py-2 border"
                />
                {errors.afternoonSession2 && <p className="text-red-600 text-sm">{errors.afternoonSession2}</p>}
              </div>
            </div>
          </div>

          {/* 9. Classroom */}
          <div>
            <label className="text-sm">Classroom Allocated *</label>
            <select
              value={formData.classroom}
              onChange={(e) => setFormData((prev) => ({ ...prev, classroom: e.target.value }))}
              className="w-full px-4 py-2 border"
            >
              <option value="">Select classroom</option>
              {classrooms.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {errors.classroom && <p className="text-red-600 text-sm">{errors.classroom}</p>}
          </div>

          {/* 10. Topics Covered */}
          <div>
            <label className="text-sm">Topics Covered *</label>
            <textarea
              rows={4}
              value={formData.topicsCovered}
              placeholder={`Session Coverage:\n• Session 1: DSA Topic Introduction : Arrays, Linked Lists, Stacks, Queues...\n• Session 2: Environment Creation & Platform Introduction\n• Session 3: Basic Programming`}
              onChange={(e) => setFormData((prev) => ({ ...prev, topicsCovered: e.target.value }))}
              className="w-full px-4 py-2 border"
            />
            {errors.topicsCovered && <p className="text-red-600 text-sm">{errors.topicsCovered}</p>}
          </div>

          {/* 11. Assignment Link */}
          <div>
            <label className="text-sm">Assignment Link *</label>
            <input
              type="text"
              value={formData.assignmentLink}
              onChange={(e) => setFormData((prev) => ({ ...prev, assignmentLink: e.target.value }))}
              className="w-full px-4 py-2 border"
            />
            {errors.assignmentLink && <p className="text-red-600 text-sm">{errors.assignmentLink}</p>}
          </div>

          <button type="submit" className="w-full bg-red-900 text-white py-3 hover:bg-red-700/90">
            Submit Session
          </button>
            </form>
          </div>

          {/* RIGHT: Student Attendance Scanner */}
          <StudentAttendanceSection />
        </div>
      </main>
    </div>
  );
}
