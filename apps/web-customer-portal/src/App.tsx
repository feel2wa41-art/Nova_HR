import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, App as AntdApp } from 'antd';
import { useEffect } from 'react';

import { MainLayout } from './components/layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { AttendancePage } from './pages/attendance/AttendancePage';
import AttitudeDashboard from './pages/attitude/AttitudeDashboard';
import PersonalAttitudeDashboard from './pages/attitude/PersonalAttitudeDashboard';
import AttitudeStatistics from './pages/admin/AttitudeStatistics';
import LiveMonitoring from './pages/admin/LiveMonitoring';
import { Leave } from './pages/Leave';
import { ApprovalPage } from './pages/approval/ApprovalPage';
import { Settings } from './pages/Settings';
import { UserManagement } from './pages/admin/UserManagement';
import { CompanySettings } from './pages/admin/CompanySettings';
import { ApprovalManagement } from './pages/admin/ApprovalManagement';
import { HRManagement } from './pages/HRManagement';
import { LoginPage } from './pages/auth/LoginPage';
import { useAuth } from './hooks/useAuth';

const { Content } = Layout;

function App() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuth();

  useEffect(() => {
    initializeAuth();
  }, []);

  // Show loading spinner during authentication check
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Protected route component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
  };

  return (
    <AntdApp>
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route 
          path='/' 
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path='attendance' element={<AttendancePage />} />
          <Route path='attitude' element={<PersonalAttitudeDashboard />} />
          <Route path='leave' element={<Leave />} />
          <Route path='approval/*' element={<ApprovalPage />} />
          <Route path='settings' element={<Settings />} />
          <Route path='hr-management' element={<HRManagement />} />
          <Route path='admin/approval-management' element={<ApprovalManagement />} />
          <Route path='admin/users' element={<UserManagement />} />
          <Route path='admin/company' element={<CompanySettings />} />
          <Route path='admin/monitoring' element={<LiveMonitoring />} />
          <Route path='admin/attitude-statistics' element={<AttitudeStatistics />} />
        </Route>
      </Routes>
    </AntdApp>
  );
}

export default App;