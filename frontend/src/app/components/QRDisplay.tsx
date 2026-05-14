import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { AlertCircle } from 'lucide-react';

interface QRDisplayProps {
  qrToken: string;
  expiresAt: string;
  onExpire: () => void;
  onGenerate: () => void;
}

export default function QRDisplay({
  qrToken,
  expiresAt,
  onExpire,
  onGenerate,
}: QRDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(300);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const secondsLeft = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));

      setTimeLeft(secondsLeft);

      if (secondsLeft === 0) {
        setIsExpired(true);
        onExpire();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isExpired) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 border border-red-200 rounded bg-red-50">
        <AlertCircle className="w-12 h-12 text-red-600" />
        <div className="text-center">
          <p className="text-lg font-semibold text-red-900">QR Code Expired</p>
          <p className="text-sm text-red-700 mt-1">Your QR code has expired. Generate a new one.</p>
        </div>
        <button
          onClick={onGenerate}
          className="mt-4 px-6 py-2 bg-red-900 text-white rounded hover:bg-red-800 text-sm font-medium"
        >
          Generate New QR
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-6 bg-zinc-50 rounded border border-zinc-200">
      <div className="bg-white p-4 rounded border border-zinc-200 shadow-sm -webkit-user-select-none user-select-none"
        style={{
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}>
        <QRCode value={`${window.location.origin}/attend?token=${qrToken}`} size={256} level="H" />
      </div>

      <div className="text-center">
        <p className="text-sm text-zinc-600 font-medium">Time Remaining</p>
        <div className="text-3xl font-bold text-red-900 mt-1 font-mono">{formatTime(timeLeft)}</div>
        <p className="text-xs text-zinc-500 mt-2">QR expires in {timeLeft} seconds</p>
      </div>

      <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-red-900 h-full transition-all duration-1000"
          style={{ width: `${(timeLeft / 300) * 100}%` }}
        />
      </div>

      <p className="text-xs text-zinc-500 text-center max-w-xs">
        Share this QR code with students. They have 5 minutes to scan it for attendance.
      </p>
    </div>
  );
}
