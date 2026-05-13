import TrainerSessionForm from '../components/TrainerSessionForm';
import StudentAttendanceScanner from '../components/StudentAttendanceScanner';

export default function StudentAttendance() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-xl text-zinc-900 font-semibold">Student Attendance Management</h1>
          <p className="text-sm text-zinc-600 mt-1">Generate QR codes and mark student attendance</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left Side: Trainer Session Form */}
          <div className="bg-white rounded border border-zinc-200 overflow-hidden shadow-sm">
            <TrainerSessionForm />
          </div>

          {/* Right Side: Student Attendance Scanner */}
          <div className="bg-white rounded border border-zinc-200 overflow-hidden shadow-sm">
            <StudentAttendanceScanner />
          </div>
        </div>
      </main>
    </div>
  );
}
