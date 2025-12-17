import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { Invoice, User, InvoiceStatus } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { statusColors, statusTexts } from '../constants';

export const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    periodStart: '',
    periodEnd: '',
    value: '',
    cnpj: '',
    filePath: '',
    status: InvoiceStatus.PENDING,
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
    setFormData({
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
    setFormData({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        userId: formData.userId,
        periodStart: new Date(formData.periodStart),
        periodEnd: new Date(formData.periodEnd),
        value: parseFloat(formData.value),
        cnpj: formData.cnpj,
        filePath: formData.filePath,
        status: formData.status,
      };

      if (editingInvoice) {
        await api.patch(`/invoices/${editingInvoice.id}`, data);
      } else {
        await api.post('/invoices', data);
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
            <label className="block text-sm font-medium text-secondary-700">Início do Período *</label>
            <input
              type="date"
              required
              className="input-base"
              value={formData.periodStart}
              onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Fim do Período *</label>
            <input
              type="date"
              required
              className="input-base"
              value={formData.periodEnd}
              onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Valor *</label>
            <input
              type="number"
              step="0.01"
              required
              className="input-base"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">CNPJ *</label>
            <input
              type="text"
              required
              className="input-base"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Caminho do Arquivo *</label>
            <input
              type="text"
              required
              className="input-base"
              value={formData.filePath}
              onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Status</label>
            <select
              className="input-base"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as InvoiceStatus })}
            >
              {Object.values(InvoiceStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
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

