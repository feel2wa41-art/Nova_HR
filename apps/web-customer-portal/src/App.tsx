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
import { LeaveManagement } from './pages/admin/LeaveManagement';
import { AttendanceManagement } from './pages/admin/AttendanceManagement';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { DailyReportPage } from './pages/daily-report/DailyReportPage';
import { CreateDailyReportPage } from './pages/daily-report/CreateDailyReportPage';
import { ViewDailyReportPage } from './pages/daily-report/ViewDailyReportPage';
import { WeeklyReportPage } from './pages/weekly-report/WeeklyReportPage';
import { CreateWeeklyReportPage } from './pages/weekly-report/CreateWeeklyReportPage';
import { ViewWeeklyReportPage } from './pages/weekly-report/ViewWeeklyReportPage';
import { UserHealthPage } from './pages/user-health/UserHealthPage';
import { ReferenceDocumentsPage } from './pages/reference-documents/ReferenceDocumentsPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { CommunityPage } from './pages/community/CommunityPage';
import { CommunityPostDetail } from './pages/community/CommunityPostDetail';
import { NotificationsPage } from './pages/community/NotificationsPage';
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
        <Route path='/reset-password' element={<ResetPasswordPage />} />
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
          <Route path='daily-report' element={<DailyReportPage />} />
          <Route path='daily-report/create' element={<CreateDailyReportPage />} />
          <Route path='daily-report/edit/:id' element={<CreateDailyReportPage />} />
          <Route path='daily-report/view/:id' element={<ViewDailyReportPage />} />
          <Route path='weekly-report' element={<WeeklyReportPage />} />
          <Route path='weekly-report/create' element={<CreateWeeklyReportPage />} />
          <Route path='weekly-report/edit/:id' element={<CreateWeeklyReportPage />} />
          <Route path='weekly-report/view/:id' element={<ViewWeeklyReportPage />} />
          <Route path='user-health' element={<UserHealthPage />} />
          <Route path='reference-documents' element={<ReferenceDocumentsPage />} />
          <Route path='calendar' element={<CalendarPage />} />
          <Route path='community' element={<CommunityPage />} />
          <Route path='community/posts/:postId' element={<CommunityPostDetail />} />
          <Route path='community/notifications' element={<NotificationsPage />} />
          <Route path='settings' element={<Settings />} />
          <Route path='settings/change-password' element={<ChangePasswordPage />} />
          <Route path='hr-management' element={<HRManagement />} />
          <Route path='admin/approval-management' element={<ApprovalManagement />} />
          <Route path='admin/users' element={<UserManagement />} />
          <Route path='admin/company' element={<CompanySettings />} />
          <Route path='admin/monitoring' element={<LiveMonitoring />} />
          <Route path='admin/attitude-statistics' element={<AttitudeStatistics />} />
          {/* HR Management Routes */}
          <Route path='admin/attendance-management' element={<AttendanceManagement />} />
          <Route path='admin/leave-management' element={<LeaveManagement />} />
          <Route path='admin/organization' element={<CompanySettings />} />
        </Route>
      </Routes>
    </AntdApp>
  );
}

export default App;