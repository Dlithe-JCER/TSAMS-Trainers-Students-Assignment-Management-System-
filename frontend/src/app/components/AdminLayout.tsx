import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, LogOut, FileText, Building, ClipboardList, Layers, GraduationCap, School } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Submissions', icon: LayoutDashboard },
    { path: '/admin/trainers', label: 'Trainers', icon: Users },
    { path: '/admin/classrooms', label: 'Classrooms', icon: Building },
    { path: '/admin/toc', label: 'TOC Documents', icon: FileText },
    { path: '/admin/batches', label: 'Batches', icon: Layers },
    { path: '/admin/students', label: 'Students', icon: GraduationCap },
    ...(isSuperAdmin ? [{ path: '/admin/assignments', label: 'Assignments', icon: ClipboardList }] : []),
    ...(isSuperAdmin ? [{ path: '/admin/colleges', label: 'Colleges', icon: School }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/admin/toc')} className="text-xl text-foreground font-semibold hover:text-muted-foreground">
            Welcome Back
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <nav className="flex gap-1 mb-8 border-b border-border">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                  isActive
                    ? 'border-red-700 text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>

      <footer className="border-t border-border mt-12 bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* <img src="/src/styles/images.png" alt="DLithe" className="h-10 w-auto" /> */}
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} DLithe. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
