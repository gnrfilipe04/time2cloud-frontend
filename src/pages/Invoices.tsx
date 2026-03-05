import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { Invoice, User, InvoiceStatus, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Select, CurrencyInput } from '../components/Input';
import { SelectSearchable } from '../components/SelectSearchable';
import { statusColors, statusTexts } from '../constants';
import { useFilters } from '../hooks/useFilters';
import { formatCurrencyBRL } from '../utils/currency';
import { formatDateOnly, toDateInputValue } from '../utils/date';

const invoiceSchema = z.object({
  periodStart: z.string().min(1, 'Data de início é obrigatória'),
  periodEnd: z.string().min(1, 'Data de fim é obrigatória'),
  value: z.string().min(1, 'Valor é obrigatório').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Valor deve ser um número maior que zero'),
  filePath: z.string().min(1, 'É obrigatório anexar o PDF da nota'),
  status: z.nativeEnum(InvoiceStatus),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export const Invoices = () => {
  const { user: loggedUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [failedFileIds, setFailedFileIds] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      status: InvoiceStatus.PENDING,
    },
  });

  // Filtros persistentes
  const [filters, setFilters] = useFilters('invoices', {
    filterUser: '',
    filterStatus: '',
    filterPeriodStart: '',
    filterPeriodEnd: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, usersRes] = await Promise.all([
        api.get<Invoice[]>('/invoices'),
        api.get<User[]>('/users'),
      ]);
      setInvoices(invoicesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingInvoice(null);
    reset({
      periodStart: '',
      periodEnd: '',
      value: '',
      filePath: '',
      status: InvoiceStatus.PENDING,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    const filePath = invoice.filePath != null && String(invoice.filePath).trim() !== '' ? invoice.filePath : '';
    reset({
      periodStart: toDateInputValue(String(invoice.periodStart)),
      periodEnd: toDateInputValue(String(invoice.periodEnd)),
      value: invoice.value.toString(),
      filePath,
      status: invoice.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm('Tem certeza que deseja excluir esta fatura?')) {
      return;
    }

    try {
      await api.delete(`/invoices/${invoice.id}`);
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir fatura:', error);
      alert('Erro ao excluir fatura');
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      const payload: Record<string, unknown> = {
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        value: parseFloat(data.value),
        filePath: data.filePath,
        status: data.status,
      };

      if (editingInvoice) {
        await api.patch(`/invoices/${editingInvoice.id}`, {
          ...payload,
          userId: editingInvoice.userId,
          cnpj: editingInvoice.cnpj,
        });
      } else {
        await api.post('/invoices', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar fatura:', error);
      alert(error.response?.data?.message || 'Erro ao salvar fatura');
    }
  };

  const handleViewFile = async (invoice: Invoice) => {
    const hasFile = invoice.filePath != null && String(invoice.filePath).trim() !== '';
    if (!hasFile) return;
    setLoadingFileId(invoice.id);
    setFailedFileIds((prev) => {
      const next = new Set(prev);
      next.delete(invoice.id);
      return next;
    });
    try {
      const { data } = await api.get<Blob>(`/invoices/${invoice.id}/file`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setFailedFileIds((prev) => new Set(prev).add(invoice.id));
      }
      alert(err.response?.data?.message || 'Erro ao abrir arquivo.');
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Apenas arquivos PDF são permitidos.');
      e.target.value = '';
      return;
    }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post<{ filePath: string }>('/invoices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('filePath', data.filePath, { shouldValidate: true });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao enviar arquivo.');
      e.target.value = '';
    } finally {
      setUploadingFile(false);
    }
  };

  // Filtra faturas
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (loggedUser?.role === UserRole.CONSULTANT) {
      filtered = filtered.filter((i) => i.userId === loggedUser.id);
    }
    if (filters.filterUser) {
      filtered = filtered.filter((i) => i.userId === filters.filterUser);
    }
    if (filters.filterStatus) {
      filtered = filtered.filter((i) => i.status === filters.filterStatus);
    }
    if (filters.filterPeriodStart) {
      const filterDate = new Date(filters.filterPeriodStart);
      filtered = filtered.filter((i) => new Date(i.periodStart) >= filterDate);
    }
    if (filters.filterPeriodEnd) {
      const filterDate = new Date(filters.filterPeriodEnd);
      filtered = filtered.filter((i) => new Date(i.periodEnd) <= filterDate);
    }

    return filtered;
  }, [invoices, filters, loggedUser]);

  const columns = [
    {
      key: 'user',
      label: 'Usuário',
      render: (invoice: Invoice) => invoice.user?.name || '-',
    },
    {
      key: 'periodStart',
      label: 'Início do Período',
      render: (invoice: Invoice) => formatDateOnly(String(invoice.periodStart)),
    },
    {
      key: 'periodEnd',
      label: 'Fim do Período',
      render: (invoice: Invoice) => formatDateOnly(String(invoice.periodEnd)),
    },
    {
      key: 'value',
      label: 'Valor',
      render: (invoice: Invoice) => formatCurrencyBRL(invoice.value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (invoice: Invoice) => {
        return (
          <span className={`inline-flex items-center rounded-md ${statusColors[invoice.status]} px-2 py-1 text-xs font-medium inset-ring`}>
            {statusTexts[invoice.status]}
          </span>
        );
      },
    },
    {
      key: 'file',
      label: 'Arquivo',
      render: (invoice: Invoice) => {
        const hasFile = invoice.filePath != null && String(invoice.filePath).trim() !== '';
        if (failedFileIds.has(invoice.id)) {
          return <span className="text-amber-600 text-sm">Arquivo indisponível</span>;
        }
        if (!hasFile) {
          return <span className="text-secondary-500">—</span>;
        }
        const isLoading = loadingFileId === invoice.id;
        return (
          <button
            type="button"
            onClick={() => handleViewFile(invoice)}
            disabled={isLoading}
            className="text-primary-600 hover:text-primary-700 underline text-sm disabled:opacity-50"
          >
            {isLoading ? 'Abrindo…' : 'Visualizar'}
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Faturas</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Nova Fatura
        </button>
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-secondary-700 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loggedUser?.role !== UserRole.CONSULTANT && (
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
          )}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
            <select
              className="input-base"
              value={filters.filterStatus}
              onChange={(e) => setFilters({ ...filters, filterStatus: e.target.value })}
            >
              <option value="">Todos os status</option>
              {Object.values(InvoiceStatus).map((status) => (
                <option key={status} value={status}>
                  {statusTexts[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Período Início</label>
            <input
              type="date"
              className="input-base"
              value={filters.filterPeriodStart}
              onChange={(e) => setFilters({ ...filters, filterPeriodStart: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Período Fim</label>
            <input
              type="date"
              className="input-base"
              value={filters.filterPeriodEnd}
              onChange={(e) => setFilters({ ...filters, filterPeriodEnd: e.target.value })}
            />
          </div>
        </div>
        {(filters.filterUser || filters.filterStatus || filters.filterPeriodStart || filters.filterPeriodEnd) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setFilters({
                  filterUser: '',
                  filterStatus: '',
                  filterPeriodStart: '',
                  filterPeriodEnd: '',
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
        data={filteredInvoices}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingInvoice ? 'Editar Fatura' : 'Nova Fatura'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!editingInvoice && (
            <>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Usuário</label>
                <input
                  type="text"
                  className="input-base bg-secondary-100 cursor-not-allowed"
                  value={loggedUser?.name ?? ''}
                  disabled
                  readOnly
                />
                <p className="text-xs text-secondary-500 mt-0.5">Sempre o usuário logado</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">CNPJ (empresa)</label>
                <input
                  type="text"
                  className="input-base bg-secondary-100 cursor-not-allowed"
                  value={loggedUser?.company?.cnpj ?? ''}
                  disabled
                  readOnly
                />
                {!loggedUser?.company?.cnpj && (
                  <p className="text-xs text-amber-600 mt-0.5">Cadastre uma empresa com CNPJ para enviar faturas.</p>
                )}
              </div>
            </>
          )}
          {editingInvoice && (
            <>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Usuário</label>
                <input
                  type="text"
                  className="input-base bg-secondary-100 cursor-not-allowed"
                  value={editingInvoice.user?.name ?? '-'}
                  disabled
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">CNPJ (empresa)</label>
                <input
                  type="text"
                  className="input-base bg-secondary-100 cursor-not-allowed"
                  value={editingInvoice.cnpj ?? ''}
                  disabled
                  readOnly
                />
              </div>
            </>
          )}
          <Input
            type="date"
            label="Início do Período"
            required
            register={register('periodStart')}
            error={errors.periodStart?.message}
          />
          <Input
            type="date"
            label="Fim do Período"
            required
            register={register('periodEnd')}
            error={errors.periodEnd?.message}
          />
          <Controller
            name="value"
            control={control}
            rules={{ required: 'Valor é obrigatório', validate: (v) => (parseFloat(v || '0') > 0 ? true : 'Valor deve ser maior que zero') }}
            render={({ field }) => (
              <CurrencyInput
                label="Valor"
                required
                value={field.value}
                onChange={field.onChange}
                error={errors.value?.message}
              />
            )}
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Nota fiscal (PDF) <span className="text-red-500">*</span>
            </label>
            {editingInvoice?.filePath != null && String(editingInvoice.filePath).trim() !== '' && (
              <div className="mb-2 p-2 bg-secondary-50 rounded border border-secondary-200">
                <p className="text-sm text-secondary-700">Arquivo já anexado a esta fatura.</p>
                <button
                  type="button"
                  onClick={() => editingInvoice && handleViewFile(editingInvoice)}
                  className="text-primary-600 hover:text-primary-700 underline text-sm mt-1"
                >
                  Visualizar PDF
                </button>
              </div>
            )}
            <input
              key={editingInvoice?.id ?? 'new'}
              type="file"
              accept=".pdf,application/pdf"
              className="input-base block w-full text-sm text-secondary-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200"
              onChange={handleFileChange}
              disabled={uploadingFile}
            />
            {uploadingFile && <p className="text-xs text-secondary-500 mt-1">Enviando arquivo...</p>}
            {(watch('filePath') || (editingInvoice?.filePath && String(editingInvoice.filePath).trim() !== '')) && !uploadingFile && (
              <p className="text-xs text-green-600 mt-1">
                {editingInvoice ? 'Arquivo anexado para esta fatura.' : 'Arquivo anexado.'}
              </p>
            )}
            {errors.filePath?.message && (
              <p className="text-xs text-red-600 mt-1">{errors.filePath.message}</p>
            )}
          </div>
          <Select
            label="Status"
            register={register('status')}
            required
            error={errors.status?.message}
            options={Object.values(InvoiceStatus).map((status) => ({
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
              disabled={!editingInvoice && !loggedUser?.company?.cnpj}
              title={!editingInvoice && !loggedUser?.company?.cnpj ? 'Vincule uma empresa com CNPJ ao seu usuário para enviar faturas.' : undefined}
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

