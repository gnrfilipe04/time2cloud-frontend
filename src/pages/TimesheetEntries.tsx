import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { TimesheetEntry, User, Project, TimesheetStatus, UserRole } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Select, Textarea } from '../components/Input';
import { SelectSearchable } from '../components/SelectSearchable';
import { statusColors, statusTexts } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useFilters } from '../hooks/useFilters';

const baseTimesheetEntrySchema = {
  userId: z.string().min(1, 'Usuário é obrigatório'),
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  hours: z.string().min(1, 'Horas é obrigatório').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Horas deve ser um número maior que zero'),
  activityType: z.string().min(1, 'Tipo de atividade é obrigatório'),
  notes: z.string().optional(),
};

const timesheetEntrySchema = z.object({
  ...baseTimesheetEntrySchema,
  status: z.nativeEnum(TimesheetStatus),
});

type TimesheetEntryFormData = z.infer<typeof timesheetEntrySchema>;

export const TimesheetEntries = () => {
  const { user: currentUser } = useAuth();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  
  // Filtros persistentes para ADMIN
  const [filters, setFilters] = useFilters('timesheetEntries', {
    filterUser: '',
    filterProject: '',
    filterStatus: '',
    filterDate: '',
  });

  const isConsultant = currentUser?.role === UserRole.CONSULTANT;
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TimesheetEntryFormData>({
    resolver: zodResolver(timesheetEntrySchema),
    defaultValues: {
      status: TimesheetStatus.PENDING,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const watchedUserId = watch('userId');

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
    reset({
      userId: isConsultant ? currentUser?.id || '' : '',
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
    // CONSULTANT só pode editar seus próprios lançamentos
    if (isConsultant && entry.userId !== currentUser?.id) {
      alert('Você não tem permissão para editar este lançamento');
      return;
    }
    
    setEditingEntry(entry);
    reset({
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
    // CONSULTANT só pode excluir seus próprios lançamentos
    if (isConsultant && entry.userId !== currentUser?.id) {
      alert('Você não tem permissão para excluir este lançamento');
      return;
    }

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

  const onSubmit = async (data: TimesheetEntryFormData) => {
    try {
      const payload: any = {
        userId: data.userId,
        projectId: data.projectId,
        date: new Date(data.date),
        hours: parseFloat(data.hours),
        activityType: data.activityType,
        notes: data.notes || undefined,
        // CONSULTANT sempre usa PENDING, ADMIN pode escolher
        status: isConsultant ? TimesheetStatus.PENDING : (data.status || TimesheetStatus.PENDING),
      };

      if (editingEntry) {
        await api.patch(`/timesheet-entries/${editingEntry.id}`, payload);
      } else {
        await api.post('/timesheet-entries', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      alert(error.response?.data?.message || 'Erro ao salvar lançamento');
    }
  };

  const handleStatusChange = async (entry: TimesheetEntry, newStatus: TimesheetStatus) => {
    try {
      await api.patch(`/timesheet-entries/${entry.id}`, {
        status: newStatus,
      });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      alert(error.response?.data?.message || 'Erro ao alterar status');
    }
  };

  const handleDuplicate = (entry: TimesheetEntry) => {
    // CONSULTANT só pode duplicar seus próprios lançamentos
    if (isConsultant && entry.userId !== currentUser?.id) {
      alert('Você não tem permissão para duplicar este lançamento');
      return;
    }
    
    setEditingEntry(null);
    reset({
      userId: isConsultant ? currentUser?.id || '' : entry.userId,
      projectId: entry.projectId,
      date: new Date(entry.date).toISOString().split('T')[0],
      hours: entry.hours.toString(),
      activityType: entry.activityType,
      notes: entry.notes || '',
      status: TimesheetStatus.PENDING, // Duplicado sempre começa como PENDING
    });
    setIsModalOpen(true);
  };

  // Filtra e agrupa lançamentos por data
  const filteredAndGroupedEntries = useMemo(() => {
    // Aplica filtros
    let filtered = entries;

    if (isAdmin) {
      if (filters.filterUser) {
        filtered = filtered.filter((e) => e.userId === filters.filterUser);
      }
      if (filters.filterProject) {
        filtered = filtered.filter((e) => e.projectId === filters.filterProject);
      }
      if (filters.filterStatus) {
        filtered = filtered.filter((e) => e.status === filters.filterStatus);
      }
      if (filters.filterDate) {
        const filterDateKey = new Date(filters.filterDate).toISOString().split('T')[0];
        filtered = filtered.filter((e) => {
          const entryDateKey = new Date(e.date).toISOString().split('T')[0];
          return entryDateKey === filterDateKey;
        });
      }
    } else if (isConsultant) {
      // CONSULTANT só vê seus próprios lançamentos
      filtered = filtered.filter((e) => e.userId === currentUser?.id);
    }

    // Agrupa por data
    const grouped: { [key: string]: TimesheetEntry[] } = {};
    
    filtered.forEach((entry) => {
      const dateKey = new Date(entry.date).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });

    // Ordena as datas (mais recente primeiro)
    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((date) => ({
        date,
        entries: grouped[date].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));
      }, [entries, filters, isAdmin, isConsultant, currentUser?.id]);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    if (isToday) {
      return `Hoje - ${formattedDate}`;
    } else if (isYesterday) {
      return `Ontem - ${formattedDate}`;
    } else {
      return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} - ${formattedDate}`;
    }
  };

  const columns = [
    ...(isAdmin ? [{
      key: 'user',
      label: 'Usuário',
      render: (entry: TimesheetEntry) => entry.user?.name || '-',
    }] : []),
    {
      key: 'project',
      label: 'Projeto',
      render: (entry: TimesheetEntry) => entry.project?.name || '-',
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
        if (isAdmin) {
          return (
            <select
              className="input-base text-sm py-1"
              value={entry.status}
              onChange={(e) => handleStatusChange(entry, e.target.value as TimesheetStatus)}
            >
              {Object.values(TimesheetStatus).map((status) => (
                <option key={status} value={status}>
                  {statusTexts[status]}
                </option>
              ))}
            </select>
          );
        }
        return (
          <span className={`inline-flex items-center rounded-md ${statusColors[entry.status]} px-2 py-1 text-xs font-medium inset-ring`}>
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

      {/* Filtros para ADMIN */}
      {isAdmin && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-secondary-700 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectSearchable
              label="Usuário"
              value={filters.filterUser}
              onChange={(value) => setFilters({ ...filters, filterUser: value })}
              options={[
                { value: '', label: 'Todos os usuários' },
                ...users.map((user) => ({ value: user.id, label: user.name })),
              ]}
              placeholder="Todos os usuários"
            />
            <SelectSearchable
              label="Projeto"
              value={filters.filterProject}
              onChange={(value) => setFilters({ ...filters, filterProject: value })}
              options={[
                { value: '', label: 'Todos os projetos' },
                ...projects.map((project) => ({ value: project.id, label: project.name })),
              ]}
              placeholder="Todos os projetos"
            />
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
              <select
                className="input-base"
                value={filters.filterStatus}
                onChange={(e) => setFilters({ ...filters, filterStatus: e.target.value })}
              >
                <option value="">Todos os status</option>
                {Object.values(TimesheetStatus).map((status) => (
                  <option key={status} value={status}>
                    {statusTexts[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Data</label>
              <input
                type="date"
                className="input-base"
                value={filters.filterDate}
                onChange={(e) => setFilters({ ...filters, filterDate: e.target.value })}
              />
            </div>
          </div>
          {(filters.filterUser || filters.filterProject || filters.filterStatus || filters.filterDate) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setFilters({
                    filterUser: '',
                    filterProject: '',
                    filterStatus: '',
                    filterDate: '',
                  });
                }}
                className="btn-secondary text-sm"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <div className="text-secondary-600 mt-2">Carregando...</div>
        </div>
      ) : filteredAndGroupedEntries.length === 0 ? (
        <div className="text-center py-8 card">
          <div className="text-secondary-500">Nenhum registro encontrado</div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAndGroupedEntries.map(({ date, entries: dayEntries }) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center justify-between bg-primary-50 px-4 py-3 rounded-t-lg border-b border-primary-200">
                <h2 className="text-lg font-semibold text-primary-800">
                  {formatDateHeader(date)}
                </h2>
                <span className="text-sm text-primary-600 font-medium">
                  {dayEntries.length} {dayEntries.length === 1 ? 'lançamento' : 'lançamentos'} •{' '}
                  {dayEntries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)}h total
                </span>
              </div>
              <DataTable
                data={dayEntries}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                loading={false}
              />
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isConsultant ? (
            <input type="hidden" {...register('userId')} value={currentUser?.id || ''} />
          ) : (
            <SelectSearchable
              label="Usuário"
              required
              value={watchedUserId || ''}
              onChange={(value) => setValue('userId', value, { shouldValidate: true })}
              error={errors.userId?.message}
              options={[
                { value: '', label: 'Selecione um usuário' },
                ...users.map((user) => ({ value: user.id, label: user.name })),
              ]}
              placeholder="Selecione um usuário"
            />
          )}
          <SelectSearchable
            label="Projeto"
            required
            value={watch('projectId') || ''}
            onChange={(value) => setValue('projectId', value, { shouldValidate: true })}
            error={errors.projectId?.message}
            options={[
              { value: '', label: 'Selecione um projeto' },
              ...projects.map((project) => ({ value: project.id, label: project.name })),
            ]}
            placeholder="Selecione um projeto"
          />
          <Input
            type="date"
            label="Data"
            required
            register={register('date')}
            error={errors.date?.message}
          />
          <Input
            type="number"
            step="0.5"
            label="Horas"
            required
            register={register('hours')}
            error={errors.hours?.message}
          />
          <Input
            type="text"
            label="Tipo de Atividade"
            required
            register={register('activityType')}
            error={errors.activityType?.message}
          />
          <Textarea
            label="Notas"
            rows={3}
            register={register('notes')}
            error={errors.notes?.message}
          />
          {!isConsultant && (
            <Select
              label="Status"
              register={register('status')}
              error={errors.status?.message}
              options={Object.values(TimesheetStatus).map((status) => ({
                value: status,
                label: statusTexts[status],
              }))}
            />
          )}
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

