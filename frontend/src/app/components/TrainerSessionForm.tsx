import { useEffect, useState } from 'react';
import QRDisplay from './QRDisplay';
import { AlertCircle, Loader } from 'lucide-react';
import { API_URL } from '../../lib/api';


interface Batch {
  _id: string;
  name: string;
  college: string;
  assignmentName: string;
  status: string;
}

interface Classroom {
  _id: string;
  name: string;
  college: string;
  batch: string;
  status: string;
}

export default function TrainerSessionForm() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [batchesLoading, setBatchesLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
    fetchClassrooms();
  }, []);

  const fetchBatches = async () => {
    try {
      setBatchesLoading(true);
      const res = await fetch(`${API_URL}/trainers/batches/all`);
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch batches error:', err);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const res = await fetch(`${API_URL}/classrooms`);
      const data = await res.json();
      setClassrooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch classrooms error:', err);
      setClassrooms([]);
    }
  };

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBatch) {
      setError('Please select a batch');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to generate QR codes');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/attendance/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchId: selectedBatch,
          classroomId: selectedClassroom || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to generate QR code');
        setLoading(false);
        return;
      }

      setQrToken(data.qrToken);
      setExpiresAt(data.expiresAt);
      setLoading(false);
    } catch (err) {
      console.error('Generate QR error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleExpire = () => {
    setQrToken('');
    setExpiresAt('');
  };

  if (qrToken && expiresAt) {
    return (
      <div className="w-full h-full flex flex-col gap-4 p-6 bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900">QR Code Generated</h3>
          <p className="text-sm text-zinc-600 mt-1">Share this with your students</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <QRDisplay
            qrToken={qrToken}
            expiresAt={expiresAt}
            onExpire={handleExpire}
            onGenerate={() => setQrToken('')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 p-6 bg-white">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-zinc-900">Generate QR Code</h3>
        <p className="text-sm text-zinc-600 mt-1">Select a batch to create attendance QR</p>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleGenerateQR} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-700">Select Batch *</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 rounded text-sm mt-1"
          >
            <option value="">
              {batchesLoading ? 'Loading batches...' : 'Choose a batch'}
            </option>
            {batches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.name} - {batch.college} ({batch.assignmentName})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700">Select Classroom (Optional)</label>
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 rounded text-sm mt-1"
          >
            <option value="">Any classroom</option>
            {classrooms.map((classroom) => (
              <option key={classroom._id} value={classroom._id}>
                {classroom.name} - {classroom.college}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedBatch || batchesLoading}
          className="w-full px-4 py-3 bg-red-900 text-white rounded font-medium hover:bg-red-800 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader className="w-4 h-4 animate-spin" />}
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>
      </form>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        <p className="font-medium mb-2">ℹ️ How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>QR code valid for 5 minutes</li>
          <li>Students must enable GPS and camera permissions</li>
          <li>Each student can only mark attendance once per QR code</li>
          <li>Tab switching is disabled during attendance marking</li>
        </ul>
      </div>
    </div>
  );
}
