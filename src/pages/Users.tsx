import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { User, UserRole, Company, ContractType } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Select, Checkbox, CurrencyInput } from '../components/Input';
import { useFilters } from '../hooks/useFilters';

const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().optional(),
  role: z.nativeEnum(UserRole),
  contractType: z.nativeEnum(ContractType),
  companyId: z.string().optional(),
  hourlyRate: z
    .string()
    .min(1, 'Valor hora é obrigatório')
    .refine((val) => {
      const num = Number(
        String(val)
          .replace(/\./g, '')
          .replace(',', '.'),
      );
      return !isNaN(num) && num > 0;
    }, 'Valor hora deve ser maior que zero'),
  monthlyRate: z.string().optional(),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filtros persistentes
  const [filters, setFilters] = useFilters('users', {
    filterRole: '',
    filterActive: '',
    filterSearch: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: UserRole.CONSULTANT,
      contractType: ContractType.CLT,
      isActive: true,
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const [usersRes, companiesRes] = await Promise.all([
        api.get<User[]>('/users'),
        api.get<Company[]>('/companies'),
      ]);
      setUsers(usersRes.data);
      setCompanies(companiesRes.data);
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
      contractType: ContractType.CLT,
      companyId: '',
      hourlyRate: '',
      monthlyRate: undefined,
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
      contractType: (user.contractType as ContractType) || ContractType.CLT,
      companyId: user.companyId || user.company?.id || '',
      hourlyRate:
        user.hourlyRate != null
          ? String(user.hourlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
          : '',
      monthlyRate: user.monthlyRate != null ? String(user.monthlyRate) : undefined,
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
      const parseCurrency = (value?: string | null): number | null => {
        if (value == null || String(value).trim() === '') return null;
        const num = Number(
          String(value)
            .replace(/\./g, '')
            .replace(',', '.'),
        );
        return isNaN(num) ? null : num;
      };

      const payload = {
        name: data.name,
        email: data.email,
        role: data.role,
        contractType: data.contractType,
        companyId: data.companyId && data.companyId.trim() !== '' ? data.companyId : null,
        hourlyRate: parseCurrency(data.hourlyRate)!,
        monthlyRate: parseCurrency(data.monthlyRate),
        isActive: data.isActive,
      } as Record<string, unknown>;
      if (editingUser) {
        if (data.password && data.password.trim() !== '') {
          payload.password = data.password;
        }
        await api.patch(`/users/${editingUser.id}`, payload);
      } else {
        if (!data.password || data.password.trim() === '') {
          alert('Senha é obrigatória para novos usuários');
          return;
        }
        payload.password = data.password;
        await api.post('/users', payload);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      alert(error.response?.data?.message || 'Erro ao salvar usuário');
    }
  };

  // Filtra usuários
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (filters.filterRole) {
      filtered = filtered.filter((u) => u.role === filters.filterRole);
    }
    if (filters.filterActive !== '') {
      const isActive = filters.filterActive === 'true';
      filtered = filtered.filter((u) => u.isActive === isActive);
    }
    if (filters.filterSearch) {
      const searchLower = filters.filterSearch.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          (u.contractType && u.contractType.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [users, filters]);

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Função' },
    { key: 'contractType', label: 'Tipo de Contrato' },
    {
      key: 'company',
      label: 'Empresa',
      render: (user: User) => user.company?.name ?? user.companyId ?? '—',
    },
    {
      key: 'hourlyRate',
      label: 'Valor hora',
      render: (user: User) =>
        user.hourlyRate != null ? `R$ ${Number(user.hourlyRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—',
    },
    {
      key: 'monthlyRate',
      label: 'Valor mensal',
      render: (user: User) =>
        user.monthlyRate != null ? `R$ ${Number(user.monthlyRate).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—',
    },
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

      {/* Filtros */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-secondary-700 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Função</label>
            <select
              className="input-base"
              value={filters.filterRole}
              onChange={(e) => setFilters({ ...filters, filterRole: e.target.value })}
            >
              <option value="">Todas as funções</option>
              {Object.values(UserRole).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
            <select
              className="input-base"
              value={filters.filterActive}
              onChange={(e) => setFilters({ ...filters, filterActive: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Buscar</label>
            <input
              type="text"
              className="input-base"
              value={filters.filterSearch}
              onChange={(e) => setFilters({ ...filters, filterSearch: e.target.value })}
              placeholder="Nome, email ou tipo de contrato..."
            />
          </div>
        </div>
        {(filters.filterRole || filters.filterActive || filters.filterSearch) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setFilters({
                  filterRole: '',
                  filterActive: '',
                  filterSearch: '',
                });
              }}
              className="btn-secondary text-sm"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      <DataTable
        data={filteredUsers}
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
          <Select
            label="Tipo de Contrato"
            register={register('contractType')}
            error={errors.contractType?.message}
            options={[
              { value: ContractType.CLT, label: 'CLT' },
              { value: ContractType.PJ, label: 'PJ' },
            ]}
          />
          <Controller
            name="hourlyRate"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                label="Valor hora (R$)"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.hourlyRate?.message}
              />
            )}
          />
          <Controller
            name="monthlyRate"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                label="Valor mensal (R$)"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.monthlyRate?.message}
              />
            )}
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Empresa</label>
            <select
              className="input-base"
              {...register('companyId')}
            >
              <option value="">Nenhuma</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                  {company.cnpj ? ` (${company.cnpj})` : ''}
                </option>
              ))}
            </select>
            {errors.companyId?.message && (
              <p className="mt-1 text-sm text-error-600">{errors.companyId?.message}</p>
            )}
          </div>
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

