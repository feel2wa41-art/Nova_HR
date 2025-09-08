import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Badge,
  Typography,
  Row,
  Col,
  Tooltip,
  Statistic
} from 'antd';
import { 
  EyeOutlined,
  EditOutlined,
  BankOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { companyAPI, type Company } from '../lib/api';

const { Title, Text } = Typography;


const CompanyManagement: React.FC = () => {
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: companyAPI.getAllCompanies,
  });

  const totalRevenue = companies.reduce((sum, company) => sum + (company.monthlyRevenue || 0), 0);
  const totalUsers = companies.reduce((sum, company) => sum + (company.userCount || 0), 0);
  const activeCompanies = companies.filter(company => company.status === 'ACTIVE').length;

  const columns: ColumnsType<Company> = [
    {
      title: 'Company Information',
      key: 'company',
      render: (record: Company) => (
        <div>
          <Text strong>{record.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.business_number} | {record.ceo_name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record: Company) => (
        <div>
          <div style={{ fontSize: '12px' }}>{record.email}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.phone}</div>
        </div>
      ),
    },
    {
      title: 'Plan',
      key: 'plan',
      render: (record: Company) => {
        const plan = record.tenant?.plan || 'BASIC';
        const colors = {
          BASIC: 'default',
          PROFESSIONAL: 'blue',
          ENTERPRISE: 'gold'
        };
        return (
          <Tag color={colors[plan as keyof typeof colors]}>
            {plan}
          </Tag>
        );
      },
    },
    {
      title: 'Users',
      key: 'userCount',
      render: (record: Company) => (
        <Space>
          <TeamOutlined />
          <Text>{record.userCount || 0}명</Text>
        </Space>
      ),
    },
    {
      title: 'Monthly Revenue',
      key: 'monthlyRevenue',
      render: (record: Company) => (
        <Text strong style={{ color: '#52c41a' }}>
          ₩{(record.monthlyRevenue || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          ACTIVE: 'success',
          INACTIVE: 'default',
          SUSPENDED: 'error'
        };
        const labels = {
          ACTIVE: 'Active',
          INACTIVE: 'Inactive',
          SUSPENDED: 'Suspended'
        };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {labels[status as keyof typeof labels]}
          </Tag>
        );
      },
    },
    {
      title: 'Registration Date',
      key: 'joinDate',
      render: (record: Company) => new Date(record.joinDate || record.created_at).toLocaleDateString('ko-KR'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Company) => (
        <Space>
          <Tooltip title="회사 상세 및 사용자 관리">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => navigate(`/company/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Settings">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>
        🏢 Company Management
      </Title>

      {/* 전체 통계 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Companies"
              value={companies.length}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Companies"
              value={activeCompanies}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Monthly Revenue"
              value={totalRevenue}
              prefix={<DollarOutlined />}
              suffix="KRW"
              valueStyle={{ color: '#f5222d' }}
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      {/* 플랜별 분포 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#666' }}>
                {companies.filter(c => c.tenant?.plan === 'BASIC').length}
              </div>
              <div style={{ color: '#666' }}>Basic Plan</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                {companies.filter(c => c.tenant?.plan === 'PROFESSIONAL').length}
              </div>
              <div style={{ color: '#666' }}>Professional Plan</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
                {companies.filter(c => c.tenant?.plan === 'ENTERPRISE').length}
              </div>
              <div style={{ color: '#666' }}>Enterprise Plan</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 기업 목록 */}
      <Card>
        <Table
          dataSource={companies}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total ${total} companies`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default CompanyManagement;