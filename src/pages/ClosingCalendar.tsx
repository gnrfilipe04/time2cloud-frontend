import { useEffect, useState, useMemo } from 'react';
import { api } from '../config/api';
import {
  ClosingCalendar as ClosingCalendarType,
  ClosingType,
  ClosingRuleTarget,
  ClosingRuleEnforcement,
} from '../types';
import { Modal } from '../components/Modal';
import { Input, Textarea } from '../components/Input';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const CLOSING_TYPE_LABELS: Record<ClosingType, string> = {
  [ClosingType.TYPE_1]: 'Tipo 1',
  [ClosingType.TYPE_2]: 'Tipo 2',
};

const RULE_TARGET_LABELS: Record<ClosingRuleTarget, string> = {
  [ClosingRuleTarget.TIMESHEET_ENTRY_CREATE]: 'Lançar apontamento',
  [ClosingRuleTarget.TIMESHEET_ENTRY_UPDATE]: 'Editar apontamento',
  [ClosingRuleTarget.TIMESHEET_ENTRY_DELETE]: 'Excluir apontamento',
  [ClosingRuleTarget.TIMESHEET_SUBMIT]: 'Enviar para aprovação',
  [ClosingRuleTarget.INVOICE_UPLOAD]: 'Enviar fatura',
  [ClosingRuleTarget.INVOICE_UPDATE]: 'Atualizar fatura',
};

const ENFORCEMENT_LABELS: Record<ClosingRuleEnforcement, string> = {
  [ClosingRuleEnforcement.BLOCK]: 'Bloquear',
  [ClosingRuleEnforcement.WARN]: 'Avisar',
};

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const grid: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month - 1, d));
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

function dateKey(d: Date): string {
  return formatDateForInput(d);
}

