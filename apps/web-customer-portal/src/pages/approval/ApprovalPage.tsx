import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Tabs,
  message,
  Spin
} from 'antd';
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { approvalApi } from '../../lib/api';
import { DraftListPage } from './DraftListPage';
import { PendingListPage } from './PendingListPage';
import { CreateDraftPage } from './CreateDraftPage';
import { DraftDetailPage } from './DraftDetailPage';
import { InboxPage } from './InboxPage';
import { OutboxPage } from './OutboxPage';
import { ReferencePage } from './ReferencePage';

const { Title } = Typography;

export const ApprovalPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 통계 데이터 조회 (임시 목업 데이터 사용)
  const mockStats = {
    myDrafts: {
      draft: 2,
      submitted: 1,
      inProgress: 3,
      approved: 15,
      rejected: 1,
    },
    pendingApprovals: 5,
    completedApprovals: 12,
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['approval-stats'],
    queryFn: async () => {
      try {
        return await approvalApi.getStats();
      } catch (error) {
        console.warn('API 서버 연결 실패, 목업 데이터 사용:', error);
        return mockStats;
      }
    },
    refetchInterval: 30000, // 30초마다 갱신
    retry: false,
  });

  const handleNewDraft = () => {
    navigate('/approval/create');
  };

  const getDashboardContent = () => (
    <div className="space-y-6">
      {/* 상단 통계 카드들 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="내 임시저장"
              value={stats?.myDrafts.draft || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="진행중인 결재"
              value={stats?.myDrafts.inProgress || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="결재 대기"
              value={stats?.pendingApprovals || 0}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="완료된 결재"
              value={stats?.myDrafts.approved || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 빠른 액션 */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="!mb-0">빠른 작업</Title>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Button
              type="primary"
              size="large"
              block
              icon={<PlusOutlined />}
              onClick={handleNewDraft}
            >
              새 결재 작성
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button
              size="large"
              block
              icon={<InboxOutlined />}
              onClick={() => navigate('/approval/pending')}
            >
              결재 대기함
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button
              size="large"
              block
              icon={<FileTextOutlined />}
              onClick={() => navigate('/approval/drafts')}
            >
              임시보관함
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button
              size="large"
              block
              icon={<FileTextOutlined />}
              onClick={() => navigate('/approval/reference')}
            >
              참조문서
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 탭 내비게이션 */}
      <Card>
        <Tabs
          activeKey={location.pathname === '/approval' ? 'drafts' : location.pathname.split('/')[2]}
          onChange={(key) => {
            navigate(`/approval/${key}`);
          }}
          items={[
            {
              key: 'drafts',
              label: '임시보관함',
              children: <DraftListPage embedded />,
            },
            {
              key: 'pending',
              label: '결재 대기함',
              children: <PendingListPage embedded />,
            },
          ]}
        />
      </Card>
    </div>
  );

  if (statsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="!mb-0">전자결재</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleNewDraft}
        >
          새 결재 작성
        </Button>
      </div>

      <Routes>
        <Route index element={getDashboardContent()} />
        <Route path="drafts" element={<DraftListPage />} />
        <Route path="pending" element={<PendingListPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="outbox" element={<OutboxPage />} />
        <Route path="reference" element={<ReferencePage />} />
        <Route path="create" element={<CreateDraftPage />} />
        <Route path="drafts/:id" element={<DraftDetailPage />} />
        <Route path="document/:id" element={<DraftDetailPage />} />
      </Routes>
    </div>
  );
};