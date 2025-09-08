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

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isHRManager, hasPermission, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Generate dynamic menu items based on user permissions
  const getMenuItems = (): MenuProps['items'] => {
    const baseItems = [
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
          {
            key: '/attitude',
            icon: <FundProjectionScreenOutlined />,
            label: '태도',
          },
        ],
      },
      {
        key: '/leave',
        icon: <CalendarOutlined />,
        label: '휴가',
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
        ],
      },
      {
        key: '/reference-documents',
        icon: <BookOutlined />,
        label: '참고결재문서',
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

    // Add HR Manager menu items
    if (isHRManager()) {
      baseItems.push(
        {
          type: 'divider',
        } as any,
        {
          key: 'admin',
          icon: <CrownOutlined />,
          label: '관리자',
          children: [
            {
              key: '/admin/users',
              icon: <UserOutlined />,
              label: '직원 관리',
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
              key: '/admin/organization',
              icon: <TeamOutlined />,
              label: '조직도 관리',
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
              key: '/admin/monitoring',
              icon: <EyeOutlined />,
              label: '실시간 모니터링',
            },
            {
              key: '/admin/attitude-statistics',
              icon: <BarChartOutlined />,
              label: '태도 통계',
            },
          ],
        }
      );
    }

    return baseItems;
  };

  const getUserMenuItems = (): MenuProps['items'] => [
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
            <>
              <Title level={3} className='!mb-0 text-primary-600'>
                Reko HR
              </Title>
              <p className='text-sm text-gray-500 mt-1'> HR Portal</p>
            </>
          ) : (
            <Title level={4} className='!mb-0 text-primary-600 text-center'>
              NH
            </Title>
          )}
        </div>
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
            <NotificationCenter />
            <Dropdown
              menu={{
                items: getUserMenuItems(),
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