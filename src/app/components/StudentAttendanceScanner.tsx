import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useTabLock } from '../hooks/useTabLock';
import { useGPS } from '../hooks/useGPS';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:5000/api';

interface ScanResult {
  studentName: string;
  usn: string;
  batchName: string;
  college: string;
}

export default function StudentAttendanceScanner() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [qrToken, setQrToken] = useState('');
  const [formData, setFormData] = useState<ScanResult>({
    studentName: '',
    usn: '',
    batchName: '',
    college: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { coordinates, getLocation, loading: gpsLoading, error: gpsError } = useGPS();
  useTabLock(!!qrToken && !submitted);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-scanner',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: ['WEB_CAMERA', 'CAMERA_ENUMERATION'],
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        if (!submitted) {
          setQrToken(decodedText);
          setError('');
          setSuccess(false);
          // Stop scanner after successful scan
          scanner.pause();
        }
      },
      (err) => {
        // Suppress errors
        if (err && !err.toString().includes('NotFoundException')) {
          console.debug('QR scan debug:', err);
        }
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [submitted]);

  const validateQRAndMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!qrToken) {
      setError('Please scan a QR code first');
      return;
    }

    if (!formData.studentName || !formData.usn || !formData.batchName || !formData.college) {
      setError('All fields are required');
      return;
    }

    if (!coordinates) {
      setError('GPS location is required. Please allow location access.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate QR is still valid
      const statusRes = await fetch(`${API_URL}/attendance/qr-status/${qrToken}`);
      const statusData = await statusRes.json();

      if (!statusData.isValid) {
        setError(statusData.message || 'Invalid or expired QR code');
        setLoading(false);
        return;
      }

      // Mark attendance
      const attendanceRes = await fetch(`${API_URL}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken,
          studentName: formData.studentName,
          usn: formData.usn,
          batchName: formData.batchName,
          college: formData.college,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      });

      const attendanceData = await attendanceRes.json();

      if (!attendanceRes.ok) {
        setError(attendanceData.message || 'Failed to mark attendance');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setSubmitted(true);
      setLoading(false);

      // Reset after 3 seconds
      setTimeout(() => {
        setQrToken('');
        setFormData({ studentName: '', usn: '', batchName: '', college: '' });
        setSuccess(false);
        setSubmitted(false);
        if (scannerRef.current) {
          scannerRef.current.resume().catch(() => {});
        }
      }, 3000);
    } catch (err) {
      console.error('Attendance submission error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (success && submitted) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 bg-green-50 rounded border border-green-200">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
        <div className="text-center">
          <p className="text-lg font-semibold text-green-900">Attendance Marked!</p>
          <p className="text-sm text-green-700 mt-2">
            Welcome, {formData.studentName}. Your attendance has been recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 p-6 bg-white">
      <div className="text-center mb-2">
        <h3 className="text-lg font-semibold text-zinc-900">Student Attendance Scanner</h3>
        <p className="text-sm text-zinc-600 mt-1">Scan QR code and fill in your details</p>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* QR Scanner */}
      <div className="border border-zinc-300 rounded bg-black p-2 overflow-hidden -webkit-user-select-none user-select-none"
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}>
        <div id="qr-scanner" style={{ width: '100%', height: '250px' }} />
      </div>

      {/* Form */}
      <form onSubmit={validateQRAndMarkAttendance} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-zinc-700">Student Name *</label>
          <input
            type="text"
            value={formData.studentName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, studentName: e.target.value }))
            }
            placeholder="Enter your full name"
            className="w-full px-3 py-2 border border-zinc-300 rounded text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700">USN *</label>
          <input
            type="text"
            value={formData.usn}
            onChange={(e) => setFormData((prev) => ({ ...prev, usn: e.target.value }))}
            placeholder="Enter your USN (e.g., 1MT22CS001)"
            className="w-full px-3 py-2 border border-zinc-300 rounded text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700">Batch Name *</label>
          <input
            type="text"
            value={formData.batchName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, batchName: e.target.value }))
            }
            placeholder="Enter batch name"
            className="w-full px-3 py-2 border border-zinc-300 rounded text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700">College *</label>
          <input
            type="text"
            value={formData.college}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, college: e.target.value }))
            }
            placeholder="Enter college name"
            className="w-full px-3 py-2 border border-zinc-300 rounded text-sm"
          />
        </div>

        {/* GPS Status */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs font-medium text-blue-900">
            {gpsLoading && 'Getting location...'}
            {gpsError && <span className="text-red-600">{gpsError}</span>}
            {coordinates && !gpsError && (
              <span className="text-green-600">
                ✓ Location captured ({coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)})
              </span>
            )}
            {!coordinates && !gpsLoading && !gpsError && 'Location not yet captured'}
          </p>
        </div>

        {/* Get GPS Button */}
        {!coordinates && (
          <button
            type="button"
            onClick={getLocation}
            disabled={gpsLoading}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {gpsLoading ? 'Getting Location...' : 'Capture GPS Location'}
          </button>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !qrToken || !coordinates}
          className="w-full px-3 py-2 bg-red-900 text-white text-sm rounded hover:bg-red-800 disabled:opacity-60 font-medium"
        >
          {loading ? 'Submitting...' : 'Mark Attendance'}
        </button>
      </form>

      {qrToken && (
        <p className="text-xs text-zinc-500 text-center p-2 bg-zinc-50 rounded">
          QR Code Scanned: <span className="font-mono text-zinc-700">{qrToken.substring(0, 8)}...</span>
        </p>
      )}
    </div>
  );
}
