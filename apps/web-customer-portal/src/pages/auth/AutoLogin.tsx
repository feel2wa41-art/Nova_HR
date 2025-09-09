import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { apiClient } from '../../lib/api';

const AutoLogin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<string>('SSO 토큰 확인 중...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performAutoLogin = async () => {
      try {
        // Check for direct token or SSO token
        const directToken = searchParams.get('token');
        const ssoToken = searchParams.get('sso');
        
        if (directToken) {
          // Direct token login from desktop agent
          setStatus('토큰 검증 중...');
          
          // Verify token with API
          const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${directToken}`,
            },
          });

          if (!response.ok) {
            throw new Error('토큰 검증 실패');
          }

          const data = await response.json();
          
          setStatus('로그인 성공! 대시보드로 이동 중...');
          
          // Save token and user info
          localStorage.setItem('reko_hr_token', directToken);
          localStorage.setItem('reko_hr_user', JSON.stringify(data.user));
          
          // Update API client
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${directToken}`;
          
          message.success(`환영합니다, ${data.user.name}님!`);
          
          // Navigate to dashboard
          setTimeout(() => {
            const redirectTo = searchParams.get('redirect') || '/dashboard';
            navigate(redirectTo, { replace: true });
          }, 1000);
          
          return;
        }
        
        if (!ssoToken) {
          setError('인증 토큰이 없습니다.');
          setStatus('로그인 페이지로 이동 중...');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }

        setStatus('SSO 토큰 검증 중...');

        // Verify SSO token with API
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/sso/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ssoToken }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'SSO 토큰 검증 실패');
        }

        const data = await response.json();

        if (!data.access_token || !data.user) {
          throw new Error('유효하지 않은 응답 형식');
        }

        setStatus('로그인 성공! 대시보드로 이동 중...');

        // Save token and user info to localStorage (using correct key names)
        localStorage.setItem('reko_hr_token', data.access_token);
        localStorage.setItem('reko_hr_user', JSON.stringify(data.user));

        // Update API client with new token
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;

        // Show success message
        message.success(`환영합니다, ${data.user.name}님!`);

        // Log the SSO login event
        console.log('🔐 SSO Login successful:', {
          userId: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          timestamp: new Date().toISOString()
        });

        // Navigate to dashboard after a short delay
        setTimeout(() => {
          // Check if there's a redirect URL
          const redirectTo = searchParams.get('redirect') || '/dashboard';
          navigate(redirectTo, { replace: true });
        }, 1000);

      } catch (error) {
        console.error('Auto-login failed:', error);
        setError(error instanceof Error ? error.message : '자동 로그인 실패');
        setStatus('로그인 페이지로 이동 중...');
        
        // Show error message
        message.error('자동 로그인에 실패했습니다. 다시 로그인해주세요.');

        // Redirect to login page after delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    performAutoLogin();
  }, [navigate, searchParams]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '32px',
          fontWeight: 'bold',
          margin: '0 auto 24px',
        }}>
          NH
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#1a202c',
        }}>
          Nova HR
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#718096',
          marginBottom: '32px',
        }}>
          자동 로그인 처리 중
        </p>

        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
          spinning={true}
        />

        <div style={{
          marginTop: '24px',
          fontSize: '14px',
          color: error ? '#f56565' : '#4a5568',
        }}>
          {status}
        </div>

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#fed7d7',
            border: '1px solid #fc8181',
            borderRadius: '8px',
            color: '#c53030',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}
      </div>

      <div style={{
        position: 'fixed',
        bottom: '20px',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '12px',
      }}>
        © 2025 Nova HR. All rights reserved.
      </div>
    </div>
  );
};

export default AutoLogin;