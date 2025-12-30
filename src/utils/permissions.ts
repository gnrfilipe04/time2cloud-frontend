import { UserRole } from '../types';

export interface RoutePermission {
  path: string;
  label: string;
  roles: UserRole[];
}

export const routePermissions: RoutePermission[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.FINANCE, UserRole.CONSULTANT],
  },
  {
    path: '/users',
    label: 'Usuários',
    roles: [UserRole.ADMIN],
  },
  {
    path: '/clients',
    label: 'Clientes',
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
  },
  {
    path: '/companies',
    label: 'Empresas',
    roles: [UserRole.ADMIN, UserRole.FINANCE],
  },
  {
    path: '/projects',
    label: 'Projetos',
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
  },
  {
    path: '/project-assignments',
    label: 'Atribuições',
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
  },
  {
    path: '/timesheet-entries',
    label: 'Lançamentos',
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.CONSULTANT],
  },
  {
    path: '/invoices',
    label: 'Faturas',
    roles: [UserRole.ADMIN, UserRole.FINANCE, UserRole.CONSULTANT],
  },
  {
    path: '/function-roles',
    label: 'Funções',
    roles: [UserRole.ADMIN, UserRole.PROJECT_MANAGER],
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

