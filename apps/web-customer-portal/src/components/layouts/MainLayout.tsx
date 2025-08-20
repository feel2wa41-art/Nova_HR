import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Divider } from 'antd';
import type { MenuProps } from 'antd';
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
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isHRManager, hasPermission } = useAuth();

  // Generate dynamic menu items based on user permissions
  const getMenuItems = (): MenuProps['items'] => {
    const baseItems = [
      {
        key: '/',
        icon: <HomeOutlined />,
        label: '대시보드',
      },
      {
        key: '/attendance',
        icon: <ClockCircleOutlined />,
        label: '출퇴근',
      },
      {
        key: '/leave',
        icon: <CalendarOutlined />,
        label: '휴가',
      },
      {
        key: '/approval',
        icon: <FileTextOutlined />,
        label: '전자결재',
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
          key: '/hr-management',
          icon: <CrownOutlined />,
          label: 'HR 관리',
        },
        {
          key: 'admin',
          icon: <SettingOutlined />,
          label: '관리자',
          children: [
            {
              key: '/admin/users',
              icon: <TeamOutlined />,
              label: '사용자 관리',
            },
            {
              key: '/admin/company',
              icon: <EnvironmentOutlined />,
              label: '회사 설정',
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

  return (
    <Layout className='min-h-screen'>
      <Sider
        theme='light'
        width={280}
        className='border-r border-gray-200'
      >
        <div className='p-6'>
          <Title level={3} className='!mb-0 text-primary-600'>
            Nova HR
          </Title>
          <p className='text-sm text-gray-500 mt-1'>임직원 포털</p>
        </div>
        <Menu
          mode='inline'
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          className='border-r-0'
        />
      </Sider>
      <Layout>
        <Header className='bg-white border-b border-gray-200 px-6 flex items-center justify-between'>
          <div />
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
        </Header>
        <Content className='p-6 bg-gray-50'>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};