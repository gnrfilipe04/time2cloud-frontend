import { formatCurrencyBRL, parseBRLInput } from '../utils/currency';

export interface CurrencyInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Input de valor monetário em Real (BRL) com máscara enquanto o usuário digita.
 * Reutilizável em formulários (ex.: fatura, usuário valor hora/mensal).
 * O valor é armazenado como string numérica (ex.: "1234.56") para uso no formulário.
 */
export function CurrencyInput({
  label,
  error,
  required,
  value,
  onChange,
  disabled,
  placeholder = 'R$ 0,00',
}: CurrencyInputProps) {
  const displayValue =
    value === '' || value === undefined ? '' : formatCurrencyBRL(parseFloat(value));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const num = parseBRLInput(raw);
    onChange(num.toFixed(2));
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-secondary-700 mb-1">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`input-base ${error ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
      />
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
    </div>
  );
}
