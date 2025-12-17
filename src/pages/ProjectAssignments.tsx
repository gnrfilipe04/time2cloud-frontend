import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { ProjectAssignment, User, Project, FunctionRole } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const ProjectAssignments = () => {
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [functionRoles, setFunctionRoles] = useState<FunctionRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignment | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    projectId: '',
    functionRoleId: '',
    estimatedHours: '',
    isActive: true,
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
    setFormData({
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
    setFormData({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        userId: formData.userId,
        projectId: formData.projectId,
        functionRoleId: formData.functionRoleId || undefined,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
        isActive: formData.isActive,
      };

      if (editingAssignment) {
        await api.patch(`/project-assignments/${editingAssignment.id}`, data);
      } else {
        await api.post('/project-assignments', data);
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
            <label className="block text-sm font-medium text-secondary-700">Função</label>
            <select
              className="input-base"
              value={formData.functionRoleId}
              onChange={(e) => setFormData({ ...formData, functionRoleId: e.target.value })}
            >
              <option value="">Nenhuma</option>
              {functionRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Horas Estimadas</label>
            <input
              type="number"
              className="input-base"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Ativo
            </label>
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

