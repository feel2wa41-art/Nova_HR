import { useState } from 'react';
import { Typography, Tabs, Card } from 'antd';
import type { TabsProps } from 'antd';
import { CategoryManagement } from './CategoryManagement';
import { RouteTemplateManagement } from './RouteTemplateManagement';
import { AutoApprovalSettings } from './AutoApprovalSettings';
import { ApprovalStatistics } from './ApprovalStatistics';

const { Title } = Typography;

export const ApprovalPage = () => {
  const [activeTab, setActiveTab] = useState('categories');

  const tabItems: TabsProps['items'] = [
    {
      key: 'categories',
      label: '결재 양식 관리',
      children: <CategoryManagement />,
    },
    {
      key: 'templates',
      label: '결재선 템플릿',
      children: <RouteTemplateManagement />,
    },
    {
      key: 'auto-approval',
      label: '자동 승인 설정',
      children: <AutoApprovalSettings />,
    },
    {
      key: 'statistics',
      label: '결재 통계',
      children: <ApprovalStatistics />,
    },
  ];

  return (
    <div>
      <Title level={2}>전자결재 관리</Title>
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