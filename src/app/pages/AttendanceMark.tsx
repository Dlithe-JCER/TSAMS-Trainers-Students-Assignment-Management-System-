import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle2, MapPin, Loader, AlertCircle, ShieldAlert } from "lucide-react";
import { useTabLock } from "../hooks/useTabLock";
import { API_URL } from '../../lib/api';

type TokenInfo = {
  session: string;
  sessionLabel: string;
  batchName: string;
  college: string;
  expiresAt: string;
};

export default function AttendanceMark() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState("");

  const [gpsState, setGpsState] = useState<"pending" | "granted" | "denied">("pending");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [name, setName] = useState("");
  const [usn, setUsn]   = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError]     = useState("");
  const [success, setSuccess]             = useState(false);
  const [submittedName, setSubmittedName] = useState("");

  const [timeToSubmit, setTimeToSubmit] = useState(300);
  const submitAllowed = timeToSubmit <= 0;

  const [tabHidden, setTabHidden] = useState(false);

  // Tab lock: beforeunload + alert on visibilitychange
  useTabLock(!!tokenInfo && !success);

  // Visual overlay on visibilitychange (mobile-friendly)
  useEffect(() => {
    if (!tokenInfo || success) return;
    const handler = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [tokenInfo, success]);

  // Validate token
  useEffect(() => {
    if (!token) { setTokenError("Invalid link — no token found."); setTokenLoading(false); return; }
    fetch(`${API_URL}/sessions/validate/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setTokenInfo(d);
        else setTokenError(d.message || "QR code is invalid or expired.");
      })
      .catch(() => setTokenError("Could not verify QR code. Check your connection."))
      .finally(() => setTokenLoading(false));
  }, [token]);

  // Auto-request GPS immediately after token validates
  useEffect(() => {
    if (!tokenInfo) return;
    if (!navigator.geolocation) { setGpsState("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGpsState("granted");
      },
      () => setGpsState("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [tokenInfo]);

  // Countdown: seconds until QR expires (submit unlocks at 0)
  useEffect(() => {
    if (!tokenInfo) return;
    const tick = () => {
      const left = Math.ceil((new Date(tokenInfo.expiresAt).getTime() - Date.now()) / 1000);
      setTimeToSubmit(Math.max(0, left));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [tokenInfo]);

  const retryGPS = () => {
    if (!navigator.geolocation) return;
    setGpsState("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGpsState("granted");
      },
      () => setGpsState("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!usn.trim())  e.usn  = "USN is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate() || !submitAllowed) return;
    setSubmitLoading(true);
    setSubmitError("");
    try {
      const res = await fetch(`${API_URL}/sessions/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          studentName: name.trim(),
          usn: usn.trim().toUpperCase(),
          latitude:  coords?.latitude  ?? null,
          longitude: coords?.longitude ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message || "Submission failed.");
      } else {
        setSubmittedName(name.trim());
        setSuccess(true);
      }
    } catch {
      setSubmitError("Could not reach server. Check your connection.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ---- Loading ---- */
  if (tokenLoading) {
    return (
      <div className="min-h-screen bg-[#f0ebf8] flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#673ab7]" />
      </div>
    );
  }

  /* ---- Token error ---- */
  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#f0ebf8] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border-t-8 border-t-red-500 max-w-sm w-full p-8 text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-medium text-zinc-800">QR Invalid or Expired</h2>
          <p className="text-sm text-zinc-500">{tokenError}</p>
        </div>
      </div>
    );
  }

  /* ---- Success ---- */
  if (success) {
    return (
      <div className="min-h-screen bg-[#f0ebf8] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border-t-8 border-t-[#0f9d58] max-w-sm w-full p-10 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-[#0f9d58] mx-auto" />
          <h2 className="text-2xl font-medium text-zinc-800">Attendance Marked!</h2>
          <p className="text-zinc-600">Thank you, <span className="font-semibold">{submittedName}</span>.</p>
          <div className="text-sm text-zinc-400 pt-2 space-y-0.5">
            <p>{tokenInfo?.sessionLabel}</p>
            <p>{tokenInfo?.batchName} · {tokenInfo?.college}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- GPS pending (auto-requesting) ---- */
  if (gpsState === "pending") {
    return (
      <div className="min-h-screen bg-[#f0ebf8] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border-t-8 border-t-[#673ab7] max-w-sm w-full p-8 text-center space-y-4">
          <MapPin className="w-12 h-12 text-[#673ab7] mx-auto animate-pulse" />
          <h2 className="text-lg font-medium text-zinc-800">Enable GPS Location</h2>
          <p className="text-sm text-zinc-500">
            Your location is required to mark attendance. Please allow location access when prompted by your browser.
          </p>
          <Loader className="w-5 h-5 animate-spin text-[#673ab7] mx-auto" />
        </div>
      </div>
    );
  }

  /* ---- GPS denied ---- */
  if (gpsState === "denied") {
    return (
      <div className="min-h-screen bg-[#f0ebf8] flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-sm border-t-8 border-t-red-500 max-w-sm w-full p-8 text-center space-y-4">
          <MapPin className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-medium text-zinc-800">GPS Required</h2>
          <p className="text-sm text-zinc-500">
            Location access was denied. Enable GPS in your browser/device settings and tap Retry.
          </p>
          <button
            onClick={retryGPS}
            className="px-6 py-2 bg-[#673ab7] text-white text-sm font-medium rounded hover:bg-[#5e35b1]"
          >
            Retry GPS
          </button>
        </div>
      </div>
    );
  }

  /* ---- Main form ---- */
  return (
    <div className="min-h-screen bg-[#f0ebf8] px-4 py-10 flex flex-col items-center gap-4">

      {/* Tab-hidden blocking overlay */}
      {tabHidden && (
        <div className="fixed inset-0 bg-red-900/95 z-50 flex flex-col items-center justify-center text-white text-center px-6">
          <ShieldAlert className="w-16 h-16 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Stay on this page!</h2>
          <p className="text-red-200">Switching away during attendance is not allowed.</p>
          <p className="text-red-200 mt-1">Return to this tab to continue.</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border-t-8 border-t-[#673ab7] max-w-lg w-full px-8 py-6">
        <h1 className="text-2xl font-normal text-zinc-800">{tokenInfo?.sessionLabel} Attendance</h1>
        <p className="text-sm text-zinc-500 mt-1">{tokenInfo?.batchName} · {tokenInfo?.college}</p>
        <p className="text-xs text-red-600 mt-3">* Required</p>
      </div>

      {/* GPS captured badge */}
      <div className="max-w-lg w-full flex items-center gap-2 bg-green-50 border border-green-200 rounded px-4 py-2">
        <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span className="text-sm text-green-700">
          Location captured ({coords!.latitude.toFixed(4)}, {coords!.longitude.toFixed(4)})
        </span>
      </div>

      {/* Countdown / ready banner */}
      {!submitAllowed ? (
        <div className="max-w-lg w-full bg-amber-50 border border-amber-200 rounded px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-800">Fill the form below</p>
            <p className="text-xs text-amber-600">Submit unlocks when this session ends</p>
          </div>
          <span className="text-2xl font-mono font-bold text-amber-700">{fmt(timeToSubmit)}</span>
        </div>
      ) : (
        <div className="max-w-lg w-full bg-green-50 border border-green-200 rounded px-4 py-2">
          <p className="text-sm font-medium text-green-700">Session ended — you can now submit your attendance.</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm max-w-lg w-full px-8 py-6 space-y-6">

        {/* Batch — read-only, from QR token */}
        <div className="space-y-1">
          <label className="text-sm text-zinc-700">Batch</label>
          <input
            type="text"
            value={tokenInfo?.batchName || ""}
            readOnly
            tabIndex={-1}
            className="w-full border-b-2 border-b-zinc-200 outline-none py-1.5 text-sm bg-transparent text-zinc-500 cursor-not-allowed select-none"
          />
        </div>

        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-sm text-zinc-700">Full Name <span className="text-red-600">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
            placeholder="Your full name"
            className={`w-full border-b-2 ${errors.name ? "border-b-red-500" : "border-b-zinc-300 focus:border-b-[#673ab7]"} outline-none py-1.5 text-sm bg-transparent transition-colors`}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </div>

        {/* USN */}
        <div className="space-y-1">
          <label className="text-sm text-zinc-700">USN <span className="text-red-600">*</span></label>
          <input
            type="text"
            value={usn}
            onChange={(e) => { setUsn(e.target.value.toUpperCase()); setErrors((p) => ({ ...p, usn: "" })); }}
            placeholder="e.g. 4NM22CS001"
            className={`w-full border-b-2 ${errors.usn ? "border-b-red-500" : "border-b-zinc-300 focus:border-b-[#673ab7]"} outline-none py-1.5 text-sm bg-transparent transition-colors`}
          />
          {errors.usn && <p className="text-xs text-red-600">{errors.usn}</p>}
        </div>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{submitError}</p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={submitLoading || !submitAllowed}
            className="px-6 py-2.5 bg-[#673ab7] text-white text-sm font-medium rounded hover:bg-[#5e35b1] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitLoading && <Loader className="w-4 h-4 animate-spin" />}
            {!submitAllowed ? `Submit in ${fmt(timeToSubmit)}` : "Submit Attendance"}
          </button>
          <button
            type="button"
            onClick={() => { setName(""); setUsn(""); setErrors({}); setSubmitError(""); }}
            className="text-sm text-[#673ab7] hover:underline"
          >
            Clear form
          </button>
        </div>
      </form>

      <p className="text-xs text-zinc-400 max-w-lg w-full text-center">
        Never submit passwords through this form.
      </p>
    </div>
  );
}
