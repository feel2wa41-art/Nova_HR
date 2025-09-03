import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Space, 
  Button,
  Modal,
  Badge,
  Avatar,
  Typography,
  Tabs,
  Spin,
  notification
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  EyeOutlined,
  ReloadOutlined,
  TeamOutlined,
  CameraOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const { Title, Text } = Typography;

interface ActiveSession {
  id: string;
  user_id: string;
  date: string;
  login_time: string;
  logout_time: string | null;
  total_active_time: number;
  total_idle_time: number;
  productivity_score: number;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
    title: string;
  };
  screenshots: Array<{
    id: string;
    file_url: string;
    captured_at: string;
  }>;
  app_usage?: Array<{
    id: string;
    app_name: string;
    window_title?: string;
    duration: number;
    app_category: string;
    is_productive: boolean;
  }>;
  web_usage?: Array<{
    id: string;
    domain: string;
    url: string;
    category: string;
    visit_count: number;
    is_productive: boolean;
  }>;
}

const LiveMonitoring: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('realtime');

  // Get live monitoring data
  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useQuery({
    queryKey: ['attitude-live-monitoring'],
    queryFn: () => apiClient.get('/attitude/admin/monitoring/live').then(res => res.data),
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });

  // Get all sessions data
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['attitude-admin-sessions'],
    queryFn: () => apiClient.get('/attitude/admin/sessions', { params: { page: 1, limit: 50 } }).then(res => res.data),
    staleTime: 30000,
  });

  const activeSessions = liveData?.sessions || [];
  const activeUsersCount = liveData?.activeUsers || 0;
  const allSessions = sessionsData?.data || [];

  const handleViewDetails = async (session: ActiveSession) => {
    try {
      const response = await apiClient.get(`/attitude/admin/monitoring/user/${session.user_id}`);
      setSelectedSession(response.data);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Error loading session details:', error);
      notification.error({
        message: '오류',
        description: '세션 상세 정보를 불러오는데 실패했습니다'
      });
    }
  };

  const handleCaptureScreen = async (session: ActiveSession) => {
    try {
      const response = await apiClient.post(`/attitude/admin/capture-screenshot/${session.user_id}`);
      notification.success({
        message: '스크린 캡처 요청',
        description: response.data.message || '스크린 캡처를 요청했습니다',
        placement: 'topRight'
      });
    } catch (error: any) {
      console.error('Error capturing screen:', error);
      notification.error({
        message: '스크린 캡처 실패',
        description: error.response?.data?.message || '스크린 캡처 요청에 실패했습니다',
        placement: 'topRight'
      });
    }
  };

  // App usage columns
  const appUsageColumns = [
    {
      title: '앱 이름',
      dataIndex: 'app_name',
      key: 'app_name',
    },
    {
      title: '창 제목',
      dataIndex: 'window_title',
      key: 'window_title',
      render: (title: string) => title || '-',
    },
    {
      title: '사용 시간',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => formatDuration(duration || 0),
    },
    {
      title: '카테고리',
      dataIndex: 'app_category',
      key: 'app_category',
      render: (category: string) => (
        <Tag color={category === 'PRODUCTIVE' ? 'green' : category === 'NEUTRAL' ? 'blue' : 'orange'}>
          {category}
        </Tag>
      ),
    },
    {
      title: '생산성',
      dataIndex: 'is_productive',
      key: 'is_productive',
      render: (productive: boolean) => (
        <Tag color={productive ? 'success' : 'error'}>
          {productive ? '생산적' : '비생산적'}
        </Tag>
      ),
    },
  ];

  // Web usage columns
  const webUsageColumns = [
    {
      title: '도메인',
      dataIndex: 'domain',
      key: 'domain',
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
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
    },
    {
      title: '생산성',
      dataIndex: 'is_productive',
      key: 'is_productive',
      render: (productive: boolean) => (
        <Tag color={productive ? 'success' : 'error'}>
          {productive ? '생산적' : '비생산적'}
        </Tag>
      ),
    },
  ];

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0분';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ko });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'default';
      default: return 'processing';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '활성';
      case 'INACTIVE': return '비활성';
      default: return '알 수 없음';
    }
  };

  const sessionColumns = [
    {
      title: '사용자',
      dataIndex: ['user', 'name'],
      key: 'user',
      render: (name: string, record: ActiveSession) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.user.title}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '로그인 시간',
      dataIndex: 'login_time',
      key: 'login_time',
      render: (time: string) => formatTime(time),
    },
    {
      title: '활동 시간',
      dataIndex: 'total_active_time',
      key: 'total_active_time',
      render: (time: number) => formatDuration(time || 0),
    },
    {
      title: '생산성',
      dataIndex: 'productivity_score',
      key: 'productivity_score',
      render: (score: number) => (
        <Tag color={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error'}>
          {score || 0}%
        </Tag>
      ),
    },
    {
      title: '스크린샷',
      dataIndex: 'screenshots',
      key: 'screenshots',
      render: (screenshots: any[]) => (
        <Badge count={screenshots?.length || 0} />
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '액션',
      key: 'actions',
      render: (_: any, record: ActiveSession) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          >
            상세보기
          </Button>
          <Button
            type="text"
            icon={<CameraOutlined />}
            onClick={() => handleCaptureScreen(record)}
            disabled={record.status !== 'ACTIVE'}
          >
            스크린 캡처
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>📊 실시간 모니터링</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => refetchLive()}>
            새로고침
          </Button>
        </Space>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'realtime',
            label: '실시간 현황',
            children: (
              <div>
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="활성 사용자"
                        value={activeUsersCount}
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="활성 세션"
                        value={activeSessions.length}
                        prefix={<DesktopOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Card title="현재 활성 세션">
                  <Spin spinning={liveLoading}>
                    <Table
                      dataSource={activeSessions}
                      columns={sessionColumns}
                      rowKey="id"
                      pagination={false}
                      locale={{
                        emptyText: '현재 활성 세션이 없습니다'
                      }}
                    />
                  </Spin>
                </Card>
              </div>
            )
          },
          {
            key: 'all-sessions',
            label: '전체 세션',
            children: (
              <Card title="전체 세션 목록">
                <Spin spinning={sessionsLoading}>
                  <Table
                    dataSource={allSessions}
                    columns={sessionColumns}
                    rowKey="id"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (total) => `총 ${total}개 세션`,
                    }}
                  />
                </Spin>
              </Card>
            )
          }
        ]}
      />

      {/* Session Detail Modal */}
      <Modal
        title="세션 상세 정보"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={null}
      >
        {selectedSession && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Card title="사용자 정보" size="small">
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>이름: </Text>{selectedSession.user.name}
                  </Col>
                  <Col span={12}>
                    <Text strong>직책: </Text>{selectedSession.user.title}
                  </Col>
                </Row>
              </Card>

              <Card title="세션 정보" size="small">
                <Row gutter={16}>
                  <Col span={8}>
                    <Text strong>로그인: </Text>{formatTime(selectedSession.login_time)}
                  </Col>
                  <Col span={8}>
                    <Text strong>활동시간: </Text>{formatDuration(selectedSession.total_active_time || 0)}
                  </Col>
                  <Col span={8}>
                    <Text strong>생산성: </Text>{selectedSession.productivity_score || 0}%
                  </Col>
                </Row>
              </Card>

              {selectedSession.screenshots && selectedSession.screenshots.length > 0 && (
                <Card title="스크린샷" size="small">
                  <Text>스크린샷 {selectedSession.screenshots.length}개</Text>
                </Card>
              )}

              {selectedSession.app_usage && selectedSession.app_usage.length > 0 && (
                <Card title="앱 사용 기록" size="small">
                  <Table
                    dataSource={selectedSession.app_usage}
                    columns={appUsageColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ y: 300 }}
                  />
                </Card>
              )}

              {selectedSession.web_usage && selectedSession.web_usage.length > 0 && (
                <Card title="웹사이트 사용 기록" size="small">
                  <Table
                    dataSource={selectedSession.web_usage}
                    columns={webUsageColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ y: 300 }}
                  />
                </Card>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LiveMonitoring;