export const ClosingCalendar = () => {
  const now = new Date();
  const [closingType, setClosingType] = useState<ClosingType>(ClosingType.TYPE_1);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendars, setCalendars] = useState<ClosingCalendarType[]>([]);
  const [currentCalendar, setCurrentCalendar] = useState<ClosingCalendarType | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configModalInitialOnly, setConfigModalInitialOnly] = useState(false);
  const [invalidDayModalOpen, setInvalidDayModalOpen] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);

  const [configForm, setConfigForm] = useState({
    periodStart: '',
    periodEnd: '',
    entryDeadline: '',
    submitDeadline: '',
    note: '',
  });
  const [invalidDayForm, setInvalidDayForm] = useState({ date: '', reason: '' });
  const [ruleForm, setRuleForm] = useState({
    target: '' as ClosingRuleTarget | '',
    deadlineAt: '',
    enforcement: ClosingRuleEnforcement.BLOCK,
    message: '',
  });

  const fetchCalendars = async () => {
    setLoading(true);
    try {
      const res = await api.get<ClosingCalendarType[]>('/closing-calendars', {
        params: { closingType, year, month },
      });
      setCalendars(res.data);
      const found = res.data.find(
        (c) => c.closingType === closingType && c.year === year && c.month === month,
      );
      setCurrentCalendar(found ?? null);
      if (found) {
        const toDateTimeLocal = (d: string) => new Date(d).toISOString().slice(0, 16);
        setConfigForm({
          periodStart: found.periodStart ? formatDateForInput(new Date(found.periodStart)) : '',
          periodEnd: found.periodEnd ? formatDateForInput(new Date(found.periodEnd)) : '',
          entryDeadline: found.entryDeadline ? toDateTimeLocal(found.entryDeadline) : '',
          submitDeadline: found.submitDeadline ? toDateTimeLocal(found.submitDeadline) : '',
          note: found.note ?? '',
        });
      } else {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        setConfigForm({
          periodStart: formatDateForInput(start),
          periodEnd: formatDateForInput(end),
          entryDeadline: '',
          submitDeadline: '',
          note: '',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, [closingType, year, month]);

  const invalidDaySet = useMemo(() => {
    const set = new Set<string>();
    currentCalendar?.invalidDays?.forEach((d) => {
      set.add(dateKey(new Date(d.date)));
    });
    return set;
  }, [currentCalendar?.invalidDays]);

  const monthGrid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const saveOrCreateConfig = async () => {
    if (!configForm.periodStart || !configForm.periodEnd) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        closingType,
        year,
        month,
        periodStart: configForm.periodStart,
        periodEnd: configForm.periodEnd,
      };
      if (!configModalInitialOnly) {
        payload.entryDeadline = configForm.entryDeadline || null;
        payload.submitDeadline = configForm.submitDeadline || null;
        payload.note = configForm.note || null;
      }
      const res = await api.post<ClosingCalendarType>('/closing-calendars', payload);
      setCurrentCalendar(res.data);
      setCalendars((prev) => {
        const idx = prev.findIndex(
          (c) => c.closingType === closingType && c.year === year && c.month === month,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = res.data;
          return next;
        }
        return [res.data, ...prev];
      });
      setConfigModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  };

  const addInvalidDay = async () => {
    if (!currentCalendar || !invalidDayForm.date) return;
    setSaving(true);
    try {
      await api.post(`/closing-calendars/${currentCalendar.id}/invalid-days`, {
        date: invalidDayForm.date,
        reason: invalidDayForm.reason || undefined,
      });
      await fetchCalendars();
      setInvalidDayForm({ date: '', reason: '' });
      setInvalidDayModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao adicionar dia inválido.');
    } finally {
      setSaving(false);
    }
  };

  const removeInvalidDay = async (date: string) => {
    if (!currentCalendar || !confirm('Remover este dia inválido?')) return;
    try {
      await api.delete(`/closing-calendars/${currentCalendar.id}/invalid-days`, {
        params: { date },
      });
      await fetchCalendars();
    } catch (e) {
      console.error(e);
      alert('Erro ao remover dia inválido.');
    }
  };

  const addRule = async () => {
    if (!currentCalendar || !ruleForm.target || !ruleForm.deadlineAt) return;
    setSaving(true);
    try {
      await api.post(`/closing-calendars/${currentCalendar.id}/rules`, {
        target: ruleForm.target,
        deadlineAt: ruleForm.deadlineAt,
        enforcement: ruleForm.enforcement,
        message: ruleForm.message || undefined,
      });
      await fetchCalendars();
      setRuleForm({
        target: '',
        deadlineAt: '',
        enforcement: ClosingRuleEnforcement.BLOCK,
        message: '',
      });
      setRuleModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao adicionar regra.');
    } finally {
      setSaving(false);
    }
  };

  const removeRule = async (ruleId: string) => {
    if (!currentCalendar || !confirm('Remover esta regra?')) return;
    try {
      await api.delete(`/closing-calendars/${currentCalendar.id}/rules/${ruleId}`);
      await fetchCalendars();
    } catch (e) {
      console.error(e);
      alert('Erro ao remover regra.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary-700">Calendário de Fechamento</h1>
      </div>

      <p className="text-secondary-600 mb-6">
        Configure prazos e dias inválidos por tipo de fechamento para os apontamentos do mês.
      </p>

      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-secondary-700 mb-4">Competência</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Tipo de fechamento</label>
            <select
              className="input-base w-full"
              value={closingType}
              onChange={(e) => setClosingType(e.target.value as ClosingType)}
            >
              {Object.entries(CLOSING_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Ano</label>
            <select
              className="input-base w-full"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[year - 2, year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Mês</label>
            <select
              className="input-base w-full"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((_, i) => (
                <option key={i} value={i + 1}>{MONTH_NAMES[i]}</option>
              ))}
            </select>
          </div>
        </div>
        {loading && <p className="mt-2 text-sm text-secondary-500">Carregando...</p>}
      </div>

      {currentCalendar ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-secondary-700">Configuração do mês</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => {
                      setConfigModalInitialOnly(false);
                      setConfigModalOpen(true);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-error text-sm"
                    onClick={async () => {
                      if (
                        !confirm(
                          'Tem certeza que deseja excluir toda a configuração deste mês? Dias inválidos e regras de prazo também serão removidos.',
                        )
                      )
                        return;
                      try {
                        await api.delete(`/closing-calendars/${currentCalendar.id}`);
                        await fetchCalendars();
                      } catch (e) {
                        console.error(e);
                        alert('Erro ao excluir configuração.');
                      }
                    }}
                  >
                    Deletar configuração
                  </button>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-secondary-500">Período</dt>
                  <dd>
                    {new Date(currentCalendar.periodStart).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(currentCalendar.periodEnd).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
                {currentCalendar.entryDeadline && (
                  <div>
                    <dt className="text-secondary-500">Prazo para lançar/editar</dt>
                    <dd>{new Date(currentCalendar.entryDeadline).toLocaleString('pt-BR')}</dd>
                  </div>
                )}
                {currentCalendar.submitDeadline && (
                  <div>
                    <dt className="text-secondary-500">Prazo para enviar aprovação</dt>
                    <dd>{new Date(currentCalendar.submitDeadline).toLocaleString('pt-BR')}</dd>
                  </div>
                )}
                {currentCalendar.note && (
                  <div>
                    <dt className="text-secondary-500">Observação</dt>
                    <dd className="text-secondary-600">{currentCalendar.note}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-700 mb-2">Calendário do mês</h3>
              <p className="text-xs text-secondary-500 mb-2">Dias em destaque estão bloqueados para apontamentos.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-secondary-600">
                      <th className="border border-neutral-200 p-1">Dom</th>
                      <th className="border border-neutral-200 p-1">Seg</th>
                      <th className="border border-neutral-200 p-1">Ter</th>
                      <th className="border border-neutral-200 p-1">Qua</th>
                      <th className="border border-neutral-200 p-1">Qui</th>
                      <th className="border border-neutral-200 p-1">Sex</th>
                      <th className="border border-neutral-200 p-1">Sáb</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthGrid.map((week, wi) => (
                      <tr key={wi}>
                        {week.map((day, di) => {
                          if (!day) return <td key={di} className="border border-neutral-100 p-1 bg-neutral-50" />;
                          const key = dateKey(day);
                          const invalid = invalidDaySet.has(key);
                          return (
                            <td
                              key={di}
                              className={`border p-1 text-center ${invalid ? 'bg-error-100 text-error-700 font-medium' : 'border-neutral-200'}`}
                              title={invalid ? 'Dia inválido para apontamento' : undefined}
                            >
                              {day.getDate()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-secondary-700">Dias inválidos</h3>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => {
                    setInvalidDayForm({ date: '', reason: '' });
                    setInvalidDayModalOpen(true);
                  }}
                >
                  Adicionar dia
                </button>
              </div>
              {!currentCalendar.invalidDays?.length ? (
                <p className="text-secondary-500 text-sm">Nenhum dia inválido configurado.</p>
              ) : (
                <ul className="space-y-2">
                  {currentCalendar.invalidDays.map((d) => (
                    <li
                      key={d.id}
                      className="flex justify-between items-center py-2 border-b border-neutral-100 last:border-0"
                    >
                      <span>
                        {new Date(d.date).toLocaleDateString('pt-BR')}
                        {d.reason && <span className="text-secondary-500 ml-2">— {d.reason}</span>}
                      </span>
                      <button
                        type="button"
                        className="text-error-600 hover:text-error-700 text-sm"
                        onClick={() => removeInvalidDay(dateKey(new Date(d.date)))}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-secondary-700">Regras de prazo</h3>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => {
                    setRuleForm({
                      target: '',
                      deadlineAt: '',
                      enforcement: ClosingRuleEnforcement.BLOCK,
                      message: '',
                    });
                    setRuleModalOpen(true);
                  }}
                >
                  Adicionar regra
                </button>
              </div>
              {!currentCalendar.rules?.length ? (
                <p className="text-secondary-500 text-sm">Nenhuma regra de prazo configurada.</p>
              ) : (
                <ul className="space-y-2">
                  {currentCalendar.rules.map((r) => (
                    <li
                      key={r.id}
                      className="flex justify-between items-start py-2 border-b border-neutral-100 last:border-0"
                    >
                      <div>
                        <span className="font-medium">{RULE_TARGET_LABELS[r.target]}</span>
                        <span className="text-secondary-500 text-sm ml-2">
                          até {new Date(r.deadlineAt).toLocaleString('pt-BR')} — {ENFORCEMENT_LABELS[r.enforcement]}
                        </span>
                        {r.message && <p className="text-sm text-secondary-600 mt-1">{r.message}</p>}
                        {!r.isActive && <span className="text-secondary-400 text-xs">(inativa)</span>}
                      </div>
                      <button
                        type="button"
                        className="text-error-600 hover:text-error-700 text-sm"
                        onClick={() => removeRule(r.id)}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <p className="text-secondary-600 mb-4">
            Não há configuração para {CLOSING_TYPE_LABELS[closingType]} em {MONTH_NAMES[month - 1]} de {year}.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              const start = new Date(year, month - 1, 1);
              const end = new Date(year, month, 0);
              setConfigForm({
                periodStart: formatDateForInput(start),
                periodEnd: formatDateForInput(end),
                entryDeadline: '',
                submitDeadline: '',
                note: '',
              });
              setConfigModalInitialOnly(true);
              setConfigModalOpen(true);
            }}
          >
            Criar configuração do mês
          </button>
        </div>
      )}

      <Modal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        title={configModalInitialOnly ? 'Configuração inicial do mês' : 'Configuração do mês'}
      >
        <div className="space-y-4">
          <Input
            label="Início do período"
            type="date"
            value={configForm.periodStart}
            onChange={(e) => setConfigForm((f) => ({ ...f, periodStart: e.target.value }))}
          />
          <Input
            label="Fim do período"
            type="date"
            value={configForm.periodEnd}
            onChange={(e) => setConfigForm((f) => ({ ...f, periodEnd: e.target.value }))}
          />
          {!configModalInitialOnly && (
            <>
              <Input
                label="Prazo para lançar/editar apontamentos"
                type="datetime-local"
                value={configForm.entryDeadline}
                onChange={(e) => setConfigForm((f) => ({ ...f, entryDeadline: e.target.value }))}
              />
              <Input
                label="Prazo para enviar para aprovação"
                type="datetime-local"
                value={configForm.submitDeadline}
                onChange={(e) => setConfigForm((f) => ({ ...f, submitDeadline: e.target.value }))}
              />
              <Textarea
                label="Observação"
                value={configForm.note}
                onChange={(e) => setConfigForm((f) => ({ ...f, note: e.target.value }))}
                rows={3}
              />
            </>
          )}
          {configModalInitialOnly && (
            <p className="text-sm text-secondary-500">
              Os finais de semana do período serão bloqueados automaticamente. Prazos e observações podem ser editados depois.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setConfigModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={saveOrCreateConfig} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={invalidDayModalOpen} onClose={() => setInvalidDayModalOpen(false)} title="Adicionar dia inválido">
        <div className="space-y-4">
          <Input
            label="Data"
            type="date"
            value={invalidDayForm.date}
            onChange={(e) => setInvalidDayForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Motivo (opcional)"
            type="text"
            value={invalidDayForm.reason}
            onChange={(e) => setInvalidDayForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Ex.: Feriado, manutenção"
          />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setInvalidDayModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={addInvalidDay} disabled={saving || !invalidDayForm.date}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={ruleModalOpen} onClose={() => setRuleModalOpen(false)} title="Adicionar regra de prazo">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Ação</label>
            <select
              className="input-base w-full"
              value={ruleForm.target}
              onChange={(e) => setRuleForm((f) => ({ ...f, target: e.target.value as ClosingRuleTarget }))}
            >
              <option value="">Selecione</option>
              {(Object.entries(RULE_TARGET_LABELS) as [ClosingRuleTarget, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Data/hora limite"
            type="datetime-local"
            value={ruleForm.deadlineAt}
            onChange={(e) => setRuleForm((f) => ({ ...f, deadlineAt: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Comportamento</label>
            <select
              className="input-base w-full"
              value={ruleForm.enforcement}
              onChange={(e) => setRuleForm((f) => ({ ...f, enforcement: e.target.value as ClosingRuleEnforcement }))}
            >
              {Object.entries(ENFORCEMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Mensagem (opcional)"
            type="text"
            value={ruleForm.message}
            onChange={(e) => setRuleForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Exibida ao usuário ao bloquear ou avisar"
          />
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setRuleModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={addRule} disabled={saving || !ruleForm.target || !ruleForm.deadlineAt}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
