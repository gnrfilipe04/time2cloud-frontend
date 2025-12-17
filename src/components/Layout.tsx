import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/users', label: 'Usuários' },
    { path: '/clients', label: 'Clientes' },
    { path: '/companies', label: 'Empresas' },
    { path: '/projects', label: 'Projetos' },
    { path: '/project-assignments', label: 'Atribuições' },
    { path: '/timesheet-entries', label: 'Lançamentos' },
    { path: '/invoices', label: 'Faturas' },
    { path: '/function-roles', label: 'Funções' },
  ];

  return (
    <div className="min-h-screen bg-secondary-50">
      <nav className="bg-white shadow-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary-600">Time2Cloud</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'border-primary-600 text-primary-700 font-semibold'
                        : 'border-transparent text-secondary-600 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-secondary-700 font-medium">{user?.name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="btn-error text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

