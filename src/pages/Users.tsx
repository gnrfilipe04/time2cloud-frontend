import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { User, UserRole } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Select, Checkbox } from '../components/Input';

const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().optional(),
  role: z.nativeEnum(UserRole),
  contractType: z.string().optional(),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: UserRole.CONSULTANT,
      isActive: true,
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get<User[]>('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    reset({
      name: '',
      email: '',
      password: '',
      role: UserRole.CONSULTANT,
      contractType: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    reset({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      contractType: user.contractType || '',
      isActive: user.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      return;
    }

    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      if (editingUser) {
        const updateData: any = { ...data };
        if (!updateData.password || updateData.password === '') {
          delete updateData.password;
        }
        await api.patch(`/users/${editingUser.id}`, updateData);
      } else {
        if (!data.password || data.password === '') {
          alert('Senha é obrigatória para novos usuários');
          return;
        }
        await api.post('/users', data);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      alert(error.response?.data?.message || 'Erro ao salvar usuário');
    }
  };

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Função' },
    { key: 'contractType', label: 'Tipo de Contrato' },
    {
      key: 'isActive',
      label: 'Ativo',
      render: (user: User) => (user.isActive ? 'Sim' : 'Não'),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Usuários</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Novo Usuário
        </button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            type="text"
            label="Nome"
            required
            register={register('name')}
            error={errors.name?.message}
          />
          <Input
            type="email"
            label="Email"
            required
            register={register('email')}
            error={errors.email?.message}
          />
          <Input
            type="password"
            label={editingUser ? 'Senha (deixe em branco para não alterar)' : 'Senha'}
            required={!editingUser}
            register={register('password')}
            error={errors.password?.message}
          />
          <Select
            label="Função"
            register={register('role')}
            error={errors.role?.message}
            options={Object.values(UserRole).map((role) => ({
              value: role,
              label: role,
            }))}
          />
          <Input
            type="text"
            label="Tipo de Contrato"
            register={register('contractType')}
            error={errors.contractType?.message}
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

