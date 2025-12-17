import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { TimesheetEntry, User, Project, TimesheetStatus } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { statusColors, statusTexts } from '../constants';

export const TimesheetEntries = () => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    projectId: '',
    date: '',
    hours: '',
    activityType: '',
    notes: '',
    status: TimesheetStatus.PENDING,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, usersRes, projectsRes] = await Promise.all([
        api.get<TimesheetEntry[]>('/timesheet-entries'),
        api.get<User[]>('/users'),
        api.get<Project[]>('/projects'),
      ]);
      setEntries(entriesRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setFormData({
      userId: '',
      projectId: '',
      date: new Date().toISOString().split('T')[0],
      hours: '',
      activityType: '',
      notes: '',
      status: TimesheetStatus.PENDING,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setFormData({
      userId: entry.userId,
      projectId: entry.projectId,
      date: new Date(entry.date).toISOString().split('T')[0],
      hours: entry.hours.toString(),
      activityType: entry.activityType,
      notes: entry.notes || '',
      status: entry.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (entry: TimesheetEntry) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) {
      return;
    }

    try {
      await api.delete(`/timesheet-entries/${entry.id}`);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      alert('Erro ao excluir lançamento');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        userId: formData.userId,
        projectId: formData.projectId,
        date: new Date(formData.date),
        hours: parseFloat(formData.hours),
        activityType: formData.activityType,
        notes: formData.notes || undefined,
        status: formData.status,
      };

      if (editingEntry) {
        await api.patch(`/timesheet-entries/${editingEntry.id}`, data);
      } else {
        await api.post('/timesheet-entries', data);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      alert(error.response?.data?.message || 'Erro ao salvar lançamento');
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Usuário',
      render: (entry: TimesheetEntry) => entry.user?.name || '-',
    },
    {
      key: 'project',
      label: 'Projeto',
      render: (entry: TimesheetEntry) => entry.project?.name || '-',
    },
    {
      key: 'date',
      label: 'Data',
      render: (entry: TimesheetEntry) => new Date(entry.date).toLocaleDateString('pt-BR'),
    },
    {
      key: 'hours',
      label: 'Horas',
    },
    {
      key: 'activityType',
      label: 'Tipo de Atividade',
    },
    {
      key: 'status',
      label: 'Status',
      render: (entry: TimesheetEntry) => {

        return (
          <span className={statusColors[entry.status]}>
            {statusTexts[entry.status]}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Lançamentos de Horas</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Novo Lançamento
        </button>
      </div>

      <DataTable
        data={entries}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700">Usuário *</label>
            <select
              required
              className="input-base"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            >
              <option value="">Selecione um usuário</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Projeto *</label>
            <select
              required
              className="input-base"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            >
              <option value="">Selecione um projeto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Data *</label>
            <input
              type="date"
              required
              className="input-base"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Horas *</label>
            <input
              type="number"
              step="0.5"
              required
              className="input-base"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Tipo de Atividade *</label>
            <input
              type="text"
              required
              className="input-base"
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Notas</label>
            <textarea
              className="input-base"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Status</label>
            <select
              className="input-base"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as TimesheetStatus })}
            >
              {Object.values(TimesheetStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

