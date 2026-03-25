import { api } from '../config/api';
import { TimesheetSubmission } from '../types';

export function calculateEstimatedInvoiceValue(
  submission: Partial<Pick<TimesheetSubmission, 'entries' | 'user'>>,
  fallbackHourlyRate?: number | null,
): number {
  if (!submission || !submission.entries || !Array.isArray(submission.entries)) {
    return 0;
  }

  const totalHours = submission.entries.reduce(
    (sum: number, entry: { hours?: number | string } = {}) =>
      sum + (Number(entry.hours) || 0),
    0,
  );

  const submissionHourlyRate =
    submission.user && typeof submission.user.hourlyRate === 'number'
      ? submission.user.hourlyRate
      : undefined;

  const hourlyRate =
    submissionHourlyRate ??
    (typeof fallbackHourlyRate === 'number' ? fallbackHourlyRate : 0);

  if (!hourlyRate || !totalHours) return 0;

  return totalHours * hourlyRate;
}

export async function fetchEstimatedInvoiceValue(
  userId: string,
  year: number,
  month: number,
  fallbackHourlyRate?: number | null,
): Promise<number> {
  try {
    const { data } = await api.get('/timesheet-submissions/by-user-month', {
      params: { userId, year, month },
    });
    return calculateEstimatedInvoiceValue(data, fallbackHourlyRate);
  } catch (err) {
    console.error('Erro ao buscar valor estimado da fatura:', err);
    return 0;
  }
}

