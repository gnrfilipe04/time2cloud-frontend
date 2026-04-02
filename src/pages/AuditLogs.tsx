import { useEffect, useMemo, useState } from 'react';
import { api } from '../config/api';
import { AuditActionType, AuditEntityType, AuditLog } from '../types';
import { DataTable } from '../components/DataTable';

type AuditLogsResponse = {
  items: AuditLog[];
  total: number;
  take: number;
  skip: number;
};

const entityLabels: Record<AuditEntityType, string> = {
  [AuditEntityType.TIMESHEET_ENTRY]: 'Lançamento',
  [AuditEntityType.TIMESHEET_SUBMISSION]: 'Submissão de horas',
  [AuditEntityType.INVOICE]: 'Fatura',
  [AuditEntityType.PROJECT]: 'Projeto',
  [AuditEntityType.PROJECT_ASSIGNMENT]: 'Atribuição',
  [AuditEntityType.USER]: 'Usuário',
  [AuditEntityType.CLOSING_CALENDAR]: 'Calendário',
};

const actionLabels: Record<AuditActionType, string> = {
  [AuditActionType.CREATE]: 'Criação',
  [AuditActionType.UPDATE]: 'Atualização',
  [AuditActionType.DELETE]: 'Exclusão',
  [AuditActionType.STATUS_CHANGED]: 'Mudança de status',
  [AuditActionType.APPROVED]: 'Aprovação',
  [AuditActionType.REJECTED]: 'Rejeição',
  [AuditActionType.REQUESTED_CHANGES]: 'Solicitação de ajuste',
  [AuditActionType.SUBMITTED]: 'Envio',
  [AuditActionType.UPLOADED]: 'Upload',
};

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { take: 100, skip: 0 };
      if (entityType) params.entityType = entityType;
      if (action) params.action = action;
      if (dateFrom) params.dateFrom = new Date(`${dateFrom}T00:00:00`).toISOString();
      if (dateTo) params.dateTo = new Date(`${dateTo}T23:59:59`).toISOString();

      const response = await api.get<AuditLogsResponse>('/audit-logs', { params });
      setLogs(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Erro ao carregar histórico de auditoria:', error);
      alert('Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'createdAt',
        label: 'Data/Hora',
        render: (item: AuditLog) =>
          new Date(item.createdAt).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'medium',
          }),
      },
      {
        key: 'entityType',
        label: 'Entidade',
        render: (item: AuditLog) => entityLabels[item.entityType] ?? item.entityType,
      },
      {
        key: 'action',
        label: 'Ação',
        render: (item: AuditLog) => actionLabels[item.action] ?? item.action,
      },
      {
        key: 'performedBy',
        label: 'Responsável',
        render: (item: AuditLog) => item.performedBy?.name || item.performedBy?.email || 'Sistema',
      },
      {
        key: 'message',
        label: 'Mensagem',
        wrap: true,
        render: (item: AuditLog) => item.message || '-',
      },
      {
        key: 'module',
        label: 'Módulo',
        render: (item: AuditLog) => item.module || '-',
      },
    ],
    [],
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Histórico de Auditoria</h1>
        <button onClick={fetchLogs} className="btn-secondary">
          Atualizar
        </button>
      </div>

      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-secondary-700 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Entidade</label>
            <select className="input-base" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">Todas</option>
              {Object.values(AuditEntityType).map((value) => (
                <option key={value} value={value}>
                  {entityLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Ação</label>
            <select className="input-base" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Todas</option>
              {Object.values(AuditActionType).map((value) => (
                <option key={value} value={value}>
                  {actionLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Data inicial</label>
            <input
              type="date"
              className="input-base"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Data final</label>
            <input type="date" className="input-base" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={fetchLogs} className="btn-primary">
            Aplicar filtros
          </button>
          <button
            onClick={() => {
              setEntityType('');
              setAction('');
              setDateFrom('');
              setDateTo('');
            }}
            className="btn-secondary"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="mb-3 text-sm text-secondary-600">Total de registros: {total}</div>
      <DataTable data={logs} columns={columns} loading={loading} />
    </div>
  );
};
