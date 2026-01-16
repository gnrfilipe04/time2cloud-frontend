export enum UserRole {
  CONSULTANT = 'CONSULTANT',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  contractType?: string;
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

