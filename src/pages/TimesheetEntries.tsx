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

// Função para aplicar máscara de hora (HH:MM)
const applyTimeMask = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 4 dígitos
  const limited = numbers.slice(0, 4);
  
  // Aplica a máscara HH:MM
  if (limited.length === 0) return '';
  if (limited.length <= 2) return limited;
  return `${limited.slice(0, 2)}:${limited.slice(2, 4)}`;
};

// Função para converter HH:MM para horas decimais
const timeToDecimal = (time: string): number => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  // Validação: horas até 23, minutos até 59
  if (hours > 23 || minutes > 59) return 0;
  
  return hours + minutes / 60;
};

// Função para converter horas decimais para HH:MM
const decimalToTime = (decimal: number): string => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Função para somar horas decimais e converter para HH:MM
const sumHoursToTime = (entries: TimesheetEntry[]): string => {
  const total = entries.reduce((sum, e) => sum + e.hours, 0);
  return decimalToTime(total);
};

// Função para obter o mês atual no formato YYYY-MM
const getCurrentMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const baseTimesheetEntrySchema = {
  userId: z.string().min(1, 'Usuário é obrigatório'),
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  date: z.string().min(1, 'Data é obrigatória'),
  hours: z.string().min(1, 'Horas é obrigatório').refine((val) => {
    // Valida formato HH:MM
    const timeMatch = val.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      return false;
    }
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    // Valida: horas até 23, minutos até 59, e pelo menos 1 minuto
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && (hours > 0 || minutes > 0);
  }, 'Formato inválido. Use HH:MM (ex: 08:30)'),
  activityType: z.string().min(1, 'Tipo de atividade é obrigatório'),
  notes: z.string().optional(),
  statusDescription: z.string().optional(),
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
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [bulkActionModal, setBulkActionModal] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject' | 'delete' | null;
    message: string;
  }>({
    isOpen: false,
    action: null,
    message: '',
  });
  const [statusChangeModal, setStatusChangeModal] = useState<{
    isOpen: boolean;
    entry: TimesheetEntry | null;
    newStatus: TimesheetStatus | null;
    message: string;
  }>({
    isOpen: false,
    entry: null,
    newStatus: null,
    message: '',
  });
  const [statusDescriptionModal, setStatusDescriptionModal] = useState<{
    isOpen: boolean;
    entry: TimesheetEntry | null;
  }>({
    isOpen: false,
    entry: null,
  });
  const [requestApprovalModal, setRequestApprovalModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false,
  });
  const [currentMonthSubmission, setCurrentMonthSubmission] = useState<any>(null);
  
  // Filtros persistentes - sempre inicia com o mês atual
  const [filters, setFilters] = useFilters('timesheetEntries', {
    filterUser: '',
    filterProject: '',
    filterStatus: '',
    filterDate: '',
    filterMonth: getCurrentMonth(),
  });

  // Garante que sempre há um filtro mensal ativo (inicializa com mês atual se não houver)
  useEffect(() => {
    if (!filters.filterMonth) {
      const currentMonth = getCurrentMonth();
      setFilters((prev) => ({
        ...prev,
        filterMonth: currentMonth,
      }));
    }
  }, [filters.filterMonth, setFilters]);

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

  // Busca o submission do mês atual quando o mês mudar ou quando for consultor
  useEffect(() => {
    if (isConsultant && currentUser?.id) {
      fetchCurrentMonthSubmission();
    } else {
      setCurrentMonthSubmission(null);
    }
  }, [filters.filterMonth, isConsultant, currentUser?.id]);

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

  const fetchCurrentMonthSubmission = async () => {
    if (!currentUser?.id) return;
    
    const activeMonth = filters.filterMonth || getCurrentMonth();
    const [year, month] = activeMonth.split('-');
    
    try {
      const submission = await api.get(
        `/timesheet-submissions/by-user-month?userId=${currentUser.id}&year=${year}&month=${month}`
      );
      setCurrentMonthSubmission(submission.data);
    } catch (error: any) {
      // Se não encontrou submission, não há problema
      if (error.response?.status === 404) {
        setCurrentMonthSubmission(null);
      } else {
        console.error('Erro ao buscar submission:', error);
      }
    }
  };

  // Verifica se o mês está bloqueado (já foi enviado para aprovação)
  const isMonthLocked = useMemo(() => {
    if (!isConsultant || !currentMonthSubmission) return false;
    // Bloqueia se o status for SUBMITTED, CHANGES_REQUESTED ou APPROVED
    return ['SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'].includes(currentMonthSubmission.status);
  }, [currentMonthSubmission, isConsultant]);

  // Verifica se um lançamento está bloqueado (tem submissionId)
  const isEntryLocked = (entry: TimesheetEntry): boolean => {
    if (!isConsultant) return false;
    return !!entry.submissionId;
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
      statusDescription: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (entry: TimesheetEntry) => {
    // Verifica se o lançamento está bloqueado
    if (isEntryLocked(entry)) {
      alert('Este lançamento não pode ser editado pois o mês já foi enviado para aprovação');
      return;
    }
    
    // CONSULTANT só pode editar seus próprios lançamentos
    if (isConsultant && entry.userId !== currentUser?.id) {
      alert('Você não tem permissão para editar este lançamento');
      return;
    }
    
    setEditingEntry(entry);
    reset({
      userId: entry.userId,
      projectId: entry.projectId,
      date: entry.date.split('T')[0], // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
      hours: decimalToTime(entry.hours),
      activityType: entry.activityType,
      notes: entry.notes || '',
      status: entry.status,
      statusDescription: entry.statusDescription || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (entry: TimesheetEntry) => {
    // Verifica se o lançamento está bloqueado
    if (isEntryLocked(entry)) {
      alert('Este lançamento não pode ser excluído pois o mês já foi enviado para aprovação');
      return;
    }
    
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
      // Converte HH:MM para horas decimais
      const hoursDecimal = timeToDecimal(data.hours);
      
      const payload: any = {
        userId: data.userId,
        projectId: data.projectId,
        date: new Date(data.date),
        hours: hoursDecimal,
        activityType: data.activityType,
        notes: data.notes || undefined,
        // CONSULTANT sempre usa PENDING, ADMIN pode escolher
        status: isConsultant ? TimesheetStatus.PENDING : (data.status || TimesheetStatus.PENDING),
      };

      // Apenas admin pode editar statusDescription ao editar um lançamento
      if (isAdmin && editingEntry && data.statusDescription) {
        payload.statusDescription = data.statusDescription || undefined;
      }

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

  const handleStatusChange = (entry: TimesheetEntry, newStatus: TimesheetStatus) => {
    // Se o status não mudou, não faz nada
    if (entry.status === newStatus) {
      return;
    }
    // Abre modal para inserir mensagem
    setStatusChangeModal({
      isOpen: true,
      entry,
      newStatus,
      message: '',
    });
  };

  const confirmStatusChange = async () => {
    if (!statusChangeModal.entry || !statusChangeModal.newStatus) {
      return;
    }

    try {
      const payload: any = {
        status: statusChangeModal.newStatus,
        statusDescription: statusChangeModal.message || undefined,
      };

      // Se está aprovando ou rejeitando, salva também o approverId e approvedAt
      if (statusChangeModal.newStatus === TimesheetStatus.APPROVED || 
          statusChangeModal.newStatus === TimesheetStatus.REJECTED) {
        payload.approverId = currentUser?.id;
        payload.approvedAt = new Date().toISOString();
      }

      await api.patch(`/timesheet-entries/${statusChangeModal.entry.id}`, payload);
      setStatusChangeModal({ isOpen: false, entry: null, newStatus: null, message: '' });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      alert(error.response?.data?.message || 'Erro ao alterar status');
      // Em caso de erro, fecha o modal e recarrega os dados para restaurar o status original
      setStatusChangeModal({ isOpen: false, entry: null, newStatus: null, message: '' });
      fetchData();
    }
  };

  const cancelStatusChange = () => {
    setStatusChangeModal({ isOpen: false, entry: null, newStatus: null, message: '' });
    // Recarrega os dados para restaurar o valor original do select
    fetchData();
  };

  // Calcula o total de horas do mês selecionado para o consultor
  const getMonthTotalHours = useMemo(() => {
    if (!isConsultant || !currentUser?.id) return '00:00';
    
    const activeMonth = filters.filterMonth || getCurrentMonth();
    const [year, month] = activeMonth.split('-');
    
    const monthEntries = entries.filter((e) => {
      if (e.userId !== currentUser.id) return false;
      // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
      const dateStr = e.date.split('T')[0]; // Remove a parte do tempo
      const [entryYear, entryMonth] = dateStr.split('-');
      return entryYear === year && entryMonth === month;
    });
    
    return sumHoursToTime(monthEntries);
  }, [entries, filters.filterMonth, isConsultant, currentUser?.id]);

  // Função para solicitar aprovação das horas do mês
  const handleRequestApproval = async () => {
    if (!currentUser?.id) {
      alert('Usuário não identificado');
      return;
    }

    const activeMonth = filters.filterMonth || getCurrentMonth();
    const [year, month] = activeMonth.split('-');
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    try {
      // Verifica se já existe um submission para este mês
      let submission;
      try {
        const existingSubmission = await api.get(
          `/timesheet-submissions/by-user-month?userId=${currentUser.id}&year=${year}&month=${month}`
        );
        submission = existingSubmission.data;
      } catch (error: any) {
        // Se não encontrou, cria um novo
        if (error.response?.status === 404) {
          submission = null;
        } else {
          throw error;
        }
      }

      let submissionId: string;
      
      if (submission) {
        // Atualiza o submission existente
        const updatedSubmission = await api.patch(`/timesheet-submissions/${submission.id}`, {
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
        });
        submissionId = updatedSubmission.data.id;
      } else {
        // Cria um novo submission
        const newSubmission = await api.post('/timesheet-submissions', {
          userId: currentUser.id,
          year: yearNum,
          month: monthNum,
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
        });
        submissionId = newSubmission.data.id;
      }

      // Obtém todos os entries do mês do consultor
      const monthEntries = entries.filter((e) => {
        if (e.userId !== currentUser.id) return false;
        // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
        const dateStr = e.date.split('T')[0]; // Remove a parte do tempo
        const [entryYear, entryMonth] = dateStr.split('-');
        return entryYear === String(yearNum) && entryMonth === String(monthNum).padStart(2, '0');
      });

      // Atualiza todos os entries do mês para associá-los ao submission
      for (const entry of monthEntries) {
        await api.patch(`/timesheet-entries/${entry.id}`, {
          submissionId: submissionId,
        });
      }

      alert('Solicitação de aprovação enviada com sucesso!');
      setRequestApprovalModal({ isOpen: false });
      fetchData();
      fetchCurrentMonthSubmission(); // Atualiza o submission após enviar
    } catch (error: any) {
      console.error('Erro ao solicitar aprovação:', error);
      alert(error.response?.data?.message || 'Erro ao solicitar aprovação');
    }
  };

  const handleDuplicate = (entry: TimesheetEntry) => {
    // Verifica se o lançamento está bloqueado
    if (isEntryLocked(entry)) {
      alert('Este lançamento não pode ser duplicado pois o mês já foi enviado para aprovação');
      return;
    }
    
    // CONSULTANT só pode duplicar seus próprios lançamentos
    if (isConsultant && entry.userId !== currentUser?.id) {
      alert('Você não tem permissão para duplicar este lançamento');
      return;
    }
    
    setEditingEntry(null);
    reset({
      userId: isConsultant ? currentUser?.id || '' : entry.userId,
      projectId: entry.projectId,
      date: entry.date.split('T')[0], // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
      hours: decimalToTime(entry.hours),
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

    // Filtro mensal sempre é aplicado (obrigatório)
    const activeMonth = filters.filterMonth || getCurrentMonth();
    const [year, month] = activeMonth.split('-');
    filtered = filtered.filter((e) => {
      // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
      const dateStr = e.date.split('T')[0]; // Remove a parte do tempo
      const [entryYear, entryMonth] = dateStr.split('-');
      return entryYear === year && entryMonth === month;
    });

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
        const filterDateKey = filters.filterDate; // Já vem no formato YYYY-MM-DD
        filtered = filtered.filter((e) => {
          // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
          const entryDateKey = e.date.split('T')[0]; // Remove a parte do tempo
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
      // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
      const dateKey = entry.date.split('T')[0]; // Remove a parte do tempo
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

  // Obtém todos os lançamentos visíveis na tela
  const allVisibleEntries = useMemo(() => {
    return filteredAndGroupedEntries.flatMap(({ entries: dayEntries }) => dayEntries);
  }, [filteredAndGroupedEntries]);

  // Handlers para seleção múltipla
  const handleSelectEntry = (id: string, selected: boolean) => {
    // Verifica se o lançamento está bloqueado antes de permitir seleção
    if (selected) {
      const entry = allVisibleEntries.find((e) => e.id === id);
      if (entry && isEntryLocked(entry)) {
        alert('Este lançamento não pode ser selecionado pois o mês já foi enviado para aprovação');
        return;
      }
    }
    
    setSelectedEntries((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAllVisible = () => {
    // Filtra apenas os entries que não estão bloqueados
    const selectableEntries = allVisibleEntries.filter((entry) => !isEntryLocked(entry));
    const selectableIds = new Set(selectableEntries.map((entry) => entry.id));
    const allSelected = selectableEntries.length > 0 && 
      selectableEntries.every((entry) => selectedEntries.has(entry.id));
    
    if (allSelected) {
      // Se todos estão selecionados, desmarca todos
      setSelectedEntries(new Set());
    } else {
      // Seleciona apenas os que não estão bloqueados
      setSelectedEntries(selectableIds);
    }
  };

  // Limpa seleção quando os dados mudam
  useEffect(() => {
    setSelectedEntries((prev) => {
      const visibleIds = new Set(allVisibleEntries.map((entry) => entry.id));
      const filtered = new Set([...prev].filter((id) => visibleIds.has(id)));
      return filtered;
    });
  }, [allVisibleEntries]);

  // Gera lista de meses disponíveis baseado nos dados
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    entries.forEach((entry) => {
      // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
      const dateStr = entry.date.split('T')[0]; // Remove a parte do tempo
      const [year, month] = dateStr.split('-');
      const monthKey = `${year}-${month}`;
      monthSet.add(monthKey);
    });
    
    return Array.from(monthSet)
      .sort()
      .reverse()
      .map((monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          key: monthKey,
          label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          month: parseInt(month),
          year: parseInt(year),
        };
      });
  }, [entries]);

  const formatDateHeader = (dateString: string) => {
    // Extrai apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    // Cria a data usando o timezone local para evitar problemas de conversão
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera as horas para comparação
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateForComparison = new Date(year, month - 1, day);
    dateForComparison.setHours(0, 0, 0, 0);

    const isToday = dateForComparison.getTime() === today.getTime();
    const isYesterday = dateForComparison.getTime() === yesterday.getTime();

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
      width: '150px',
      wrap: true,
      render: (entry: TimesheetEntry) => entry.user?.name || '-',
    }] : []),
    {
      key: 'project',
      label: 'Projeto',
      width: '200px',
      wrap: true,
      render: (entry: TimesheetEntry) => entry.project?.name || '-',
    },
    {
      key: 'hours',
      label: 'Horas',
      width: '80px',
      wrap: false,
      render: (entry: TimesheetEntry) => decimalToTime(entry.hours),
    },
    {
      key: 'activityType',
      label: 'Tipo de Atividade',
      width: '180px',
      wrap: true,
    },
    {
      key: 'status',
      label: 'Status',
      width: '180px',
      wrap: false,
      render: (entry: TimesheetEntry) => {
        if (isAdmin) {
          return (
            <select
              className="input-base text-sm py-1"
              value={entry.status}
              onChange={(e) => {
                const newStatus = e.target.value as TimesheetStatus;
                handleStatusChange(entry, newStatus);
                // Reseta o select para o valor original se o modal for cancelado
                // (será atualizado quando fetchData for chamado)
              }}
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
    {
      key: 'statusDescription',
      label: 'Observação do Status',
      width: '150px',
      wrap: true,
      render: (entry: TimesheetEntry) => {
        if (entry.statusDescription) {
          return (
            <button
              onClick={() => setStatusDescriptionModal({ isOpen: true, entry })}
              className="text-primary-600 hover:text-primary-800 text-sm font-medium underline transition-colors"
            >
              Ver mais
            </button>
          );
        }
        return <span className="text-sm text-secondary-400">-</span>;
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

      {/* Timeline de Meses */}
      {availableMonths.length > 0 && (
        <div className="mb-6">
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {availableMonths.map((month) => {
                const isActive = filters.filterMonth === month.key;
                return (
                  <button
                    key={month.key}
                    onClick={() => {
                      setFilters({
                        ...filters,
                        filterMonth: month.key, // Sempre seleciona o mês (não permite desmarcar)
                        filterDate: '', // Limpa filtro de data quando seleciona mês
                      });
                    }}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                      transition-colors duration-200
                      ${isActive
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-white text-secondary-700 border border-secondary-200 hover:bg-primary-50 hover:border-primary-300'
                      }
                    `}
                  >
                    {month.label.charAt(0).toUpperCase() + month.label.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Botão Selecionar Todos e Solicitar Aprovação */}
      {allVisibleEntries.length > 0 && (
        <div className="mb-4 flex justify-end gap-2">
          <button
            onClick={handleSelectAllVisible}
            className="btn-secondary text-sm"
          >
            {allVisibleEntries.length > 0 && 
             allVisibleEntries.every((entry) => selectedEntries.has(entry.id))
              ? 'Desmarcar Todos'
              : `Selecionar Todos (${allVisibleEntries.length})`
            }
          </button>
          {isConsultant && (
            <button
              onClick={() => setRequestApprovalModal({ isOpen: true })}
              disabled={isMonthLocked}
              className={`btn-primary text-sm ${isMonthLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isMonthLocked ? 'Este mês já foi enviado para aprovação' : ''}
            >
              Solicitar Aprovação
            </button>
          )}
        </div>
      )}

      {/* Barra de ações para seleção múltipla */}
      {selectedEntries.size > 0 && (
        <div className="mb-6 card bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-primary-700">
                {selectedEntries.size} {selectedEntries.size === 1 ? 'lançamento selecionado' : 'lançamentos selecionados'}
              </span>
              <button
                onClick={() => setSelectedEntries(new Set())}
                className="text-sm text-secondary-600 hover:text-secondary-800 underline"
              >
                Desmarcar todos
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setBulkActionModal({
                        isOpen: true,
                        action: 'approve',
                        message: '',
                      });
                    }}
                    className="btn-primary text-sm"
                  >
                    Aprovar Selecionados
                  </button>
                  <button
                    onClick={() => {
                      setBulkActionModal({
                        isOpen: true,
                        action: 'reject',
                        message: '',
                      });
                    }}
                    className="btn-secondary text-sm bg-error-50 text-error-700 hover:bg-error-100 border-error-200"
                  >
                    Rejeitar Selecionados
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  // Verifica se há lançamentos bloqueados antes de abrir o modal
                  const selectedEntriesList = allVisibleEntries.filter((e) => selectedEntries.has(e.id));
                  const lockedEntries = selectedEntriesList.filter((e) => isEntryLocked(e));
                  
                  if (lockedEntries.length > 0) {
                    alert(`Não é possível excluir ${lockedEntries.length} lançamento(s) pois o mês já foi enviado para aprovação.`);
                    return;
                  }
                  
                  setBulkActionModal({
                    isOpen: true,
                    action: 'delete',
                    message: '',
                  });
                }}
                className="btn-secondary text-sm bg-error-50 text-error-700 hover:bg-error-100 border-error-200"
              >
                Excluir Selecionados
              </button>
            </div>
          </div>
        </div>
      )}

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
          {(filters.filterUser || filters.filterProject || filters.filterStatus || filters.filterDate || filters.filterMonth !== getCurrentMonth()) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setFilters({
                    filterUser: '',
                    filterProject: '',
                    filterStatus: '',
                    filterDate: '',
                    filterMonth: getCurrentMonth(), // Volta para o mês atual ao limpar
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
                  {sumHoursToTime(dayEntries)} total
                </span>
              </div>
              <DataTable
                data={dayEntries}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                loading={false}
                selectable={true}
                selectedIds={selectedEntries}
                onSelect={handleSelectEntry}
                isItemDisabled={isEntryLocked}
                onSelectAll={(selected) => {
                  // Filtra apenas os entries que não estão bloqueados
                  const selectableDayEntries = dayEntries.filter((e) => !isEntryLocked(e));
                  const dayEntryIds = new Set(selectableDayEntries.map((e) => e.id));
                  setSelectedEntries((prev) => {
                    const newSet = new Set(prev);
                    if (selected) {
                      dayEntryIds.forEach((id) => newSet.add(id));
                    } else {
                      dayEntryIds.forEach((id) => newSet.delete(id));
                    }
                    return newSet;
                  });
                }}
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
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Horas <span className="text-error-500 ml-1">*</span>
            </label>
            <input
              type="text"
              placeholder="HH:MM (ex: 08:30)"
              maxLength={5}
              value={watch('hours') || ''}
              onChange={(e) => {
                const masked = applyTimeMask(e.target.value);
                setValue('hours', masked, { shouldValidate: true });
              }}
              onBlur={() => {
                const value = watch('hours');
                if (value && !value.match(/^\d{2}:\d{2}$/)) {
                  // Se não está completo, tenta completar
                  const numbers = value.replace(/\D/g, '');
                  if (numbers.length > 0) {
                    const padded = numbers.padEnd(4, '0');
                    const formatted = `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
                    setValue('hours', formatted, { shouldValidate: true });
                  }
                }
              }}
              className={`input-base ${errors.hours ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
            />
            {errors.hours && (
              <p className="mt-1 text-sm text-error-600">{errors.hours.message}</p>
            )}
          </div>
          <Input
            type="text"
            label="Tipo de Atividade"
            required
            register={register('activityType')}
            error={errors.activityType?.message}
          />
          <Textarea
            label="Descrição"
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
          {isAdmin && editingEntry && (
            <Textarea
              label="Observação do Status"
              rows={3}
              register={register('statusDescription')}
              error={errors.statusDescription?.message}
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

      {/* Modal de Confirmação para Ações em Lote */}
      <Modal
        isOpen={bulkActionModal.isOpen}
        onClose={() => setBulkActionModal({ isOpen: false, action: null, message: '' })}
        title={
          bulkActionModal.action === 'approve'
            ? 'Aprovar Lançamentos'
            : bulkActionModal.action === 'reject'
            ? 'Rejeitar Lançamentos'
            : 'Excluir Lançamentos'
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary-700">
            {bulkActionModal.action === 'approve' && (
              <>Tem certeza que deseja aprovar <strong>{selectedEntries.size}</strong> lançamento(s)?</>
            )}
            {bulkActionModal.action === 'reject' && (
              <>Tem certeza que deseja rejeitar <strong>{selectedEntries.size}</strong> lançamento(s)?</>
            )}
            {bulkActionModal.action === 'delete' && (
              <>Tem certeza que deseja excluir <strong>{selectedEntries.size}</strong> lançamento(s)? Esta ação não pode ser desfeita.</>
            )}
          </p>

          {(bulkActionModal.action === 'approve' || bulkActionModal.action === 'reject') && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Mensagem (opcional)
              </label>
              <textarea
                rows={4}
                value={bulkActionModal.message}
                onChange={(e) =>
                  setBulkActionModal({ ...bulkActionModal, message: e.target.value })
                }
                placeholder={
                  bulkActionModal.action === 'approve'
                    ? 'Adicione uma mensagem de aprovação...'
                    : 'Adicione uma mensagem de rejeição...'
                }
                className="input-base w-full"
              />
              <p className="mt-1 text-xs text-secondary-500">
                Esta mensagem será replicada para todos os lançamentos selecionados.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setBulkActionModal({ isOpen: false, action: null, message: '' })}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (bulkActionModal.action === 'approve') {
                    await Promise.all(
                      Array.from(selectedEntries).map((id) =>
                        api.patch(`/timesheet-entries/${id}`, {
                          status: TimesheetStatus.APPROVED,
                          statusDescription: bulkActionModal.message || undefined,
                          approverId: currentUser?.id,
                          approvedAt: new Date().toISOString(),
                        })
                      )
                    );
                  } else if (bulkActionModal.action === 'reject') {
                    await Promise.all(
                      Array.from(selectedEntries).map((id) =>
                        api.patch(`/timesheet-entries/${id}`, {
                          status: TimesheetStatus.REJECTED,
                          statusDescription: bulkActionModal.message || undefined,
                          approverId: currentUser?.id,
                          approvedAt: new Date().toISOString(),
                        })
                      )
                    );
                  } else if (bulkActionModal.action === 'delete') {
                    // Verifica se há lançamentos bloqueados antes de excluir
                    const selectedEntriesList = allVisibleEntries.filter((e) => selectedEntries.has(e.id));
                    const lockedEntries = selectedEntriesList.filter((e) => isEntryLocked(e));
                    
                    if (lockedEntries.length > 0) {
                      alert(`Não é possível excluir ${lockedEntries.length} lançamento(s) pois o mês já foi enviado para aprovação.`);
                      setBulkActionModal({ isOpen: false, action: null, message: '' });
                      return;
                    }
                    
                    await Promise.all(
                      Array.from(selectedEntries).map((id) => api.delete(`/timesheet-entries/${id}`))
                    );
                  }
                  setSelectedEntries(new Set());
                  setBulkActionModal({ isOpen: false, action: null, message: '' });
                  fetchData();
                } catch (error: any) {
                  console.error(`Erro ao ${bulkActionModal.action} lançamentos:`, error);
                  alert(
                    error.response?.data?.message ||
                      `Erro ao ${bulkActionModal.action === 'approve' ? 'aprovar' : bulkActionModal.action === 'reject' ? 'rejeitar' : 'excluir'} lançamentos`
                  );
                }
              }}
              className={
                bulkActionModal.action === 'delete'
                  ? 'btn-primary bg-error-600 hover:bg-error-700 text-sm'
                  : 'btn-primary text-sm'
              }
            >
              {bulkActionModal.action === 'approve' && 'Aprovar'}
              {bulkActionModal.action === 'reject' && 'Rejeitar'}
              {bulkActionModal.action === 'delete' && 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Mudança de Status Individual */}
      <Modal
        isOpen={statusChangeModal.isOpen}
        onClose={cancelStatusChange}
        title={`Alterar Status - ${statusChangeModal.entry ? statusTexts[statusChangeModal.newStatus || statusChangeModal.entry.status] : ''}`}
      >
        <div className="space-y-4">
          {statusChangeModal.entry && (
            <>
              <div className="bg-secondary-50 p-3 rounded-lg">
                <p className="text-sm text-secondary-700">
                  <strong>Projeto:</strong> {statusChangeModal.entry.project?.name || '-'}
                </p>
                <p className="text-sm text-secondary-700 mt-1">
                  <strong>Data:</strong> {(() => {
                    const dateOnly = statusChangeModal.entry.date.split('T')[0];
                    const [year, month, day] = dateOnly.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('pt-BR');
                  })()}
                </p>
                <p className="text-sm text-secondary-700 mt-1">
                  <strong>Horas:</strong> {decimalToTime(statusChangeModal.entry.hours)}
                </p>
                <p className="text-sm text-secondary-700 mt-1">
                  <strong>Status atual:</strong>{' '}
                  <span className={`inline-flex items-center rounded-md ${statusColors[statusChangeModal.entry.status]} px-2 py-1 text-xs font-medium`}>
                    {statusTexts[statusChangeModal.entry.status]}
                  </span>
                </p>
                {statusChangeModal.newStatus && (
                  <p className="text-sm text-secondary-700 mt-1">
                    <strong>Novo status:</strong>{' '}
                    <span className={`inline-flex items-center rounded-md ${statusColors[statusChangeModal.newStatus]} px-2 py-1 text-xs font-medium`}>
                      {statusTexts[statusChangeModal.newStatus]}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Mensagem (opcional)
                </label>
                <textarea
                  rows={4}
                  value={statusChangeModal.message}
                  onChange={(e) =>
                    setStatusChangeModal({ ...statusChangeModal, message: e.target.value })
                  }
                  placeholder="Adicione uma observação sobre a mudança de status..."
                  className="input-base w-full"
                />
                <p className="mt-1 text-xs text-secondary-500">
                  Esta mensagem será armazenada como observação do status.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={cancelStatusChange}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmStatusChange}
              className="btn-primary"
            >
              Confirmar Alteração
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Visualização de Observação do Status */}
      <Modal
        isOpen={statusDescriptionModal.isOpen}
        onClose={() => setStatusDescriptionModal({ isOpen: false, entry: null })}
        title="Observação do Status"
      >
        <div className="space-y-4">
          {statusDescriptionModal.entry && (
            <>
              <div className="bg-secondary-50 p-3 rounded-lg">
                <p className="text-sm text-secondary-700">
                  <strong>Projeto:</strong> {statusDescriptionModal.entry.project?.name || '-'}
                </p>
                <p className="text-sm text-secondary-700 mt-1">
                  <strong>Data:</strong> {(() => {
                    const dateOnly = statusDescriptionModal.entry.date.split('T')[0];
                    const [year, month, day] = dateOnly.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('pt-BR');
                  })()}
                </p>
                <p className="text-sm text-secondary-700 mt-1">
                  <strong>Horas:</strong> {decimalToTime(statusDescriptionModal.entry.hours)}
                </p>
                <p className="text-sm text-secondary-700 mt-1">
                  <strong>Status:</strong>{' '}
                  <span className={`inline-flex items-center rounded-md ${statusColors[statusDescriptionModal.entry.status]} px-2 py-1 text-xs font-medium`}>
                    {statusTexts[statusDescriptionModal.entry.status]}
                  </span>
                </p>
                {statusDescriptionModal.entry.approver && (
                  <p className="text-sm text-secondary-700 mt-1">
                    <strong>Aprovado por:</strong> {statusDescriptionModal.entry.approver.name}
                  </p>
                )}
                {statusDescriptionModal.entry.approvedAt && (
                  <p className="text-sm text-secondary-700 mt-1">
                    <strong>Data de aprovação:</strong>{' '}
                    {new Date(statusDescriptionModal.entry.approvedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Observação
                </label>
                <div className="bg-white border border-secondary-200 rounded-lg p-4 min-h-[100px]">
                  <p className="text-sm text-secondary-700 whitespace-pre-wrap break-words">
                    {statusDescriptionModal.entry.statusDescription}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setStatusDescriptionModal({ isOpen: false, entry: null })}
              className="btn-primary"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Solicitação de Aprovação */}
      <Modal
        isOpen={requestApprovalModal.isOpen}
        onClose={() => setRequestApprovalModal({ isOpen: false })}
        title="Solicitar Aprovação de Horas"
      >
        <div className="space-y-4">
          <div className="bg-primary-50 p-4 rounded-lg">
            <p className="text-sm text-secondary-700 mb-2">
              <strong>Mês selecionado:</strong>{' '}
              {(() => {
                const activeMonth = filters.filterMonth || getCurrentMonth();
                const [year, month] = activeMonth.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              })()}
            </p>
            <p className="text-lg font-semibold text-primary-700">
              <strong>Total de horas do mês:</strong> {getMonthTotalHours}
            </p>
          </div>
          
          <p className="text-sm text-secondary-700">
            Tem certeza que deseja solicitar aprovação das horas deste mês? 
            Todos os lançamentos do mês serão enviados para aprovação.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setRequestApprovalModal({ isOpen: false })}
              className="btn-secondary text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleRequestApproval}
              className="btn-primary text-sm"
            >
              Confirmar Solicitação
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

