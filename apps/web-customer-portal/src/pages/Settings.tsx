import { useState } from 'react';
import { Card, Row, Col, Typography, Tabs } from 'antd';
import { 
  SettingOutlined, 
  UserOutlined, 
  ClockCircleOutlined,
  BellOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { PersonalInfoSettings } from '../components/settings/PersonalInfoSettings';
import { WorkTimeSettings } from '../components/settings/WorkTimeSettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { PersonalizationSettings } from '../components/settings/PersonalizationSettings';

const { Title } = Typography;

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('personal');

  const tabItems = [
    {
      key: 'personal',
      label: (
        <span>
          <UserOutlined />
          개인정보
        </span>
      ),
      children: <PersonalInfoSettings />,
    },
    {
      key: 'worktime',
      label: (
        <span>
          <ClockCircleOutlined />
          근무시간설정
        </span>
      ),
      children: <WorkTimeSettings />,
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          알림 설정
        </span>
      ),
      children: <NotificationSettings />,
    },
    {
      key: 'personalization',
      label: (
        <span>
          <BgColorsOutlined />
          개인화
        </span>
      ),
      children: <PersonalizationSettings />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Title level={2}>
          <SettingOutlined className="mr-2" />
          설정
        </Title>
        <p className="text-gray-600">개인 정보, 알림, 개인화 설정을 관리하세요</p>
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