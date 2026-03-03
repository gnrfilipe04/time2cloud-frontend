import { useMemo } from 'react';
import {
  MONTH_NAMES,
  dateKey,
  getMonthGrid,
  getPeriodGrid,
  parseLocalDate,
} from '../utils/calendar';

export type CalendarMode = 'month' | 'period';

export interface CalendarProps {
  /** Mês (1-12) */
  month: number;
  /** Ano */
  year: number;
  /** Chamado quando o usuário altera mês ou ano no cabeçalho */
  onYearMonthChange: (year: number, month: number) => void;
  /** 'month' = grid do mês inteiro; 'period' = grid do período entre periodStart e periodEnd */
  mode: CalendarMode;
  /** Obrigatório quando mode === 'period'. Formato YYYY-MM-DD */
  periodStart?: string;
  /** Obrigatório quando mode === 'period'. Formato YYYY-MM-DD */
  periodEnd?: string;
  /** Conjunto de chaves (YYYY-MM-DD) de dias inválidos/bloqueados */
  invalidDayKeys?: Set<string>;
  /** Motivo por dia (para tooltip). Chave = YYYY-MM-DD */
  invalidDayReasons?: Map<string, string>;
  /** Rótulos de prazo por dia (para tooltip e estilo). Chave = YYYY-MM-DD */
  deadlineLabelsByDay?: Map<string, string[]>;
  /** Se true, dias selecionáveis e exibe selectedDate */
  selectable?: boolean;
  /** Data selecionada (YYYY-MM-DD). Usado quando selectable === true */
  selectedDate?: string;
  /** Callback ao clicar em um dia selecionável. Usado quando selectable === true */
  onSelectDate?: (dateKey: string) => void;
  /** Se fornecido, define se um dia é selecionável (senão usa apenas invalidDayKeys e período) */
  isDaySelectable?: (dateKey: string, day: Date) => boolean;
  /** Período selecionável: início (para selectable). Se não informado, usa início do grid */
  selectableStart?: Date;
  /** Período selecionável: fim (para selectable). Se não informado, usa fim do grid */
  selectableEnd?: Date;
  /** Título opcional acima do calendário */
  title?: string;
  /** Texto de ajuda abaixo do cabeçalho */
  helpText?: string;
  /** Exibir legenda de cores abaixo do calendário */
  showLegend?: boolean;
  /** Exibir cabeçalho com seleção de mês/ano. Padrão: false */
  showHeader?: boolean;
  /** Label legenda "Dia bloqueado" */
  legendInvalidLabel?: string;
  /** Label legenda "Prazo" ou "Selecionado" */
  legendDeadlineLabel?: string;
  legendSelectedLabel?: string;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function Calendar({
  month,
  year,
  onYearMonthChange,
  mode,
  periodStart,
  periodEnd,
  invalidDayKeys = new Set(),
  invalidDayReasons = new Map(),
  deadlineLabelsByDay = new Map(),
  selectable = false,
  selectedDate = '',
  onSelectDate,
  isDaySelectable,
  selectableStart,
  selectableEnd,
  title,
  helpText,
  showLegend = true,
  showHeader = false,
  legendInvalidLabel = 'Dia inválido (bloqueado)',
  legendDeadlineLabel = 'Prazo (lançar/editar ou enviar aprovação)',
  legendSelectedLabel = 'Selecionado',
}: CalendarProps) {
  const grid = useMemo(() => {
    if (mode === 'period' && periodStart && periodEnd) {
      return getPeriodGrid(periodStart, periodEnd);
    }
    return getMonthGrid(year, month);
  }, [mode, year, month, periodStart, periodEnd]);

  const selectedKey = selectedDate ? dateKey(parseLocalDate(selectedDate)) : '';

  const resolveSelectable = (day: Date): boolean => {
    const key = dateKey(day);
    if (invalidDayKeys.has(key)) return false;
    if (isDaySelectable) return isDaySelectable(key, day);
    if (!selectable) return false;
    const start = selectableStart ?? (mode === 'period' && periodStart ? parseLocalDate(periodStart) : new Date(year, month - 1, 1));
    const end = selectableEnd ?? (mode === 'period' && periodEnd ? parseLocalDate(periodEnd) : new Date(year, month, 0));
    return day >= start && day <= end;
  };

  return (
    <div className="space-y-2">
      {title && <h3 className="text-lg font-semibold text-secondary-700">{title}</h3>}
      {showHeader && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-secondary-700">Mês</label>
            <select
              className="input-base"
              value={month}
              onChange={(e) => onYearMonthChange(year, Number(e.target.value))}
              aria-label="Mês"
            >
              {MONTH_NAMES.map((_, i) => (
                <option key={i} value={i + 1}>{MONTH_NAMES[i]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-secondary-700">Ano</label>
            <select
              className="input-base"
              value={year}
              onChange={(e) => onYearMonthChange(Number(e.target.value), month)}
              aria-label="Ano"
            >
              {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      {helpText && <p className="text-xs text-secondary-500">{helpText}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-secondary-600">
              {WEEKDAY_LABELS.map((label) => (
                <th key={label} className="border border-neutral-200 p-1">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={wi}>
                {week.map((day, di) => {
                  if (!day) {
                    return <td key={di} className="border border-neutral-100 p-1 bg-neutral-50" />;
                  }
                  const key = dateKey(day);
                  const invalid = invalidDayKeys.has(key);
                  const labels = deadlineLabelsByDay.get(key) ?? [];
                  const hasDeadline = labels.length > 0;
                  const selected = selectable && key === selectedKey;
                  const selectableCell = resolveSelectable(day);
                  const tooltipParts: string[] = [];
                  if (invalid) tooltipParts.push(invalidDayReasons.get(key) ?? legendInvalidLabel);
                  if (hasDeadline) tooltipParts.push(...labels);
                  const title = tooltipParts.length > 0 ? tooltipParts.join(' • ') : undefined;

                  let cellClass = 'border p-1 text-center ';
                  if (selectable) {
                    if (!selectableCell) {
                      cellClass += invalid
                        ? 'bg-error-100 text-error-600 cursor-not-allowed'
                        : 'bg-neutral-100 text-neutral-400 cursor-not-allowed';
                    } else {
                      cellClass += selected
                        ? 'bg-primary-600 text-white font-semibold cursor-pointer'
                        : hasDeadline
                          ? 'bg-warning-50 text-warning-800 cursor-pointer hover:bg-warning-100'
                          : 'cursor-pointer hover:bg-primary-50 border-neutral-200';
                    }
                  } else {
                    cellClass += invalid
                      ? 'bg-error-100 text-error-700 font-medium'
                      : hasDeadline
                        ? 'bg-warning-100 text-warning-800 font-medium'
                        : 'border-neutral-200';
                  }

                  return (
                    <td
                      key={di}
                      className={cellClass}
                      title={title}
                      onClick={() => selectable && selectableCell && onSelectDate?.(key)}
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
      {showLegend && (
        <div className="flex flex-wrap gap-4 text-xs text-secondary-600">
          {selectable && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 rounded bg-primary-600" />
              {legendSelectedLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-warning-100 border border-warning-300" />
            {legendDeadlineLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-error-100 border border-error-300" />
            {legendInvalidLabel}
          </span>
        </div>
      )}
    </div>
  );
}
