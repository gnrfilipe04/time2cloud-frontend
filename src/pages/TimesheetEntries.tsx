import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { TimesheetEntry, User, Project, TimesheetStatus } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Select, Textarea } from '../components/Input';
import { statusColors, statusTexts } from '../constants';

const timesheetEntrySchema = z.object({
  userId: z.string().min(1, 'Usuário é obrigatório'),
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  hours: z.string().min(1, 'Horas é obrigatório').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Horas deve ser um número maior que zero'),
  activityType: z.string().min(1, 'Tipo de atividade é obrigatório'),
  notes: z.string().optional(),
  status: z.nativeEnum(TimesheetStatus),
});

type TimesheetEntryFormData = z.infer<typeof timesheetEntrySchema>;

export const TimesheetEntries = () => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TimesheetEntryFormData>({
    resolver: zodResolver(timesheetEntrySchema),
    defaultValues: {
      status: TimesheetStatus.PENDING,
      date: new Date().toISOString().split('T')[0],
    },
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
    reset({
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
        status: data.status,
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

  const handleDuplicate = (entry: TimesheetEntry) => {
    setEditingEntry(null);
    reset({
      userId: entry.userId,
      projectId: entry.projectId,
      date: new Date(entry.date).toISOString().split('T')[0],
      hours: entry.hours.toString(),
      activityType: entry.activityType,
      notes: entry.notes || '',
      status: TimesheetStatus.PENDING, // Duplicado sempre começa como PENDING
    });
    setIsModalOpen(true);
  };

  // Agrupa lançamentos por data
  const groupEntriesByDate = () => {
    const grouped: { [key: string]: TimesheetEntry[] } = {};
    
    entries.forEach((entry) => {
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
  };

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
          <span className={`inline-flex items-center rounded-md ${statusColors[entry.status]} px-2 py-1 text-xs font-medium inset-ring`}>
            {statusTexts[entry.status]}
          </span>
        );
      },
    },
  ];

  const groupedEntries = groupEntriesByDate();

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

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <div className="text-secondary-600 mt-2">Carregando...</div>
        </div>
      ) : groupedEntries.length === 0 ? (
        <div className="text-center py-8 card">
          <div className="text-secondary-500">Nenhum registro encontrado</div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEntries.map(({ date, entries: dayEntries }) => (
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
          <Select
            label="Status"
            register={register('status')}
            error={errors.status?.message}
            options={Object.values(TimesheetStatus).map((status) => ({
              value: status,
              label: status,
            }))}
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

