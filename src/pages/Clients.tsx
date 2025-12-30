import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { Client } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { useFilters } from '../hooks/useFilters';

const clientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  mainContact: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Filtros persistentes
  const [filters, setFilters] = useFilters('clients', {
    filterSearch: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
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
    reset({ name: '', cnpj: '', mainContact: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    reset({
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

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (editingClient) {
        await api.patch(`/clients/${editingClient.id}`, data);
      } else {
        await api.post('/clients', data);
      }
      setIsModalOpen(false);
      fetchClients();
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      alert(error.response?.data?.message || 'Erro ao salvar cliente');
    }
  };

  // Filtra clientes
  const filteredClients = useMemo(() => {
    if (!filters.filterSearch) return clients;
    
    const searchLower = filters.filterSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.cnpj && c.cnpj.toLowerCase().includes(searchLower)) ||
        (c.mainContact && c.mainContact.toLowerCase().includes(searchLower))
    );
  }, [clients, filters.filterSearch]);

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

      {/* Filtros */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-secondary-700 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Buscar</label>
            <input
              type="text"
              className="input-base"
              value={filters.filterSearch}
              onChange={(e) => setFilters({ ...filters, filterSearch: e.target.value })}
              placeholder="Nome, CNPJ ou contato..."
            />
          </div>
        </div>
        {filters.filterSearch && (
          <div className="mt-4">
            <button
              onClick={() => {
                setFilters({ filterSearch: '' });
              }}
              className="btn-secondary text-sm"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      <DataTable
        data={filteredClients}
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            type="text"
            label="Nome"
            required
            register={register('name')}
            error={errors.name?.message}
          />
          <Input
            type="text"
            label="CNPJ"
            register={register('cnpj')}
            error={errors.cnpj?.message}
          />
          <Input
            type="text"
            label="Contato Principal"
            register={register('mainContact')}
            error={errors.mainContact?.message}
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

