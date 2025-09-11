import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Tag, 
  Space, 
  Select,
  DatePicker,
  Typography,
  Spin,
  Empty,
  Statistic,
  Progress
} from 'antd';
import {
  AppstoreOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface AppUsageRecord {
  id: string;
  session_id: string;
  app_name: string;
  app_category: string;
  window_title: string;
  start_time: string;
  duration: number;
  is_productive: boolean;
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      title: string;
    };
  };
}

interface WebUsageRecord {
  id: string;
  session_id: string;
  domain: string;
  url: string;
  category: string;
  visit_count: number;
  is_productive: boolean;
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      title: string;
    };
  };
}

const AppUsageMonitoring: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs(),
  ]);
  const [activeTab, setActiveTab] = useState<'apps' | 'web'>('apps');

  // Get all users for filter
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users').then(res => res.data),
    staleTime: 300000,
  });

  // Get app usage data
  const { data: appUsageData, isLoading: appUsageLoading } = useQuery({
    queryKey: ['app-usage', selectedUser, dateRange],
    queryFn: async () => {
      const params: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        page: 1,
        limit: 100
      };
      if (selectedUser) params.userId = selectedUser;
      const response = await apiClient.get('/attitude/admin/app-usage', { params });
      return response.data;
    },
    staleTime: 30000,
  });

  // Get web usage data
  const { data: webUsageData, isLoading: webUsageLoading } = useQuery({
    queryKey: ['web-usage', selectedUser, dateRange],
    queryFn: async () => {
      const params: any = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        page: 1,
        limit: 100
      };
      if (selectedUser) params.userId = selectedUser;
      const response = await apiClient.get('/attitude/admin/web-usage', { params });
      return response.data;
    },
    staleTime: 30000,
  });

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0분';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  };

  const appUsageColumns = [
    {
      title: '사용자',
      dataIndex: ['session', 'user', 'name'],
      key: 'user',
      render: (name: string, record: AppUsageRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.session.user.title}
          </Text>
        </div>
      ),
    },
    {
      title: '앱 이름',
      dataIndex: 'app_name',
      key: 'app_name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '창 제목',
      dataIndex: 'window_title',
      key: 'window_title',
      render: (title: string) => (
        <Text style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {title || '-'}
        </Text>
      ),
    },
    {
      title: '사용 시간',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => formatDuration(duration),
      sorter: (a: AppUsageRecord, b: AppUsageRecord) => a.duration - b.duration,
    },
    {
      title: '카테고리',
      dataIndex: 'app_category',
      key: 'app_category',
      render: (category: string) => (
        <Tag color={category === 'PRODUCTIVITY' ? 'green' : category === 'COMMUNICATION' ? 'blue' : 'orange'}>
          {category}
        </Tag>
      ),
    },
    {
      title: '생산성',
      dataIndex: 'is_productive',
      key: 'is_productive',
      render: (productive: boolean, record: AppUsageRecord) => (
        <div>
          <Tag color={productive ? 'success' : 'error'}>
            {productive ? '생산적' : '비생산적'}
          </Tag>
          {record.app_category === 'PRODUCTIVITY' && (
            <Tag color="blue" style={{ marginLeft: 4 }}>
              화이트리스트
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '시작 시간',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (time: string) => format(new Date(time), 'MM/dd HH:mm'),
    },
  ];

  const webUsageColumns = [
    {
      title: '사용자',
      dataIndex: ['session', 'user', 'name'],
      key: 'user',
      render: (name: string, record: WebUsageRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.session.user.title}
          </Text>
        </div>
      ),
    },
    {
      title: '도메인',
      dataIndex: 'domain',
      key: 'domain',
      render: (domain: string) => <Text strong>{domain}</Text>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" 
           style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {url}
        </a>
      ),
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        const colorMap: any = {
          'WORK': 'green',
          'EDUCATION': 'blue',
          'SOCIAL_MEDIA': 'purple',
          'ENTERTAINMENT': 'orange',
          'NEWS': 'cyan',
          'SHOPPING': 'magenta',
          'OTHER': 'default'
        };
        return <Tag color={colorMap[category] || 'default'}>{category}</Tag>;
      },
    },
    {
      title: '방문 횟수',
      dataIndex: 'visit_count',
      key: 'visit_count',
      sorter: (a: WebUsageRecord, b: WebUsageRecord) => a.visit_count - b.visit_count,
    },
    {
      title: '생산성',
      dataIndex: 'is_productive',
      key: 'is_productive',
      render: (productive: boolean, record: WebUsageRecord) => (
        <div>
          <Tag color={productive ? 'success' : 'error'}>
            {productive ? '생산적' : '비생산적'}
          </Tag>
          {(['WORK', 'EDUCATION'].includes(record.category)) && (
            <Tag color="blue" style={{ marginLeft: 4 }}>
              화이트리스트
            </Tag>
          )}
        </div>
      ),
    },
  ];

  const users = usersData || [];
  const appUsage = appUsageData?.data || [];
  const webUsage = webUsageData?.data || [];

  // Calculate statistics
  const totalAppUsage = appUsage.reduce((sum: number, record: AppUsageRecord) => sum + record.duration, 0);
  const productiveAppTime = appUsage
    .filter((record: AppUsageRecord) => record.is_productive)
    .reduce((sum: number, record: AppUsageRecord) => sum + record.duration, 0);
  
  const totalWebVisits = webUsage.reduce((sum: number, record: WebUsageRecord) => sum + record.visit_count, 0);
  const productiveWebVisits = webUsage
    .filter((record: WebUsageRecord) => record.is_productive)
    .reduce((sum: number, record: WebUsageRecord) => sum + record.visit_count, 0);

  const appProductivityRate = totalAppUsage > 0 ? Math.round((productiveAppTime / totalAppUsage) * 100) : 0;
  const webProductivityRate = totalWebVisits > 0 ? Math.round((productiveWebVisits / totalWebVisits) * 100) : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>📊 프로그램 사용 모니터링</Title>
        <Space>
          <Select
            placeholder="사용자 선택"
            allowClear
            style={{ width: 200 }}
            value={selectedUser}
            onChange={setSelectedUser}
          >
            {users.map((user: any) => (
              <Option key={user.id} value={user.id}>
                {user.name} ({user.title})
              </Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates: any) => dates && setDateRange(dates)}
            format="YYYY-MM-DD"
          />
        </Space>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 앱 사용 시간"
              value={formatDuration(totalAppUsage)}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="앱 생산성 비율"
              value={appProductivityRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: appProductivityRate >= 70 ? '#3f8600' : appProductivityRate >= 40 ? '#cf1322' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 웹 방문 횟수"
              value={totalWebVisits}
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="웹 생산성 비율"
              value={webProductivityRate}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: webProductivityRate >= 70 ? '#3f8600' : webProductivityRate >= 40 ? '#cf1322' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tab Selection */}
      <div style={{ marginBottom: '16px' }}>
        <Space>
          <span>보기 모드:</span>
          <Select value={activeTab} onChange={setActiveTab} style={{ width: 120 }}>
            <Option value="apps">앱 사용</Option>
            <Option value="web">웹 사용</Option>
          </Select>
        </Space>
      </div>

      {/* Content */}
      {activeTab === 'apps' ? (
        <Card title="앱 사용 기록">
          <Spin spinning={appUsageLoading}>
            {appUsage.length === 0 ? (
              <Empty description="앱 사용 기록이 없습니다" />
            ) : (
              <Table<AppUsageRecord>
                dataSource={appUsage}
                columns={appUsageColumns}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `총 ${total}개 기록`,
                }}
              />
            )}
          </Spin>
        </Card>
      ) : (
        <Card title="웹사이트 사용 기록">
          <Spin spinning={webUsageLoading}>
            {webUsage.length === 0 ? (
              <Empty description="웹사이트 사용 기록이 없습니다" />
            ) : (
              <Table<WebUsageRecord>
                dataSource={webUsage}
                columns={webUsageColumns}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total) => `총 ${total}개 기록`,
                }}
              />
            )}
          </Spin>
        </Card>
      )}
    </div>
  );
};

export default AppUsageMonitoring;