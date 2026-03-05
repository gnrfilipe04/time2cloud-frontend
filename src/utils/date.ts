/**
 * Extrai a data (YYYY-MM-DD) de um valor ISO ou date string e formata em pt-BR (dd/mm/yyyy).
 * Evita mudança de dia por timezone (ex.: 2026-02-01T00:00:00.000Z -> 01/02/2026).
 */
export function formatDateOnly(isoOrDateString: string): string {
  const datePart = isoOrDateString.slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return isoOrDateString;
  return `${d}/${m}/${y}`;
}

/**
 * Extrai YYYY-MM-DD de um valor ISO ou date string para usar em input type="date".
 * Evita mudança de dia por timezone.
 */
export function toDateInputValue(isoOrDateString: string): string {
  return isoOrDateString.slice(0, 10);
}
