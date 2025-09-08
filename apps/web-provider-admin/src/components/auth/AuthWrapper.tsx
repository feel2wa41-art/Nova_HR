import React, { ReactNode } from 'react';
import { Spin } from 'antd';

interface AuthWrapperProps {
  children: ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  return (
    <React.Suspense 
      fallback={
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}>
          <Spin size="large" />
        </div>
      }
    >
      {children}
    </React.Suspense>
  );
};

export default AuthWrapper;