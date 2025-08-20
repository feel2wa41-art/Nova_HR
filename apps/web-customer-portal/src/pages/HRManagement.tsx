import { Card, Tabs, Typography } from 'antd';
import { TeamOutlined, CheckCircleOutlined, UserOutlined, SettingOutlined, SafetyOutlined, CalendarOutlined } from '@ant-design/icons';
import { ApprovalManagement } from '../components/hr/ApprovalManagement';
import { AttendanceManagement } from '../components/hr/AttendanceManagement';
import { EnhancedOrganizationChart } from '../components/hr/EnhancedOrganizationChart';
import { MenuPermissionManagement } from '../components/hr/MenuPermissionManagement';
import { DetailedPermissionManagement } from '../components/hr/DetailedPermissionManagement';
import { UserManagement } from './admin/UserManagement';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

const { Title } = Typography;

export const HRManagement = () => {
  const location = useLocation();
  const [activeKey, setActiveKey] = useState('attendance');

  useEffect(() => {
    // Handle URL query parameters for direct navigation
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveKey(tab);
    }
  }, [location]);

  const tabItems = [
    {
      key: 'attendance',
      label: (
        <span>
          <CalendarOutlined />
          출석 관리
        </span>
      ),
      children: <AttendanceManagement />,
    },
    {
      key: 'approval',
      label: (
        <span>
          <CheckCircleOutlined />
          승인 관리
        </span>
      ),
      children: <ApprovalManagement />,
    },
    {
      key: 'organization',
      label: (
        <span>
          <TeamOutlined />
          조직도
        </span>
      ),
      children: <EnhancedOrganizationChart />,
    },
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined />
          사용자 관리
        </span>
      ),
      children: <UserManagement />,
    },
    {
      key: 'menu-permissions',
      label: (
        <span>
          <SettingOutlined />
          메뉴 권한
        </span>
      ),
      children: <MenuPermissionManagement />,
    },
    {
      key: 'detailed-permissions',
      label: (
        <span>
          <SafetyOutlined />
          상세 권한
        </span>
      ),
      children: <DetailedPermissionManagement />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Title level={2}>HR 관리</Title>
        <p className="text-gray-600">
          출석 관리, 승인 처리, 조직도 관리, 사용자 관리, 메뉴 권한, 상세 권한을 통합 관리할 수 있습니다.
        </p>
      </div>

      <Card>
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};