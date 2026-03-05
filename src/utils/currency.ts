const formatBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Formata um número como moeda em Real (BRL).
 */
export function formatCurrencyBRL(value: number): string {
  return formatBRL.format(value);
}

/**
 * Converte string de input (dígitos ou formatado pt-BR) em número.
 * Ex: "1.234,56" ou "123456" -> 1234.56
 */
export function parseBRLInput(value: string): number {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}
