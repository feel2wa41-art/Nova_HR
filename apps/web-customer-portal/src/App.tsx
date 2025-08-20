import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';

import { MainLayout } from './components/layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { Leave } from './pages/Leave';
import { ApprovalPage } from './pages/approval/ApprovalPage';
import { Settings } from './pages/Settings';
import { UserManagement } from './pages/admin/UserManagement';
import { CompanySettings } from './pages/admin/CompanySettings';
import { HRManagement } from './pages/HRManagement';
import { LoginPage } from './pages/auth/LoginPage';

const { Content } = Layout;

function App() {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/' element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path='attendance' element={<AttendancePage />} />
        <Route path='leave' element={<Leave />} />
        <Route path='approval/*' element={<ApprovalPage />} />
        <Route path='settings' element={<Settings />} />
        <Route path='hr-management' element={<HRManagement />} />
        <Route path='admin/users' element={<UserManagement />} />
        <Route path='admin/company' element={<CompanySettings />} />
      </Route>
    </Routes>
  );
}

export default App;