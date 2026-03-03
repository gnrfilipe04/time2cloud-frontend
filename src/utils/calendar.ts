/** Formata data em YYYY-MM-DD usando horário local */
export function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse de string ISO ou YYYY-MM-DD para Date à meia-noite no fuso local */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Chave única do dia em horário local (YYYY-MM-DD) para comparação */
export function dateKey(d: Date): string {
  return formatDateForInput(d);
}

/** Para strings ISO (datetime do backend): extrai o dia no fuso local. Evita dia 31 23:59 virar 01. */
export function getLocalDateKey(isoOrDateString: string): string {
  return formatDateForInput(new Date(isoOrDateString));
}

/** Formata Date para valor do input datetime-local (YYYY-MM-DDTHH:mm) */
export function toDateTimeLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Grid do mês (1 a último dia do mês) */
export function getMonthGrid(year: number, month: number): (Date | null)[][] {
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

/** Grid do período (do dia inicial ao dia final), podendo atravessar dois meses. Usa datas locais. */
export function getPeriodGrid(periodStart: string, periodEnd: string): (Date | null)[][] {
  const start = parseLocalDate(periodStart);
  const end = parseLocalDate(periodEnd);
  const grid: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  const pad = start.getDay();
  for (let i = 0; i < pad; i++) week.push(null);
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (current <= end) {
    week.push(new Date(current));
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
    current.setDate(current.getDate() + 1);
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

/** Grid de dias entre start e end (inclusive), com padding de semana. Útil quando os limites são Date. */
export function getCalendarGrid(start: Date, end: Date): (Date | null)[][] {
  return getPeriodGrid(formatDateForInput(start), formatDateForInput(end));
}
