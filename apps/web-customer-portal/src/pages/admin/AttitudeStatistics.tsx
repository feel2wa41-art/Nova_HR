import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Table,
  Space,
  Button,
  Typography,
  Progress,
  Tag,
  Avatar,
  Spin,
  message,
  Tabs,
  List,
  Divider,
} from 'antd';
import {
  BarChartOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  TrophyOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import dayjs, { Dayjs } from 'dayjs';
import { Column } from '@ant-design/charts';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
// Removed TabPane destructure as it's deprecated in Ant Design v5

interface SessionStats {
  totalSessions: number;
  activeUsers: number;
  averageProductivity: number;
  totalActiveTime: number;
}

interface UserProductivity {
  id: string;
  name: string;
  email: string;
  department: string;
  productivityScore: number;
  activeTime: number;
  sessionsCount: number;
  lastActivity: string;
  avatar_url?: string;
}

interface DepartmentStats {
  department: string;
  averageProductivity: number;
  totalUsers: number;
  activeUsers: number;
  totalActiveTime: number;
}

interface AppUsageStats {
  appName: string;
  totalTime: number;
  usageCount: number;
  averageProductivity: number;
}

const AttitudeStatistics: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs(),
  ]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const queryClient = useQueryClient();

  // Get session statistics
  const { data: sessionStats, isLoading: sessionStatsLoading, refetch: refetchSessionStats } = useQuery({
    queryKey: ['attitude-session-stats', dateRange, selectedDepartment],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      });
      if (selectedDepartment) {
        params.append('department', selectedDepartment);
      }
      const response = await apiClient.get(`/attitude/admin/sessions?${params}`);
      
      // Calculate statistics from sessions data
      const sessions = response.data.sessions || [];
      const uniqueUsers = new Set(sessions.map((s: any) => s.user_id));
      const totalActiveTime = sessions.reduce((sum: number, s: any) => sum + (s.total_active_time || 0), 0);
      const averageProductivity = sessions.length > 0 
        ? sessions.reduce((sum: number, s: any) => sum + (s.productivity_score || 0), 0) / sessions.length
        : 0;

      return {
        totalSessions: sessions.length,
        activeUsers: uniqueUsers.size,
        averageProductivity: Math.round(averageProductivity),
        totalActiveTime,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });

  // Get productivity report
  const { data: productivityReport, isLoading: productivityLoading } = useQuery({
    queryKey: ['attitude-productivity-report', dateRange, selectedDepartment],
    queryFn: async () => {
      const params = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      };
      if (selectedDepartment) {
        (params as any).department = selectedDepartment;
      }
      const response = await apiClient.get('/attitude/admin/report/productivity', { params });
      return response.data;
    },
    staleTime: 30000,
  });

  // Get user sessions for detailed view
  const { data: userSessions, isLoading: userSessionsLoading } = useQuery({
    queryKey: ['attitude-user-sessions', dateRange, selectedDepartment],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        limit: '100',
      });
      if (selectedDepartment) {
        params.append('department', selectedDepartment);
      }
      const response = await apiClient.get(`/attitude/admin/sessions?${params}`);
      
      // Group by user and calculate user-level statistics
      const userMap = new Map();
      const sessions = response.data.sessions || [];
      
      sessions.forEach((session: any) => {
        const userId = session.user_id;
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            name: session.user?.name || 'Unknown',
            email: session.user?.email || '',
            department: session.user?.department || 'Unknown',
            avatar_url: session.user?.avatar_url,
            sessions: [],
            totalActiveTime: 0,
            totalProductivity: 0,
          });
        }
        
        const user = userMap.get(userId);
        user.sessions.push(session);
        user.totalActiveTime += session.total_active_time || 0;
        user.totalProductivity += session.productivity_score || 0;
      });

      return Array.from(userMap.values()).map((user: any) => ({
        ...user,
        sessionsCount: user.sessions.length,
        productivityScore: user.sessions.length > 0 
          ? Math.round(user.totalProductivity / user.sessions.length) 
          : 0,
        activeTime: user.totalActiveTime,
        lastActivity: user.sessions[0]?.updated_at || '',
      }));
    },
    staleTime: 30000,
  });

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value);
  };

  const exportReport = () => {
    message.info('보고서 내보내기 기능이 곧 제공됩니다.');
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const userColumns = [
    {
      title: '사용자',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: UserProductivity) => (
        <Space>
          <Avatar 
            src={record.avatar_url} 
            icon={<UserOutlined />}
            size={40}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
      render: (department: string) => (
        <Tag color="blue">{department}</Tag>
      ),
    },
    {
      title: '생산성',
      dataIndex: 'productivityScore',
      key: 'productivity',
      render: (score: number) => (
        <Space>
          <Progress
            type="circle"
            size={50}
            percent={score}
            strokeColor={getProductivityColor(score)}
            format={() => `${score}%`}
          />
        </Space>
      ),
      sorter: (a: UserProductivity, b: UserProductivity) => 
        a.productivityScore - b.productivityScore,
    },
    {
      title: '활동 시간',
      dataIndex: 'activeTime',
      key: 'activeTime',
      render: (time: number) => formatDuration(time),
      sorter: (a: UserProductivity, b: UserProductivity) => a.activeTime - b.activeTime,
    },
    {
      title: '세션 수',
      dataIndex: 'sessionsCount',
      key: 'sessionsCount',
      sorter: (a: UserProductivity, b: UserProductivity) => a.sessionsCount - b.sessionsCount,
    },
    {
      title: '마지막 활동',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
      render: (timestamp: string) => (
        <Text>{dayjs(timestamp).format('MM-DD HH:mm')}</Text>
      ),
    },
  ];

  const chartData = userSessions?.slice(0, 10).map((user: UserProductivity) => ({
    name: user.name,
    productivity: user.productivityScore,
    activeTime: Math.round(user.activeTime / 3600), // Convert to hours
  })) || [];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Title level={2}>📊 태도 관리 통계</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          <Select
            placeholder="부서 선택"
            style={{ width: 120 }}
            allowClear
            value={selectedDepartment}
            onChange={handleDepartmentChange}
          >
            <Option value="">전체</Option>
            <Option value="개발팀">개발팀</Option>
            <Option value="HR팀">HR팀</Option>
            <Option value="영업팀">영업팀</Option>
            <Option value="마케팅팀">마케팅팀</Option>
          </Select>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              refetchSessionStats();
              queryClient.invalidateQueries({ queryKey: ['attitude-productivity-report'] });
              queryClient.invalidateQueries({ queryKey: ['attitude-user-sessions'] });
            }}
          >
            새로고침
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={exportReport}
          >
            보고서 내보내기
          </Button>
        </Space>
      </div>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 세션 수"
              value={sessionStats?.totalSessions || 0}
              prefix={<BarChartOutlined />}
              loading={sessionStatsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="활성 사용자"
              value={sessionStats?.activeUsers || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={sessionStatsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="평균 생산성"
              value={sessionStats?.averageProductivity || 0}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ 
                color: getProductivityColor(sessionStats?.averageProductivity || 0) 
              }}
              loading={sessionStatsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 활동 시간"
              value={formatDuration(sessionStats?.totalActiveTime || 0)}
              prefix={<ClockCircleOutlined />}
              loading={sessionStatsLoading}
            />
          </Card>
        </Col>
      </Row>

      <Tabs 
        defaultActiveKey="users" 
        type="card"
        items={[
          {
            key: 'users',
            label: '사용자별 통계',
            children: (
          <Card title="사용자별 생산성 현황">
            <Table
              dataSource={userSessions}
              columns={userColumns}
              rowKey="id"
              loading={userSessionsLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `총 ${total}명`,
              }}
              scroll={{ x: 1000 }}
            />
          </Card>
            )
          },
          {
            key: 'chart',
            label: '생산성 차트',
            children: (
          <Card title="상위 사용자 생산성 차트">
            {chartData.length > 0 ? (
              <Column
                data={chartData}
                xField="name"
                yField="productivity"
                meta={{
                  productivity: {
                    alias: '생산성 점수 (%)',
                  },
                }}
                color={({ productivity }) => getProductivityColor(productivity)}
                label={{
                  position: 'middle',
                  style: {
                    fill: '#FFFFFF',
                    opacity: 0.6,
                  },
                }}
                height={400}
              />
            ) : (
              <div style={{ 
                height: 400, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Spin size="large" />
              </div>
            )}
          </Card>
            )
          },
          {
            key: 'departments',
            label: '부서별 통계',
            children: (
          <Card title="부서별 성과 비교">
            <List
              dataSource={[
                { department: '개발팀', productivity: 85, users: 12, activeTime: 45600 },
                { department: 'HR팀', productivity: 78, users: 3, activeTime: 19800 },
                { department: '영업팀', productivity: 72, users: 8, activeTime: 28800 },
                { department: '마케팅팀', productivity: 68, users: 5, activeTime: 21600 },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<TeamOutlined />} />}
                    title={item.department}
                    description={`${item.users}명의 사용자`}
                  />
                  <div>
                    <Space direction="vertical" align="end">
                      <Progress
                        percent={item.productivity}
                        strokeColor={getProductivityColor(item.productivity)}
                        size="small"
                        style={{ width: 120 }}
                      />
                      <Text type="secondary">
                        {formatDuration(item.activeTime)}
                      </Text>
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          </Card>
            )
          }
        ]}
      />
    </div>
  );
};

export default AttitudeStatistics;