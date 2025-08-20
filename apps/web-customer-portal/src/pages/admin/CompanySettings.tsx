import { useState } from 'react';
import { Card, Typography, Tabs } from 'antd';
import { EnvironmentOutlined, SettingOutlined, WifiOutlined, GlobalOutlined, BankOutlined } from '@ant-design/icons';
import { CompanyLocationSettings } from '../../components/admin/CompanyLocationSettings';
import { AttendanceSettings } from '../../components/admin/AttendanceSettings';
import { NetworkSettings } from '../../components/admin/NetworkSettings';
import { CompanyInfoSettings } from '../../components/admin/CompanyInfoSettings';

const { Title } = Typography;

export const CompanySettings = () => {
  const [activeTab, setActiveTab] = useState('info');

  const tabItems = [
    {
      key: 'info',
      label: (
        <span>
          <BankOutlined />
          기본 정보
        </span>
      ),
      children: <CompanyInfoSettings />,
    },
    {
      key: 'locations',
      label: (
        <span>
          <EnvironmentOutlined />
          회사 위치
        </span>
      ),
      children: <CompanyLocationSettings />,
    },
    {
      key: 'attendance',
      label: (
        <span>
          <SettingOutlined />
          출석 설정
        </span>
      ),
      children: <AttendanceSettings />,
    },
    {
      key: 'network',
      label: (
        <span>
          <WifiOutlined />
          네트워크 설정
        </span>
      ),
      children: <NetworkSettings />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Title level={2}>
          <EnvironmentOutlined className="mr-2" />
          회사 설정
        </Title>
        <p className="text-gray-600">회사 위치 및 출석 관련 설정을 관리하세요</p>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};