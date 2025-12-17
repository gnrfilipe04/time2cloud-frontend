import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { FunctionRole } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const FunctionRoles = () => {
  const [functionRoles, setFunctionRoles] = useState<FunctionRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<FunctionRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchFunctionRoles();
  }, []);

  const fetchFunctionRoles = async () => {
    try {
      const response = await api.get<FunctionRole[]>('/function-roles');
      setFunctionRoles(response.data);
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (role: FunctionRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (role: FunctionRole) => {
    if (!confirm(`Tem certeza que deseja excluir a função ${role.name}?`)) {
      return;
    }

    try {
      await api.delete(`/function-roles/${role.id}`);
      fetchFunctionRoles();
    } catch (error) {
      console.error('Erro ao excluir função:', error);
      alert('Erro ao excluir função');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await api.patch(`/function-roles/${editingRole.id}`, formData);
      } else {
        await api.post('/function-roles', formData);
      }
      setIsModalOpen(false);
      fetchFunctionRoles();
    } catch (error: any) {
      console.error('Erro ao salvar função:', error);
      alert(error.response?.data?.message || 'Erro ao salvar função');
    }
  };

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Descrição' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Funções</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Nova Função
        </button>
      </div>

      <DataTable
        data={functionRoles}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? 'Editar Função' : 'Nova Função'}
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
            <label className="block text-sm font-medium text-secondary-700">Descrição</label>
            <textarea
              className="input-base"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
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

