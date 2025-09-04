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
      title: 'Company Name',
      dataIndex: 'companyName',
      key: 'companyName',
    },
    {
      title: 'Requester',
      dataIndex: 'requesterName',
      key: 'requesterName',
    },
    {
      title: 'Request Date',
      dataIndex: 'requestDate',
      key: 'requestDate',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          PENDING: 'orange',
          APPROVED: 'green',
          REJECTED: 'red'
        };
        const labels = {
          PENDING: 'Pending',
          APPROVED: 'Approved',
          REJECTED: 'Rejected'
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
        📊 Service Provider Dashboard
      </Title>
      
      {/* 통계 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Companies"
              value={dashboardStats.totalCompanies}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Companies"
              value={dashboardStats.activeCompanies}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Applications"
              value={dashboardStats.pendingRequests}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Users"
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
              title="This Month's Expected Revenue"
              value={dashboardStats.monthlyRevenue}
              prefix={<DollarOutlined />}
              suffix="KRW"
              valueStyle={{ color: '#f5222d' }}
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="Average Revenue per Company"
              value={Math.round(dashboardStats.monthlyRevenue / dashboardStats.activeCompanies)}
              prefix={<BankOutlined />}
              suffix="KRW"
              valueStyle={{ color: '#13c2c2' }}
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      {/* 최근 기업 가입 신청 */}
      <Card title="🏢 Recent Company Applications" style={{ marginBottom: '32px' }}>
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
          <Card title="🔧 System Status">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>API Server</span>
                <Tag color="green">Normal</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Database</span>
                <Tag color="green">Normal</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Email Service</span>
                <Tag color="green">Normal</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>File Storage</span>
                <Tag color="orange">Maintenance</Tag>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="📈 This Week's Activity">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>New Company Registrations</span>
                <strong style={{ color: '#1890ff' }}>3</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Approvals Processed</span>
                <strong style={{ color: '#52c41a' }}>2</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>New Users</span>
                <strong style={{ color: '#722ed1' }}>45</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Support Tickets</span>
                <strong style={{ color: '#fa8c16' }}>1</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;