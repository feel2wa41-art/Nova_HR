import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Button, Badge } from 'antd';
import type { MenuProps } from 'antd';
import { useState, useEffect } from 'react';
import {
  HomeOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
  CrownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  InboxOutlined,
  SendOutlined,
  FundProjectionScreenOutlined,
  EyeOutlined,
  FileSearchOutlined,
  CalendarTwoTone,
  HeartOutlined,
  BookOutlined,
  CalendarFilled,
  MessageOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import NotificationCenter from '../notifications/NotificationCenter';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

// Helper function to get the correct logo URL
const getLogoUrl = (logoUrl?: string): string | null => {
  if (!logoUrl) return null;
  
  // If it's already a full URL, return as is
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl;
  }
  
  // If it's a relative path, prepend the API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const baseUrl = API_BASE_URL.replace('/api/v1', ''); // Remove /api/v1 if present
  return `${baseUrl}${logoUrl}`;
};

// Logo component with fallback handling
const CompanyLogo = ({ 
  logoUrl, 
  companyName, 
  size = 'large',
  onError
}: { 
  logoUrl?: string; 
  companyName?: string; 
  size?: 'large' | 'small';
  onError?: () => void;
}) => {
  const logoImageUrl = getLogoUrl(logoUrl);
  const sizeClasses = size === 'large' ? 'w-10 h-10' : 'w-8 h-8';
  const textSizeClass = size === 'large' ? 'text-lg' : 'text-sm';
  
  // If we have a valid logo URL, try to display it
  if (logoImageUrl) {
    return (
      <img 
        src={logoImageUrl}
        alt={`${companyName || 'Company'} logo`}
        className={`${sizeClasses} ${size === 'large' ? 'rounded-lg' : 'rounded'} object-cover flex-shrink-0`}
        onError={onError}
        style={{ minWidth: size === 'large' ? '2.5rem' : '2rem' }}
      />
    );
  }
  
  // Fallback to company initial or default
  return (
    <div className={`${sizeClasses} bg-primary-100 ${size === 'large' ? 'rounded-lg' : 'rounded'} flex items-center justify-center flex-shrink-0 ${size === 'small' ? 'mx-auto' : ''}`}>
      <span className={`text-primary-600 font-semibold ${textSizeClass}`}>
        {companyName?.charAt(0) || 'C'}
      </span>
    </div>
  );
};

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isHRManager, hasPermission, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  // Get inbox count
  const { data: inboxCount } = useQuery({
    queryKey: ['inbox-count'],
    queryFn: () => apiClient.get('/approval/inbox/count').then(res => res.data),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 0, // Always consider stale
  });

  // Get pending approvals count
  const { data: pendingCount } = useQuery({
    queryKey: ['pending-count'],
    queryFn: () => apiClient.get('/approval/pending/count').then(res => res.data),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 0, // Always consider stale
  });

  // Get drafts count
  const { data: draftsCount } = useQuery({
    queryKey: ['drafts-count'],
    queryFn: () => apiClient.get('/approval/drafts/count').then(res => res.data),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 0, // Always consider stale
  });

  // Get outbox count
  const { data: outboxCount } = useQuery({
    queryKey: ['outbox-count'],
    queryFn: () => apiClient.get('/approval/outbox/count').then(res => res.data),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 0, // Always consider stale
  });

  // Get reference count
  const { data: referenceCount } = useQuery({
    queryKey: ['reference-count'],
    queryFn: () => apiClient.get('/approval/reference/count').then(res => res.data),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 0, // Always consider stale
  });

  // Get company information for logo and name
  const { data: companyInfo } = useQuery({
    queryKey: ['company-info'],
    queryFn: () => apiClient.get('/company/my-company').then(res => res.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Reset logo error when company info changes
  useEffect(() => {
    if (companyInfo?.logo_url) {
      setLogoLoadError(false);
    }
  }, [companyInfo?.logo_url]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Check if current path is admin route to toggle admin mode
  useEffect(() => {
    const isAdminPath = location.pathname.startsWith('/admin');
    setAdminMode(isAdminPath);
  }, [location.pathname]);

  // Get user menu items (일반 사용자 메뉴)
  const getUserMenuItems = (): MenuProps['items'] => [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '대시보드',
    },
    {
      key: '/attendance-management',
      icon: <ClockCircleOutlined />,
      label: '근태관리',
      children: [
        {
          key: '/attendance',
          icon: <ClockCircleOutlined />,
          label: '출퇴근',
        },
      ],
    },
    {
      key: '/leave',
      icon: <CalendarOutlined />,
      label: '휴가',
    },
    {
      key: '/leave-approval',
      icon: <CheckCircleOutlined />,
      label: '휴가 승인',
    },
    {
      key: '/daily-report',
      icon: <FileSearchOutlined />,
      label: '일일보고서',
    },
    {
      key: '/weekly-report',
      icon: <CalendarTwoTone />,
      label: '주간보고서',
    },
    {
      key: '/user-health',
      icon: <HeartOutlined />,
      label: '사용자 헬스 체크',
    },
    {
      key: '/approval',
      icon: <FileTextOutlined />,
      label: '전자결재',
      children: [
        {
          key: '/approval/drafts',
          icon: <FileTextOutlined />,
          label: (
            <div className="flex items-center justify-between w-full">
              <span>임시보관함</span>
              <Badge count={draftsCount?.count || 0} size="small" />
            </div>
          ),
        },
        {
          key: '/approval/pending',
          icon: <ClockCircleOutlined />,
          label: (
            <div className="flex items-center justify-between w-full">
              <span>결재 대기</span>
              <Badge count={pendingCount?.count || 0} size="small" />
            </div>
          ),
        },
        {
          key: '/approval/inbox',
          icon: <InboxOutlined />,
          label: (
            <div className="flex items-center justify-between w-full">
              <span>수신함</span>
              <Badge count={inboxCount?.count || 0} size="small" />
            </div>
          ),
        },
        {
          key: '/approval/outbox',
          icon: <SendOutlined />,
          label: (
            <div className="flex items-center justify-between w-full">
              <span>상신함</span>
              <Badge count={outboxCount?.count || 0} size="small" />
            </div>
          ),
        },
        {
          key: '/approval/reference',
          icon: <FileTextOutlined />,
          label: (
            <div className="flex items-center justify-between w-full">
              <span>참조문서</span>
              <Badge count={referenceCount?.count || 0} size="small" />
            </div>
          ),
        },
        {
          key: '/reference-documents',
          icon: <BookOutlined />,
          label: '참고결재문서',
        },
      ],
    },
    {
      key: '/calendar',
      icon: <CalendarFilled />,
      label: '캘린더',
    },
    {
      key: '/community',
      icon: <MessageOutlined />,
      label: 'HR 커뮤니티',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '설정',
    },
  ];

  // Get admin menu items (관리자 메뉴)
  const getAdminMenuItems = (): MenuProps['items'] => [
    {
      key: '/admin/user-management',
      icon: <UserOutlined />,
      label: '사용자 관리',
    },
    {
      key: '/admin/attendance-management',
      icon: <ClockCircleOutlined />,
      label: '근태 관리',
    },
    {
      key: '/admin/leave-management',
      icon: <CalendarOutlined />,
      label: '휴가 관리',
    },
    {
      key: '/admin/leave-types',
      icon: <CalendarOutlined />,
      label: '휴가 종류 관리',
    },
    {
      key: '/admin/user-leave-balance',
      icon: <CalendarOutlined />,
      label: '사용자 휴가 잔여 관리',
    },
    {
      key: '/admin/organization',
      icon: <TeamOutlined />,
      label: 'HR 관리',
    },
    {
      key: '/admin/approval-management',
      icon: <FileTextOutlined />,
      label: '전자결재 관리',
    },
    {
      key: '/admin/company',
      icon: <EnvironmentOutlined />,
      label: '회사 설정',
    },
    {
      key: '/admin/common-code',
      icon: <SettingOutlined />,
      label: '공통코드 관리',
    },
    {
      key: '/admin/overtime-management',
      icon: <ClockCircleOutlined />,
      label: '추가근무 관리',
    },
    {
      key: '/admin/screenshot-gallery',
      icon: <EyeOutlined />,
      label: '스크린캡처 관리',
    },
    {
      key: '/admin/attitude-settings',
      icon: <SettingOutlined />,
      label: '태도 모니터링 설정',
    },
    {
      key: '/admin/desktop-agent',
      icon: <FundProjectionScreenOutlined />,
      label: '데스크톱 에이전트',
    },
  ];

  // Generate dynamic menu items based on admin mode
  const getMenuItems = (): MenuProps['items'] => {
    if (!isHRManager()) {
      return getUserMenuItems();
    }

    if (adminMode) {
      return getAdminMenuItems();
    }

    return getUserMenuItems();
  };

  const getUserDropdownMenuItems = (): MenuProps['items'] => [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '개인설정',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/settings');
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout className='min-h-screen'>
      <Sider
        theme='light'
        width={280}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className='border-r border-gray-200'
        trigger={null}
      >
        <div className={`p-6 ${collapsed ? 'px-3' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <CompanyLogo 
                key={companyInfo?.logo_url || 'no-logo'} // Force re-render when logo changes
                logoUrl={!logoLoadError ? companyInfo?.logo_url : undefined}
                companyName={companyInfo?.name}
                size="large"
                onError={() => setLogoLoadError(true)}
              />
              <div className="min-w-0 flex-1">
                <Title level={4} className='!mb-0 text-primary-600 truncate'>
                  {companyInfo?.name || 'Reko HR'}
                </Title>
                <p className='text-sm text-gray-500 mt-1'> HR Portal</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <CompanyLogo 
                key={companyInfo?.logo_url || 'no-logo'} // Force re-render when logo changes
                logoUrl={!logoLoadError ? companyInfo?.logo_url : undefined}
                companyName={companyInfo?.name}
                size="small"
                onError={() => setLogoLoadError(true)}
              />
            </div>
          )}
        </div>
        {isHRManager() && !collapsed && (
          <div className="px-6 pb-4">
            <div className={`px-3 py-2 rounded-lg text-sm text-center ${
              adminMode 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'bg-gray-50 text-gray-700 border border-gray-200'
            }`}>
              <CrownOutlined className="mr-2" />
              {adminMode ? '관리자 모드' : '사용자 모드'}
            </div>
          </div>
        )}
        <Menu
          mode='inline'
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          className='border-r-0'
          inlineCollapsed={collapsed}
        />
      </Sider>
      <Layout>
        <Header className='bg-white border-b border-gray-200 px-6 flex items-center justify-between'>
          <Button
            type='text'
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className='text-lg'
          />
          <div className='flex items-center gap-3'>
            {isHRManager() && (
              <Button
                type={adminMode ? 'primary' : 'default'}
                icon={<CrownOutlined />}
                onClick={() => {
                  const newMode = !adminMode;
                  setAdminMode(newMode);
                  if (newMode && !location.pathname.startsWith('/admin')) {
                    navigate('/admin/organization');
                  } else if (!newMode && location.pathname.startsWith('/admin')) {
                    navigate('/');
                  }
                }}
                className='transition-colors'
              >
                {adminMode ? '관리자 모드' : '사용자 모드'}
              </Button>
            )}
            <NotificationCenter />
            <Dropdown
              menu={{
                items: getUserDropdownMenuItems(),
                onClick: handleUserMenuClick,
              }}
              placement='bottomRight'
            >
            <div className='flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors'>
              <Avatar size='default' icon={<UserOutlined />} />
              <div className='text-left'>
                <div className='text-sm font-medium'>{user?.name || '사용자'}</div>
                <div className='text-xs text-gray-500'>
                  {user?.title || user?.role} 
                  {isHRManager() && <span className='ml-1 text-orange-500'>• HR 관리자</span>}
                </div>
              </div>
            </div>
            </Dropdown>
          </div>
        </Header>
        <Content className='p-6 bg-gray-50'>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};