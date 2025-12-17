import { useEffect, useState } from 'react';
import { api } from '../config/api';

export const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    clients: 0,
    projects: 0,
    timesheetEntries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, clientsRes, projectsRes, timesheetsRes] = await Promise.all([
          api.get('/users'),
          api.get('/clients'),
          api.get('/projects'),
          api.get('/timesheet-entries'),
        ]);

        setStats({
          users: usersRes.data.length,
          clients: clientsRes.data.length,
          projects: projectsRes.data.length,
          timesheetEntries: timesheetsRes.data.length,
        });
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-secondary-600">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-2">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary-700 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card hover:shadow-lg transition-shadow">
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

        <div className="card hover:shadow-lg transition-shadow">
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

        <div className="card hover:shadow-lg transition-shadow">
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

        <div className="card hover:shadow-lg transition-shadow">
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
      </div>
    </div>
  );
};

