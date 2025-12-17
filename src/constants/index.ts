import { TimesheetStatus } from "../types";

export const statusColors: Record<TimesheetStatus, string> = {
    [TimesheetStatus.PENDING]: 'text-yellow-600',
    [TimesheetStatus.APPROVED]: 'text-green-600',
    [TimesheetStatus.REJECTED]: 'text-red-600',
  };

export const statusTexts: Record<TimesheetStatus, string> = {
    [TimesheetStatus.PENDING]: 'Pendente',
    [TimesheetStatus.APPROVED]: 'Aprovado',
    [TimesheetStatus.REJECTED]: 'Rejeitado',
  };