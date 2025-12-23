import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { ProjectAssignment, User, Project, FunctionRole } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Select, Checkbox } from '../components/Input';

const projectAssignmentSchema = z.object({
  userId: z.string().min(1, 'Usuário é obrigatório'),
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  functionRoleId: z.string().optional(),
  estimatedHours: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = parseInt(val);
    return !isNaN(num) && num > 0;
  }, 'Horas estimadas deve ser um número maior que zero'),
  isActive: z.boolean(),
});

type ProjectAssignmentFormData = z.infer<typeof projectAssignmentSchema>;

export const ProjectAssignments = () => {
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [functionRoles, setFunctionRoles] = useState<FunctionRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignment | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectAssignmentFormData>({
    resolver: zodResolver(projectAssignmentSchema),
    defaultValues: {
      isActive: true,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assignmentsRes, usersRes, projectsRes, rolesRes] = await Promise.all([
        api.get<ProjectAssignment[]>('/project-assignments'),
        api.get<User[]>('/users'),
        api.get<Project[]>('/projects'),
        api.get<FunctionRole[]>('/function-roles'),
      ]);
      setAssignments(assignmentsRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
      setFunctionRoles(rolesRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAssignment(null);
    reset({
      userId: '',
      projectId: '',
      functionRoleId: '',
      estimatedHours: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (assignment: ProjectAssignment) => {
    setEditingAssignment(assignment);
    reset({
      userId: assignment.userId,
      projectId: assignment.projectId,
      functionRoleId: assignment.functionRoleId || '',
      estimatedHours: assignment.estimatedHours?.toString() || '',
      isActive: assignment.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (assignment: ProjectAssignment) => {
    if (!confirm('Tem certeza que deseja excluir esta atribuição?')) {
      return;
    }

    try {
      await api.delete(`/project-assignments/${assignment.id}`);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir atribuição:', error);
      alert('Erro ao excluir atribuição');
    }
  };

  const onSubmit = async (data: ProjectAssignmentFormData) => {
    try {
      const payload: any = {
        userId: data.userId,
        projectId: data.projectId,
        functionRoleId: data.functionRoleId || undefined,
        estimatedHours: data.estimatedHours ? parseInt(data.estimatedHours) : undefined,
        isActive: data.isActive,
      };

      if (editingAssignment) {
        await api.patch(`/project-assignments/${editingAssignment.id}`, payload);
      } else {
        await api.post('/project-assignments', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar atribuição:', error);
      alert(error.response?.data?.message || 'Erro ao salvar atribuição');
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Usuário',
      render: (assignment: ProjectAssignment) => assignment.user?.name || '-',
    },
    {
      key: 'project',
      label: 'Projeto',
      render: (assignment: ProjectAssignment) => assignment.project?.name || '-',
    },
    {
      key: 'functionRole',
      label: 'Função',
      render: (assignment: ProjectAssignment) => assignment.functionRole?.name || '-',
    },
    {
      key: 'estimatedHours',
      label: 'Horas Estimadas',
    },
    {
      key: 'isActive',
      label: 'Ativo',
      render: (assignment: ProjectAssignment) => (assignment.isActive ? 'Sim' : 'Não'),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Atribuições de Projeto</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Nova Atribuição
        </button>
      </div>

      <DataTable
        data={assignments}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssignment ? 'Editar Atribuição' : 'Nova Atribuição'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Usuário"
            required
            register={register('userId')}
            error={errors.userId?.message}
            options={[
              { value: '', label: 'Selecione um usuário' },
              ...users.map((user) => ({ value: user.id, label: user.name })),
            ]}
          />
          <Select
            label="Projeto"
            required
            register={register('projectId')}
            error={errors.projectId?.message}
            options={[
              { value: '', label: 'Selecione um projeto' },
              ...projects.map((project) => ({ value: project.id, label: project.name })),
            ]}
          />
          <Select
            label="Função"
            register={register('functionRoleId')}
            error={errors.functionRoleId?.message}
            options={[
              { value: '', label: 'Nenhuma' },
              ...functionRoles.map((role) => ({ value: role.id, label: role.name })),
            ]}
          />
          <Input
            type="number"
            label="Horas Estimadas"
            register={register('estimatedHours')}
            error={errors.estimatedHours?.message}
          />
          <Checkbox
            label="Ativo"
            register={register('isActive')}
            error={errors.isActive?.message}
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

