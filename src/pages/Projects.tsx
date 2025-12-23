import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { Project, Client, Company, User } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Select } from '../components/Input';

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  companyId: z.string().optional(),
  managerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().min(1, 'Status é obrigatório'),
  costCenter: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
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
    reset({
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
    reset({
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

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const payload: any = {
        ...data,
        companyId: data.companyId || undefined,
        managerId: data.managerId || undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        costCenter: data.costCenter || undefined,
      };

      if (editingProject) {
        await api.patch(`/projects/${editingProject.id}`, payload);
      } else {
        await api.post('/projects', payload);
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
      render: (project: Project) => {
        return project.status === 'ACTIVE' ? 'Ativo' : 'Inativo';
      },
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            type="text"
            label="Nome"
            required
            register={register('name')}
            error={errors.name?.message}
          />
          <Select
            label="Cliente"
            required
            register={register('clientId')}
            error={errors.clientId?.message}
            options={[
              { value: '', label: 'Selecione um cliente' },
              ...clients.map((client) => ({ value: client.id, label: client.name })),
            ]}
          />
          <Select
            label="Empresa"
            register={register('companyId')}
            error={errors.companyId?.message}
            options={[
              { value: '', label: 'Nenhuma' },
              ...companies.map((company) => ({ value: company.id, label: company.name })),
            ]}
          />
          <Select
            label="Gerente"
            register={register('managerId')}
            error={errors.managerId?.message}
            options={[
              { value: '', label: 'Nenhum' },
              ...users.map((user) => ({ value: user.id, label: user.name })),
            ]}
          />
          <Input
            type="date"
            label="Data de Início"
            register={register('startDate')}
            error={errors.startDate?.message}
          />
          <Input
            type="date"
            label="Data de Término"
            register={register('endDate')}
            error={errors.endDate?.message}
          />
          <Input
            type="text"
            label="Status"
            required
            register={register('status')}
            error={errors.status?.message}
          />
          <Input
            type="text"
            label="Centro de Custo"
            register={register('costCenter')}
            error={errors.costCenter?.message}
          />
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

