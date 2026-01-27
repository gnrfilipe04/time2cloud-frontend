import { UserRole } from '../types';

export interface RoutePermission {
  path: string;
  label: string;
  roles: UserRole[];
}

/** Perfis com mesma visão e permissões de PROJECT_MANAGER (gestores) */
const MANAGER_ROLES = [UserRole.PROJECT_MANAGER, UserRole.PEOPLE_MANAGER, UserRole.COMPANY_MANAGER];

export const routePermissions: RoutePermission[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    roles: [UserRole.ADMIN, ...MANAGER_ROLES, UserRole.FINANCE, UserRole.CONSULTANT],
  },
  {
    path: '/users',
    label: 'Usuários',
    roles: [UserRole.ADMIN],
  },
  {
    path: '/clients',
    label: 'Clientes',
    roles: [UserRole.ADMIN, ...MANAGER_ROLES],
  },
  {
    path: '/companies',
    label: 'Empresas',
    roles: [UserRole.ADMIN, UserRole.FINANCE],
  },
  {
    path: '/projects',
    label: 'Projetos',
    roles: [UserRole.ADMIN, ...MANAGER_ROLES],
  },
  {
    path: '/project-assignments',
    label: 'Atribuições',
    roles: [UserRole.ADMIN, ...MANAGER_ROLES],
  },
  {
    path: '/timesheet-entries',
    label: 'Lançamentos',
    roles: [UserRole.ADMIN, ...MANAGER_ROLES, UserRole.CONSULTANT],
  },
  {
    path: '/invoices',
    label: 'Faturas',
    roles: [UserRole.ADMIN, UserRole.FINANCE, UserRole.CONSULTANT],
  },
  {
    path: '/function-roles',
    label: 'Funções',
    roles: [UserRole.ADMIN, ...MANAGER_ROLES],
  },
];

export const canAccessRoute = (userRole: UserRole, path: string): boolean => {
  const route = routePermissions.find((r) => r.path === path);
  return route ? route.roles.includes(userRole) : false;
};

export const getAccessibleRoutes = (userRole: UserRole): RoutePermission[] => {
  return routePermissions.filter((route) => route.roles.includes(userRole));
};

export const getAllowedRolesForPath = (path: string): UserRole[] => {
  const route = routePermissions.find((r) => r.path === path);
  return route ? route.roles : [];
};

