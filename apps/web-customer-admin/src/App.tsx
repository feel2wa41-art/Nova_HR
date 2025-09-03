import { Routes, Route } from 'react-router-dom';

import { MainLayout } from './components/layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { UsersPage } from './pages/users/UsersPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { ApprovalPage } from './pages/approval/ApprovalPage';
import { LoginPage } from './pages/auth/LoginPage';

function App() {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/' element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path='users' element={<UsersPage />} />
        <Route path='attendance' element={<AttendancePage />} />
        <Route path='approval/*' element={<ApprovalPage />} />
      </Route>
    </Routes>
  );
}

export default App;