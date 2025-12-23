import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { FunctionRole } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Textarea } from '../components/Input';

const functionRoleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
});

type FunctionRoleFormData = z.infer<typeof functionRoleSchema>;

export const FunctionRoles = () => {
  const [functionRoles, setFunctionRoles] = useState<FunctionRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<FunctionRole | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FunctionRoleFormData>({
    resolver: zodResolver(functionRoleSchema),
  });

  useEffect(() => {
    fetchFunctionRoles();
  }, []);

  const fetchFunctionRoles = async () => {
    try {
      const response = await api.get<FunctionRole[]>('/function-roles');
      setFunctionRoles(response.data);
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRole(null);
    reset({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (role: FunctionRole) => {
    setEditingRole(role);
    reset({
      name: role.name,
      description: role.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (role: FunctionRole) => {
    if (!confirm(`Tem certeza que deseja excluir a função ${role.name}?`)) {
      return;
    }

    try {
      await api.delete(`/function-roles/${role.id}`);
      fetchFunctionRoles();
    } catch (error) {
      console.error('Erro ao excluir função:', error);
      alert('Erro ao excluir função');
    }
  };

  const onSubmit = async (data: FunctionRoleFormData) => {
    try {
      if (editingRole) {
        await api.patch(`/function-roles/${editingRole.id}`, data);
      } else {
        await api.post('/function-roles', data);
      }
      setIsModalOpen(false);
      fetchFunctionRoles();
    } catch (error: any) {
      console.error('Erro ao salvar função:', error);
      alert(error.response?.data?.message || 'Erro ao salvar função');
    }
  };

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Descrição' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Funções</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Nova Função
        </button>
      </div>

      <DataTable
        data={functionRoles}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? 'Editar Função' : 'Nova Função'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            type="text"
            label="Nome"
            required
            register={register('name')}
            error={errors.name?.message}
          />
          <Textarea
            label="Descrição"
            rows={3}
            register={register('description')}
            error={errors.description?.message}
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

