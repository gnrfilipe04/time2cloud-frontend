export enum UserRole {
  CONSULTANT = 'CONSULTANT',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  PEOPLE_MANAGER = 'PEOPLE_MANAGER',
  COMPANY_MANAGER = 'COMPANY_MANAGER',
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
}

export enum TimesheetStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
}

export enum ClosingType {
  TYPE_1 = 'TYPE_1',
  TYPE_2 = 'TYPE_2',
}

export enum ApprovalFlowType {
  FLOW_TYPE_1 = 'FLOW_TYPE_1',
  FLOW_TYPE_2 = 'FLOW_TYPE_2',
}

export enum ApprovalStage {
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  COMPANY_MANAGER = 'COMPANY_MANAGER',
  PEOPLE_MANAGER = 'PEOPLE_MANAGER',
  FINANCE = 'FINANCE',
}

export enum StepStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  contractType?: string;
  closingPolicyId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  cnpj?: string;
  mainContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  bankInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FunctionRole {
  id: string;
  name: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  companyId?: string;
  managerId?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  costCenter?: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  company?: Company;
  manager?: User;
}

export interface ProjectAssignment {
  id: string;
  userId: string;
  projectId: string;
  functionRoleId?: string;
  estimatedHours?: number;
  isActive: boolean;
  createdAt: string;
  user?: User;
  project?: Project;
  functionRole?: FunctionRole;
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  projectId: string;
  date: string;
  hours: number;
  activityType: string;
  notes?: string;
  status: TimesheetStatus;
  statusDescription?: string;
  approverId?: string;
  approvedAt?: string;
  submissionId?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  project?: Project;
  approver?: User;
}

export interface TimesheetApprovalStep {
  id: string;
  order: number;
  stage: ApprovalStage;
  status: StepStatus;
  comment?: string;
  decidedAt?: string;
  submissionId: string;
  approverId?: string;
  approver?: User;
}

export interface TimesheetSubmission {
  id: string;
  userId: string;
  year: number;
  month: number;
  status: SubmissionStatus;
  periodStart: string;
  periodEnd: string;
  closingType: ClosingType;
  flowType: ApprovalFlowType;
  submittedAt?: string;
  decidedAt?: string;
  approverId?: string;
  comment?: string;
  user?: User;
  entries?: TimesheetEntry[];
  steps?: TimesheetApprovalStep[];
}

export interface Invoice {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  cnpj: string;
  filePath: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

