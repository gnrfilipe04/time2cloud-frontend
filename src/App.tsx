import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Clients } from './pages/Clients';
import { Companies } from './pages/Companies';
import { Projects } from './pages/Projects';
import { ProjectAssignments } from './pages/ProjectAssignments';
import { TimesheetEntries } from './pages/TimesheetEntries';
import { Invoices } from './pages/Invoices';
import { FunctionRoles } from './pages/FunctionRoles';
import { getAllowedRolesForPath } from './utils/permissions';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/dashboard')}>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/users')}>
                  <Layout>
                    <Users />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/clients')}>
                  <Layout>
                    <Clients />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/companies')}>
                  <Layout>
                    <Companies />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/projects')}>
                  <Layout>
                    <Projects />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/project-assignments"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/project-assignments')}>
                  <Layout>
                    <ProjectAssignments />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/timesheet-entries"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/timesheet-entries')}>
                  <Layout>
                    <TimesheetEntries />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/invoices')}>
                  <Layout>
                    <Invoices />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/function-roles"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={getAllowedRolesForPath('/function-roles')}>
                  <Layout>
                    <FunctionRoles />
                  </Layout>
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
