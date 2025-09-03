import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography } from 'antd';
import {
  TeamOutlined,
  BankOutlined,
  UserOutlined,
  CheckCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';

const { Title } = Typography;

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  pendingRequests: number;
  totalUsers: number;
  monthlyRevenue: number;
}

const Dashboard: React.FC = () => {
  // Mock data for now
  const dashboardStats: DashboardStats = {
    totalCompanies: 25,
    activeCompanies: 22,
    pendingRequests: 3,
    totalUsers: 450,
    monthlyRevenue: 2500000
  };

  const recentRequests = [
    {
      id: '1',
      companyName: '(주)테크놀로지',
      requesterName: '김대표',
      requestDate: '2024-08-28',
      status: 'PENDING'
    },
    {
      id: '2',
      companyName: '스타트업코리아',
      requesterName: '이CEO',
      requestDate: '2024-08-27',
      status: 'APPROVED'
    },
    {
      id: '3',
      companyName: '글로벌기업',
      requesterName: '박사장',
      requestDate: '2024-08-26',
      status: 'PENDING'
    },
  ];

  const columns = [
    {
      title: '회사명',
      dataIndex: 'companyName',
      key: 'companyName',
    },
    {
      title: '요청자',
      dataIndex: 'requesterName',
      key: 'requesterName',
    },
    {
      title: '요청일',
      dataIndex: 'requestDate',
      key: 'requestDate',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          PENDING: 'orange',
          APPROVED: 'green',
          REJECTED: 'red'
        };
        const labels = {
          PENDING: '대기중',
          APPROVED: '승인됨',
          REJECTED: '거부됨'
        };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {labels[status as keyof typeof labels]}
          </Tag>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        📊 서비스 제공자 대시보드
      </Title>
      
      {/* 통계 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 기업 수"
              value={dashboardStats.totalCompanies}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="활성 기업"
              value={dashboardStats.activeCompanies}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="대기 중 신청"
              value={dashboardStats.pendingRequests}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 사용자"
              value={dashboardStats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 월 매출 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col span={12}>
          <Card>
            <Statistic
              title="이번 달 예상 매출"
              value={dashboardStats.monthlyRevenue}
              prefix={<DollarOutlined />}
              suffix="원"
              valueStyle={{ color: '#f5222d' }}
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="평균 기업당 매출"
              value={Math.round(dashboardStats.monthlyRevenue / dashboardStats.activeCompanies)}
              prefix={<BankOutlined />}
              suffix="원"
              valueStyle={{ color: '#13c2c2' }}
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      {/* 최근 기업 가입 신청 */}
      <Card title="🏢 최근 기업 가입 신청" style={{ marginBottom: '32px' }}>
        <Table
          dataSource={recentRequests}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* 시스템 상태 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="🔧 시스템 상태">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>API 서버</span>
                <Tag color="green">정상</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>데이터베이스</span>
                <Tag color="green">정상</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>이메일 서비스</span>
                <Tag color="green">정상</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>파일 저장소</span>
                <Tag color="orange">점검중</Tag>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="📈 이번 주 활동">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>새 기업 가입</span>
                <strong style={{ color: '#1890ff' }}>3개</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>승인 처리</span>
                <strong style={{ color: '#52c41a' }}>2건</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>신규 사용자</span>
                <strong style={{ color: '#722ed1' }}>45명</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>지원 티켓</span>
                <strong style={{ color: '#fa8c16' }}>1건</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;