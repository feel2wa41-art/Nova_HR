import React from 'react';
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
  DollarOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { companyAPI, type Company } from '../lib/api';

const { Title, Text } = Typography;


const CompanyManagement: React.FC = () => {
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: companyAPI.getAllCompanies,
  });

  const totalRevenue = companies.reduce((sum, company) => sum + (company.monthlyRevenue || 0), 0);
  const totalUsers = companies.reduce((sum, company) => sum + (company.userCount || 0), 0);
  const activeCompanies = companies.filter(company => company.status === 'ACTIVE').length;

  const columns: ColumnsType<Company> = [
    {
      title: '회사정보',
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
      title: '연락처',
      key: 'contact',
      render: (record: Company) => (
        <div>
          <div style={{ fontSize: '12px' }}>{record.email}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.phone}</div>
        </div>
      ),
    },
    {
      title: '플랜',
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
      title: '사용자',
      key: 'userCount',
      render: (record: Company) => (
        <Badge count={record.userCount || 0} color="#1890ff" />
      ),
    },
    {
      title: '월 매출',
      key: 'monthlyRevenue',
      render: (record: Company) => (
        <Text strong style={{ color: '#52c41a' }}>
          ₩{(record.monthlyRevenue || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          ACTIVE: 'success',
          INACTIVE: 'default',
          SUSPENDED: 'error'
        };
        const labels = {
          ACTIVE: '활성',
          INACTIVE: '비활성',
          SUSPENDED: '정지'
        };
        return (
          <Tag color={colors[status as keyof typeof colors]}>
            {labels[status as keyof typeof labels]}
          </Tag>
        );
      },
    },
    {
      title: '가입일',
      key: 'joinDate',
      render: (record: Company) => new Date(record.joinDate || record.created_at).toLocaleDateString('ko-KR'),
    },
    {
      title: '작업',
      key: 'actions',
      render: () => (
        <Space>
          <Tooltip title="상세보기">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
            />
          </Tooltip>
          <Tooltip title="설정">
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
        🏢 기업 관리
      </Title>

      {/* 전체 통계 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 기업 수"
              value={companies.length}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="활성 기업"
              value={activeCompanies}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="총 사용자"
              value={totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="월 총 매출"
              value={totalRevenue}
              prefix={<DollarOutlined />}
              suffix="원"
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
              <div style={{ color: '#666' }}>Basic 플랜</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                {companies.filter(c => c.tenant?.plan === 'PROFESSIONAL').length}
              </div>
              <div style={{ color: '#666' }}>Professional 플랜</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
                {companies.filter(c => c.tenant?.plan === 'ENTERPRISE').length}
              </div>
              <div style={{ color: '#666' }}>Enterprise 플랜</div>
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
            showTotal: (total) => `총 ${total}개 기업`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default CompanyManagement;