import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    clients: 0,
    projects: 0,
    timesheetEntries: 0,
    invoices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const requests: Promise<any>[] = [];
        const statsData: any = {};

        // Apenas ADMIN pode ver usuários
        if (user?.role === UserRole.ADMIN) {
          requests.push(
            api.get('/users').then((res) => {
              statsData.users = res.data.length;
            }).catch(() => {
              statsData.users = 0;
            })
          );
        }

        // ADMIN e gestores (PROJECT_MANAGER, PEOPLE_MANAGER, COMPANY_MANAGER) podem ver clientes
        if (user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER || user?.role === UserRole.PEOPLE_MANAGER || user?.role === UserRole.COMPANY_MANAGER) {
          requests.push(
            api.get('/clients').then((res) => {
              statsData.clients = res.data.length;
            }).catch(() => {
              statsData.clients = 0;
            })
          );
        }

        // ADMIN e gestores podem ver projetos
        if (user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER || user?.role === UserRole.PEOPLE_MANAGER || user?.role === UserRole.COMPANY_MANAGER) {
          requests.push(
            api.get('/projects').then((res) => {
              statsData.projects = res.data.length;
            }).catch(() => {
              statsData.projects = 0;
            })
          );
        }

        // ADMIN, gestores e CONSULTANT podem ver lançamentos
        if (
          user?.role === UserRole.ADMIN ||
          user?.role === UserRole.PROJECT_MANAGER ||
          user?.role === UserRole.PEOPLE_MANAGER ||
          user?.role === UserRole.COMPANY_MANAGER ||
          user?.role === UserRole.CONSULTANT
        ) {
          requests.push(
            api.get('/timesheet-entries').then((res) => {
              statsData.timesheetEntries = res.data.length;
            }).catch(() => {
              statsData.timesheetEntries = 0;
            })
          );
        }

        // ADMIN, FINANCE e CONSULTANT podem ver faturas
        if (
          user?.role === UserRole.ADMIN ||
          user?.role === UserRole.FINANCE ||
          user?.role === UserRole.CONSULTANT
        ) {
          requests.push(
            api.get('/invoices').then((res) => {
              statsData.invoices = res.data.length;
            }).catch(() => {
              statsData.invoices = 0;
            })
          );
        }

        await Promise.all(requests);
        setStats((prev) => ({ ...prev, ...statsData }));
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-8 text-secondary-600">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-2">Carregando...</p>
      </div>
    );
  }

  const getVisibleCards = () => {
    const cards = [];

    if (user?.role === UserRole.ADMIN) {
      cards.push(
        <div key="users" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 p-3 rounded-lg">
              <div className="text-2xl">👥</div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-secondary-600 truncate">Usuários</dt>
                <dd className="text-2xl font-bold text-primary-600">{stats.users}</dd>
              </dl>
            </div>
          </div>
        </div>
      );
    }

    if (user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER || user?.role === UserRole.PEOPLE_MANAGER || user?.role === UserRole.COMPANY_MANAGER) {
      cards.push(
        <div key="clients" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-success-100 p-3 rounded-lg">
              <div className="text-2xl">🏢</div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-secondary-600 truncate">Clientes</dt>
                <dd className="text-2xl font-bold text-success-600">{stats.clients}</dd>
              </dl>
            </div>
          </div>
        </div>
      );

      cards.push(
        <div key="projects" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-warning-100 p-3 rounded-lg">
              <div className="text-2xl">📁</div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-secondary-600 truncate">Projetos</dt>
                <dd className="text-2xl font-bold text-warning-600">{stats.projects}</dd>
              </dl>
            </div>
          </div>
        </div>
      );
    }

    if (
      user?.role === UserRole.ADMIN ||
      user?.role === UserRole.PROJECT_MANAGER ||
      user?.role === UserRole.PEOPLE_MANAGER ||
      user?.role === UserRole.COMPANY_MANAGER ||
      user?.role === UserRole.CONSULTANT
    ) {
      cards.push(
        <div key="timesheets" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-secondary-100 p-3 rounded-lg">
              <div className="text-2xl">⏰</div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-secondary-600 truncate">Lançamentos</dt>
                <dd className="text-2xl font-bold text-secondary-600">{stats.timesheetEntries}</dd>
              </dl>
            </div>
          </div>
        </div>
      );
    }

    if (
      user?.role === UserRole.ADMIN ||
      user?.role === UserRole.FINANCE ||
      user?.role === UserRole.CONSULTANT
    ) {
      cards.push(
        <div key="invoices" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-100 p-3 rounded-lg">
              <div className="text-2xl">💰</div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-secondary-600 truncate">Faturas</dt>
                <dd className="text-2xl font-bold text-primary-600">{stats.invoices}</dd>
              </dl>
            </div>
          </div>
        </div>
      );
    }

    return cards;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary-700 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {getVisibleCards()}
      </div>
    </div>
  );
};

