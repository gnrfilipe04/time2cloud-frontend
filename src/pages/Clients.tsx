import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { Client } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    mainContact: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get<Client[]>('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClient(null);
    setFormData({ name: '', cnpj: '', mainContact: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      cnpj: client.cnpj || '',
      mainContact: client.mainContact || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente ${client.name}?`)) {
      return;
    }

    try {
      await api.delete(`/clients/${client.id}`);
      fetchClients();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.patch(`/clients/${editingClient.id}`, formData);
      } else {
        await api.post('/clients', formData);
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      alert(error.response?.data?.message || 'Erro ao salvar cliente');
    }
  };

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'cnpj', label: 'CNPJ' },
    { key: 'mainContact', label: 'Contato Principal' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Clientes</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Novo Cliente
        </button>
      </div>

      <DataTable
        data={clients}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700">Nome</label>
            <input
              type="text"
              required
              className="input-base"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">CNPJ</label>
            <input
              type="text"
              className="input-base"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700">Contato Principal</label>
            <input
              type="text"
              className="input-base"
              value={formData.mainContact}
              onChange={(e) => setFormData({ ...formData, mainContact: e.target.value })}
            />
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

