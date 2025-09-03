import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAuth } from '../../hooks/useAuth';

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export const RoleBasedRoute = ({ 
  children, 
  allowedRoles, 
  fallback 
}: RoleBasedRouteProps) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <Result
        status="403"
        title="403"
        subTitle="죄송합니다. 이 페이지에 접근할 권한이 없습니다."
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            뒤로 가기
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};