import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { Project, Client, Company, User } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    companyId: '',
    managerId: '',
    startDate: '',
    endDate: '',
    status: '',
    costCenter: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, clientsRes, companiesRes, usersRes] = await Promise.all([
        api.get<Project[]>('/projects'),
        api.get<Client[]>('/clients'),
        api.get<Company[]>('/companies'),
        api.get<User[]>('/users'),
      ]);
      setProjects(projectsRes.data);
      setClients(clientsRes.data);
      setCompanies(companiesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      clientId: '',
      companyId: '',
      managerId: '',
      startDate: '',
      endDate: '',
      status: '',
      costCenter: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      clientId: project.clientId,
      companyId: project.companyId || '',
      managerId: project.managerId || '',
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      status: project.status,
      costCenter: project.costCenter || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Tem certeza que deseja excluir o projeto ${project.name}?`)) {
      return;
    }

    try {
      await api.delete(`/projects/${project.id}`);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      alert('Erro ao excluir projeto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        ...formData,
        clientId: formData.clientId,
        companyId: formData.companyId || undefined,
        managerId: formData.managerId || undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        costCenter: formData.costCenter || undefined,
      };

      if (editingProject) {
        await api.patch(`/projects/${editingProject.id}`, data);
      } else {
        await api.post('/projects', data);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar projeto:', error);
      alert(error.response?.data?.message || 'Erro ao salvar projeto');
    }
  };

  const columns = [
    { key: 'name', label: 'Nome' },
    {
      key: 'client',
      label: 'Cliente',
      render: (project: Project) => project.client?.name || '-',
    },
    {
      key: 'status',
      label: 'Status',
    },
    {
      key: 'manager',
      label: 'Gerente',
      render: (project: Project) => project.manager?.name || '-',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Projetos</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Novo Projeto
        </button>
      </div>

      <DataTable
        data={projects}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? 'Editar Projeto' : 'Novo Projeto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700">Nome</label>
            <input
              type="text"
              required
              className="input-base"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Cliente *</label>
            <select
              required
              className="input-base"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Empresa</label>
            <select
              className="input-base"
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
            >
              <option value="">Nenhuma</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Gerente</label>
            <select
              className="input-base"
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
            >
              <option value="">Nenhum</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Data de Início</label>
            <input
              type="date"
              className="input-base"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Data de Término</label>
            <input
              type="date"
              className="input-base"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Status</label>
            <input
              type="text"
              required
              className="input-base"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Centro de Custo</label>
            <input
              type="text"
              className="input-base"
              value={formData.costCenter}
              onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
            />
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

