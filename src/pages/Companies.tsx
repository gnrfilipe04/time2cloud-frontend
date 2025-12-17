import { useEffect, useState } from 'react';
import { api } from '../config/api';
import { Company } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const Companies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    bankInfo: '',
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get<Company[]>('/companies');
      setCompanies(response.data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setFormData({ name: '', cnpj: '', bankInfo: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      cnpj: company.cnpj || '',
      bankInfo: company.bankInfo || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`Tem certeza que deseja excluir a empresa ${company.name}?`)) {
      return;
    }

    try {
      await api.delete(`/companies/${company.id}`);
      fetchCompanies();
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      alert('Erro ao excluir empresa');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await api.patch(`/companies/${editingCompany.id}`, formData);
      } else {
        await api.post('/companies', formData);
      }
      setIsModalOpen(false);
      fetchCompanies();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      alert(error.response?.data?.message || 'Erro ao salvar empresa');
    }
  };

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'cnpj', label: 'CNPJ' },
    { key: 'bankInfo', label: 'Informações Bancárias' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Empresas</h1>
        <button
          onClick={handleCreate}
          className="btn-primary"
        >
          Nova Empresa
        </button>
      </div>

      <DataTable
        data={companies}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
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
            <label className="block text-sm font-medium text-secondary-700">Informações Bancárias</label>
            <textarea
              className="input-base"
              value={formData.bankInfo}
              onChange={(e) => setFormData({ ...formData, bankInfo: e.target.value })}
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

