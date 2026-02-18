import { TimesheetStatus } from "../types";
import { ApprovalStage, StepStatus } from "../types";

export const statusColors: Record<TimesheetStatus, string> = {
    [TimesheetStatus.PENDING]: 'text-yellow-500 bg-yellow-400/10 inset-ring-yellow-400/20' ,
    [TimesheetStatus.APPROVED]: 'text-green-400 bg-green-400/10 inset-ring-green-400/20',
    [TimesheetStatus.REJECTED]: 'text-red-400 bg-red-400/10 inset-ring-red-400/20',
  };

export const statusTexts: Record<TimesheetStatus, string> = {
    [TimesheetStatus.PENDING]: 'Pendente',
    [TimesheetStatus.APPROVED]: 'Aprovado',
    [TimesheetStatus.REJECTED]: 'Rejeitado',
  };

export const approvalStageLabels: Record<ApprovalStage, string> = {
  [ApprovalStage.PROJECT_MANAGER]: 'Gestor de Projeto',
  [ApprovalStage.COMPANY_MANAGER]: 'Gestor da Empresa',
  [ApprovalStage.PEOPLE_MANAGER]: 'Gestor de Pessoas',
  [ApprovalStage.FINANCE]: 'Financeiro',
};

export const stepStatusLabels: Record<StepStatus, string> = {
  [StepStatus.PENDING]: 'Pendente',
  [StepStatus.ACTIVE]: 'Em análise',
  [StepStatus.APPROVED]: 'Aprovado',
  [StepStatus.CHANGES_REQUESTED]: 'Alterações solicitadas',
  [StepStatus.REJECTED]: 'Rejeitado',
};