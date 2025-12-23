import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { Invoice, User, InvoiceStatus } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Select } from '../components/Input';
import { statusColors, statusTexts } from '../constants';

const invoiceSchema = z.object({
  userId: z.string().min(1, 'Usuário é obrigatório'),
  periodStart: z.string().min(1, 'Data de início é obrigatória'),
  periodEnd: z.string().min(1, 'Data de fim é obrigatória'),
  value: z.string().min(1, 'Valor é obrigatório').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Valor deve ser um número maior que zero'),
  cnpj: z.string().min(1, 'CNPJ é obrigatório'),
  filePath: z.string().min(1, 'Caminho do arquivo é obrigatório'),
  status: z.nativeEnum(InvoiceStatus),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      status: InvoiceStatus.PENDING,
    },
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
      userId: '',
      periodStart: '',
      periodEnd: '',
      value: '',
      cnpj: '',
      filePath: '',
      status: InvoiceStatus.PENDING,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    reset({
      userId: invoice.userId,
      periodStart: new Date(invoice.periodStart).toISOString().split('T')[0],
      periodEnd: new Date(invoice.periodEnd).toISOString().split('T')[0],
      value: invoice.value.toString(),
      cnpj: invoice.cnpj,
      filePath: invoice.filePath,
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
      const payload: any = {
        userId: data.userId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        value: parseFloat(data.value),
        cnpj: data.cnpj,
        filePath: data.filePath,
        status: data.status,
      };

      if (editingInvoice) {
        await api.patch(`/invoices/${editingInvoice.id}`, payload);
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

  const columns = [
    {
      key: 'user',
      label: 'Usuário',
      render: (invoice: Invoice) => invoice.user?.name || '-',
    },
    {
      key: 'periodStart',
      label: 'Início do Período',
      render: (invoice: Invoice) => new Date(invoice.periodStart).toLocaleDateString('pt-BR'),
    },
    {
      key: 'periodEnd',
      label: 'Fim do Período',
      render: (invoice: Invoice) => new Date(invoice.periodEnd).toLocaleDateString('pt-BR'),
    },
    {
      key: 'value',
      label: 'Valor',
      render: (invoice: Invoice) => `R$ ${invoice.value.toFixed(2)}`,
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

      <DataTable
        data={invoices}
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
          <Input
            type="number"
            step="0.01"
            label="Valor"
            required
            register={register('value')}
            error={errors.value?.message}
          />
          <Input
            type="text"
            label="CNPJ"
            required
            register={register('cnpj')}
            error={errors.cnpj?.message}
          />
          <Input
            type="text"
            label="Caminho do Arquivo"
            required
            register={register('filePath')}
            error={errors.filePath?.message}
          />
          <Select
            label="Status"
            register={register('status')}
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
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

