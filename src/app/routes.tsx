import { createBrowserRouter } from 'react-router';
import TrainerSubmission from './pages/TrainerSubmission';
import AttendanceMark from './pages/AttendanceMark';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import TrainerManagement from './pages/TrainerManagement';
import ClassroomManagement from './pages/ClassroomManagement';
import TocDocuments from './pages/TocDocuments';
import TocDocumentsPublic from './pages/TocDocumentsPublic';
import AdminAssignments from './pages/AdminAssignments';
import AdminBatches from './pages/AdminBatches';
import StudentAttendance from './pages/StudentAttendance';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: TrainerSubmission,
  },
  {
    path: '/attend',
    Component: AttendanceMark,
  },
  {
    path: '/toc',
    Component: TocDocumentsPublic,
  },
  {
    path: '/attendance',
    element: (
      <ProtectedRoute>
        <StudentAttendance />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/login',
    Component: AdminLogin,
  },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/trainers',
    element: (
      <ProtectedRoute>
        <TrainerManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/classrooms',
    element: (
      <ProtectedRoute>
        <ClassroomManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/toc',
    element: (
      <ProtectedRoute>
        <TocDocuments />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/batches',
    element: (
      <ProtectedRoute>
        <AdminBatches />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/assignments',
    element: (
      <ProtectedRoute>
        <AdminAssignments />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl text-zinc-900 mb-4">404</h1>
          <p className="text-zinc-600 mb-6">Page not found</p>
          <a href="/" className="text-zinc-900 hover:underline">
            Return to home
          </a>
        </div>
      </div>
    ),
  },
]);
