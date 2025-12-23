import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../config/api';
import { Company } from '../types';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Input, Textarea } from '../components/Input';

const companySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().optional(),
  bankInfo: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export const Companies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
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
    reset({ name: '', cnpj: '', bankInfo: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    reset({
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

  const onSubmit = async (data: CompanyFormData) => {
    try {
      if (editingCompany) {
        await api.patch(`/companies/${editingCompany.id}`, data);
      } else {
        await api.post('/companies', data);
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
          <Textarea
            label="Informações Bancárias"
            rows={3}
            register={register('bankInfo')}
            error={errors.bankInfo?.message}
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

