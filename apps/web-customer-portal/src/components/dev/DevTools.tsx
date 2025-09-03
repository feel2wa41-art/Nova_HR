import React, { useState } from 'react';
import { Button, Dropdown, Card, Space, Typography, Tag, Divider } from 'antd';
import { UserOutlined, ToolOutlined, BugOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Text, Title } = Typography;

interface DevToolsProps {
  style?: React.CSSProperties;
}

const DevTools: React.FC<DevToolsProps> = ({ style }) => {
  const { user, logout } = useAuth();
  const switchUser = (user: any) => {
    // Placeholder for switchUser functionality
    console.log('Switching user:', user);
  };
  const [switching, setSwitching] = useState(false);

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const handleUserSwitch = async (userType: 'employee' | 'hr' | 'admin') => {
    setSwitching(true);
    try {
      await switchUser(userType);
    } finally {
      setSwitching(false);
    }
  };

  const clearAllData = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const userSwitchItems = [
    {
      key: 'employee',
      label: (
        <Space>
          <UserOutlined />
          직원 (홍길동)
          <Tag color="blue">employee@nova-hr.com</Tag>
        </Space>
      ),
      onClick: () => handleUserSwitch('employee'),
    },
    {
      key: 'hr',
      label: (
        <Space>
          <UserOutlined />
          HR 매니저
          <Tag color="orange">hr@nova-hr.com</Tag>
        </Space>
      ),
      onClick: () => handleUserSwitch('hr'),
    },
    {
      key: 'admin',
      label: (
        <Space>
          <UserOutlined />
          관리자
          <Tag color="red">admin@nova-hr.com</Tag>
        </Space>
      ),
      onClick: () => handleUserSwitch('admin'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: (
        <Space>
          <ReloadOutlined />
          로그아웃
        </Space>
      ),
      onClick: logout,
    },
  ];

  return (
    <Card 
      size="small" 
      style={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        zIndex: 1000,
        maxWidth: 300,
        ...style 
      }}
      title={
        <Space>
          <BugOutlined />
          <Title level={5} style={{ margin: 0 }}>개발 도구</Title>
        </Space>
      }
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div>
          <Text strong>현재 사용자:</Text>
          <div>
            <Text>{user?.name || 'Anonymous'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {user?.email} ({user?.role})
            </Text>
          </div>
        </div>
        
        <Divider style={{ margin: '8px 0' }} />
        
        <Space wrap>
          <Dropdown
            menu={{ items: userSwitchItems }}
            placement="topLeft"
            disabled={switching}
          >
            <Button 
              size="small" 
              icon={<UserOutlined />}
              loading={switching}
            >
              사용자 전환
            </Button>
          </Dropdown>
          
          <Button 
            size="small" 
            icon={<ToolOutlined />}
            onClick={clearAllData}
            type="dashed"
          >
            데이터 초기화
          </Button>
        </Space>

        <div style={{ fontSize: '11px', color: '#999' }}>
          <Text type="secondary">
            개발 모드에서만 표시됩니다.
            <br />
            토큰은 자동으로 관리됩니다.
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default DevTools;