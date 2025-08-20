import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems: MenuProps['items'] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '대시보드',
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: '사용자 관리',
  },
  {
    key: '/attendance',
    icon: <ClockCircleOutlined />,
    label: '근태 관리',
  },
  {
    key: '/approval',
    icon: <FileTextOutlined />,
    label: '전자결재 관리',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '설정',
  },
];

const userMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: '프로필',
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

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // TODO: Implement logout
      navigate('/login');
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
          <p className='text-sm text-gray-500 mt-1'>HR 관리자</p>
        </div>
        <Menu
          mode='inline'
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className='border-r-0'
        />
      </Sider>
      <Layout>
        <Header className='bg-white border-b border-gray-200 px-6 flex items-center justify-between'>
          <div />
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleUserMenuClick,
            }}
            placement='bottomRight'
          >
            <div className='flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors'>
              <Avatar size='default' icon={<UserOutlined />} />
              <div className='text-left'>
                <div className='text-sm font-medium'>김인사</div>
                <div className='text-xs text-gray-500'>HR팀</div>
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