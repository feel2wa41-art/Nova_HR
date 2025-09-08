import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CompanyRequests from './pages/CompanyRequests';
import CompanyManagement from './pages/CompanyManagement';
import CompanyDetail from './pages/CompanyDetail';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/layouts/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/company-requests" element={<CompanyRequests />} />
                <Route path="/company-management" element={<CompanyManagement />} />
                <Route path="/company/:companyId" element={<CompanyDetail />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;