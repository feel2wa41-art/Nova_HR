import { useState } from 'react';
import { Typography, Tabs, Card, Row, Col, Statistic, Alert, Badge } from 'antd';
import { FileTextOutlined, NodeIndexOutlined, RobotOutlined, BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { CategoryManagement } from './CategoryManagement';
import { RouteTemplateManagement } from './RouteTemplateManagement';
import { AutoApprovalSettings } from './AutoApprovalSettings';
import { ApprovalStatistics } from './ApprovalStatistics';

const { Title } = Typography;

export const ApprovalManagement = () => {
  const [activeTab, setActiveTab] = useState('categories');

  const tabItems: TabsProps['items'] = [
    {
      key: 'categories',
      label: (
        <span>
          <FileTextOutlined />
          결재 양식 관리
        </span>
      ),
      children: <CategoryManagement />,
    },
    {
      key: 'templates',
      label: (
        <span>
          <NodeIndexOutlined />
          결재선 템플릿
        </span>
      ),
      children: <RouteTemplateManagement />,
    },
    {
      key: 'auto-approval',
      label: (
        <span>
          <RobotOutlined />
          자동 승인 설정
        </span>
      ),
      children: <AutoApprovalSettings />,
    },
    {
      key: 'statistics',
      label: (
        <span>
          <BarChartOutlined />
          결재 통계
        </span>
      ),
      children: <ApprovalStatistics />,
    },
  ];

  // 가상 통계 데이터 (실제로는 API에서 가져와야 함)
  const stats = {
    totalCategories: 6,
    activeCategories: 6,
    totalTemplates: 3,
    autoRules: 1,
  };

  return (
    <div className="space-y-6">
      <div>
        <Title level={2}>전자결재 관리</Title>
        <p className="text-gray-600">전자결재 시스템의 양식, 결재선, 자동승인 규칙을 관리하고 통계를 확인할 수 있습니다.</p>
      </div>

      {/* 현황 카드 */}
      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="결재 양식"
              value={stats.totalCategories}
              suffix="개"
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="mt-2">
              <Badge status="success" text={`${stats.activeCategories}개 활성`} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="결재선 템플릿"
              value={stats.totalTemplates}
              suffix="개"
              prefix={<NodeIndexOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="mt-2">
              <Badge status="processing" text="설정 완료" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="자동 승인 규칙"
              value={stats.autoRules}
              suffix="개"
              prefix={<RobotOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="mt-2">
              <Badge status="default" text="구성 중" />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="시스템 상태"
              value="정상"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="mt-2">
              <Badge status="success" text="모든 서비스 정상" />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 설정 가이드 */}
      <Alert
        message="전자결재 시스템 설정 가이드"
        description={
          <div>
            <p>1. <strong>결재 양식 관리</strong>: 기본 양식을 설정하거나 새로운 양식을 추가하세요.</p>
            <p>2. <strong>결재선 템플릿</strong>: 부서별, 금액별 결재선을 미리 구성하세요.</p>
            <p>3. <strong>자동 승인 설정</strong>: 특정 조건에서 자동으로 승인되도록 규칙을 설정하세요.</p>
            <p>4. <strong>결재 통계</strong>: 결재 현황과 처리 통계를 확인하세요.</p>
          </div>
        }
        type="info"
        showIcon
        closable
      />

      {/* 탭 콘텐츠 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: 24 }}
        />
      </Card>
    </div>
  );
};