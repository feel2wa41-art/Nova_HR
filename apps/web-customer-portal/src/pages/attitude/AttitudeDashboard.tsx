import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Button,
  Space,
  Alert,
  Typography,
  Timeline,
  List,
  Avatar,
  Tabs,
  message,
  Modal,
  Image,
} from 'antd';
import {
  ClockCircleOutlined,
  CameraOutlined,
  DesktopOutlined,
  GlobalOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  SettingOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { attitudeApi, AttitudeSession } from '../../lib/api';
import AgentManagement from './AgentManagement';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

const { Title, Text } = Typography;


const AttitudeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<AttitudeSession | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [productivityScore, setProductivityScore] = useState(0);
  const [activeTime, setActiveTime] = useState(0);
  const [idleTime, setIdleTime] = useState(0);
  const [recentScreenshots, setRecentScreenshots] = useState<any[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [appUsage, setAppUsage] = useState<any[]>([]);
  const [webUsage, setWebUsage] = useState<any[]>([]);

  useEffect(() => {
    fetchCurrentSession();
    const interval = setInterval(fetchCurrentSession, 60000); // Update every minute
    
    // Start automatic data collection if session is active
    let dataCollectionInterval: NodeJS.Timeout;
    if (sessionActive) {
      startDataCollection();
    }
    
    return () => {
      clearInterval(interval);
      if (dataCollectionInterval) {
        clearInterval(dataCollectionInterval);
      }
    };
  }, [sessionActive]);

  const fetchCurrentSession = async () => {
    try {
      const response = await attitudeApi.getCurrentSession();
      if (response) {
        setCurrentSession(response);
        setSessionActive(response.status === 'ACTIVE');
        setProductivityScore(response.productivity_score || 0);
        setActiveTime(response.total_active_time || 0);
        setIdleTime(response.total_idle_time || 0);
        setRecentScreenshots(response.screenshots || []);
        setAppUsage(response.app_usage || []);
        setWebUsage(response.web_usage || []);
      }
    } catch (error) {
      console.error('Failed to fetch current session:', error);
    }
  };

  const startSession = async () => {
    setLoading(true);
    try {
      await attitudeApi.startSession({});
      await fetchCurrentSession();
      message.success('근무 태도 모니터링이 시작되었습니다.');
    } catch (error) {
      console.error('Session start error:', error);
      message.error('세션 시작에 실패했습니다. 데스크톱 에이전트가 설치되고 실행 중인지 확인해주세요.');
    }
    setLoading(false);
  };

  const endSession = async () => {
    setLoading(true);
    try {
      await attitudeApi.endSession();
      await fetchCurrentSession();
      message.success('근무 태도 모니터링이 종료되었습니다.');
    } catch (error) {
      message.error('세션 종료에 실패했습니다.');
    }
    setLoading(false);
  };

  // Automatic data collection functions
  const startDataCollection = () => {
    // Collect web usage data every 30 seconds
    const collectData = () => {
      try {
        collectWebUsage();
        collectMouseKeyboardActivity();
      } catch (error) {
        console.error('Data collection error:', error);
      }
    };

    // Start collecting immediately and then every 30 seconds
    collectData();
    const interval = setInterval(collectData, 30000);
    
    // Generate initial mock data
    generateMockAppUsageData();
    // Real screenshots will come from API response
    
    return interval;
  };

  const collectWebUsage = async () => {
    if (!currentSession) return;

    try {
      const currentDomain = window.location.hostname;
      const currentUrl = window.location.href;
      const pageTitle = document.title;

      // Categorize domain
      const category = categorizeDomain(currentDomain);
      
      // For now, create mock web usage data until API is properly set up
      const mockWebUsageData = {
        id: Math.random().toString(),
        session_id: currentSession.id,
        domain: currentDomain,
        url: currentUrl,
        page_title: pageTitle,
        category: category,
        visit_count: 1,
        total_time: 30,
        is_productive: category === 'WORK',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Update local state immediately for demo purposes
      setWebUsage(prev => {
        const existing = prev.find(item => item.domain === currentDomain);
        if (existing) {
          return prev.map(item => 
            item.domain === currentDomain 
              ? { ...item, total_time: item.total_time + 30, visit_count: item.visit_count + 1 }
              : item
          );
        } else {
          return [...prev, mockWebUsageData];
        }
      });
      
      // Update productivity score based on activity
      const productiveTime = webUsage.filter(item => item.is_productive).reduce((sum, item) => sum + (item.total_time || 0), 0);
      const totalTime = webUsage.reduce((sum, item) => sum + (item.total_time || 0), 0);
      if (totalTime > 0) {
        setProductivityScore(Math.round((productiveTime / totalTime) * 100));
      }
    } catch (error) {
      console.error('Web usage collection failed:', error);
    }
  };

  const collectMouseKeyboardActivity = () => {
    // Track user activity for productivity measurement
    let activityCount = 0;
    
    const trackActivity = () => activityCount++;
    
    // Add event listeners for activity tracking
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'click'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    // Report activity after 30 seconds
    setTimeout(() => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity);
      });
      
      // Update active time based on activity
      if (activityCount > 0) {
        setActiveTime(prev => prev + 30);
      } else {
        setIdleTime(prev => prev + 30);
      }
    }, 30000);
  };

  const categorizeDomain = (domain: string): string => {
    const workDomains = ['localhost', 'nova-hr', 'github.com', 'stackoverflow.com', 'docs.google.com'];
    const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com'];
    const entertainmentDomains = ['youtube.com', 'netflix.com', 'twitch.tv'];
    
    if (workDomains.some(d => domain.includes(d))) return 'WORK';
    if (socialDomains.some(d => domain.includes(d))) return 'SOCIAL_MEDIA';
    if (entertainmentDomains.some(d => domain.includes(d))) return 'ENTERTAINMENT';
    
    return 'OTHER';
  };

  const generateMockAppUsageData = () => {
    if (!currentSession) return;
    
    const mockApps = [
      { app_name: 'Chrome', app_category: 'PRODUCTIVITY', duration: Math.floor(Math.random() * 1800) + 300, is_productive: true },
      { app_name: 'VS Code', app_category: 'PRODUCTIVITY', duration: Math.floor(Math.random() * 2400) + 600, is_productive: true },
      { app_name: 'Slack', app_category: 'COMMUNICATION', duration: Math.floor(Math.random() * 600) + 120, is_productive: true },
      { app_name: 'Notion', app_category: 'PRODUCTIVITY', duration: Math.floor(Math.random() * 900) + 180, is_productive: true }
    ];
    
    const appUsageData = mockApps.map(app => ({
      id: Math.random().toString(),
      session_id: currentSession.id,
      ...app,
      window_title: `${app.app_name} - Nova HR`,
      start_time: new Date(Date.now() - app.duration * 1000).toISOString(),
      end_time: new Date().toISOString(),
      created_at: new Date().toISOString()
    }));
    
    setAppUsage(appUsageData);
  };

  const generateMockScreenshots = () => {
    if (!currentSession) return;
    
    const mockScreenshots = [
      { id: '1', thumbnail_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPsyMveuIjCDstZzrpoHvrrk8L3RleHQ+PC9zdmc+', captured_at: new Date(Date.now() - 300000).toISOString() },
      { id: '2', thumbnail_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPsq00akg7J6R7JeF7ZmU66mM7J6sPC90ZXh0Pjwvc3ZnPg==', captured_at: new Date(Date.now() - 600000).toISOString() },
      { id: '3', thumbnail_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTZmN2ZmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPsKs7Ker7IqF7Juc7KWV7Iq164SIIDjrtoU8L3RleHQ+PC9zdmc+', captured_at: new Date(Date.now() - 900000).toISOString() }
    ];
    
    setRecentScreenshots(mockScreenshots);
  };

  const formatDuration = (seconds: number) => {
    const duration = dayjs.duration(seconds, 'seconds');
    return `${Math.floor(duration.asHours())}시간 ${duration.minutes()}분`;
  };

  const handleScreenshotClick = (screenshot: any) => {
    setSelectedScreenshot(screenshot);
    setScreenshotModalOpen(true);
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#f5222d';
  };

  const appColumns = [
    {
      title: '애플리케이션',
      dataIndex: 'app_name',
      key: 'app_name',
    },
    {
      title: '카테고리',
      dataIndex: 'app_category',
      key: 'app_category',
      render: (category: string) => (
        <Tag color={category === 'PRODUCTIVITY' ? 'green' : 'default'}>
          {category}
        </Tag>
      ),
    },
    {
      title: '사용 시간',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => formatDuration(duration || 0),
    },
    {
      title: '생산성',
      dataIndex: 'is_productive',
      key: 'is_productive',
      render: (productive: boolean) => (
        <Tag color={productive ? 'green' : 'red'}>
          {productive ? '생산적' : '비생산적'}
        </Tag>
      ),
    },
  ];

  const webColumns = [
    {
      title: '도메인',
      dataIndex: 'domain',
      key: 'domain',
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={category === 'WORK' ? 'green' : 'default'}>
          {category}
        </Tag>
      ),
    },
    {
      title: '방문 횟수',
      dataIndex: 'visit_count',
      key: 'visit_count',
    },
    {
      title: '총 시간',
      dataIndex: 'total_time',
      key: 'total_time',
      render: (time: number) => formatDuration(time || 0),
    },
    {
      title: '생산성',
      dataIndex: 'is_productive',
      key: 'is_productive',
      render: (productive: boolean) => (
        <Tag color={productive ? 'green' : 'red'}>
          {productive ? '생산적' : '비생산적'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>근무 태도 모니터링</Title>
        <Text type="secondary">
          근무 중 활동을 모니터링하고 생산성을 측정합니다.
        </Text>
      </div>

      {/* Session Control */}
      <Card className="mb-4">
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              {sessionActive ? (
                <>
                  <PlayCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <Text strong>모니터링 진행 중</Text>
                  <Text type="secondary">
                    시작 시간: {currentSession && dayjs(currentSession.login_time).format('HH:mm')}
                  </Text>
                </>
              ) : (
                <>
                  <PauseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                  <Text strong>모니터링 중지됨</Text>
                </>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              {sessionActive ? (
                <Button danger onClick={endSession} loading={loading}>
                  모니터링 종료
                </Button>
              ) : (
                <Button type="primary" onClick={startSession} loading={loading}>
                  모니터링 시작
                </Button>
              )}
              <Button icon={<SettingOutlined />} onClick={() => {
                // Switch to agent management tab
                const agentTab = document.querySelector('[data-node-key="agent"]') as HTMLElement;
                if (agentTab) agentTab.click();
              }}>
                에이전트 설정
              </Button>
            </Space>
          </Col>
        </Row>

        {!sessionActive && (
          <Alert
            message="데스크톱 에이전트 필요"
            description="모니터링을 시작하려면 데스크톱 에이전트가 설치되고 실행되어야 합니다. 에이전트 관리 탭에서 설치하세요."
            type="info"
            showIcon
            className="mt-3"
            action={
              <Button size="small" onClick={() => {
                const agentTab = document.querySelector('[data-node-key="agent"]') as HTMLElement;
                if (agentTab) agentTab.click();
              }}>
                에이전트 관리로 이동
              </Button>
            }
          />
        )}
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="생산성 점수"
              value={productivityScore}
              suffix="%"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: getProductivityColor(productivityScore) }}
            />
            <Progress
              percent={productivityScore}
              strokeColor={getProductivityColor(productivityScore)}
              showInfo={false}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="활동 시간"
              value={formatDuration(activeTime)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="유휴 시간"
              value={formatDuration(idleTime)}
              prefix={<PauseCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="스크린샷"
              value={recentScreenshots.length}
              prefix={<CameraOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Information */}
      <Card>
        <Tabs 
          defaultActiveKey="apps"
          items={[
            {
              key: 'apps',
              label: (
                <span>
                  <DesktopOutlined />
                  애플리케이션 사용
                </span>
              ),
              children: (
                <Table
                  columns={appColumns}
                  dataSource={appUsage}
                  rowKey="id"
                  pagination={false}
                  locale={{ emptyText: '사용 기록이 없습니다' }}
                />
              ),
            },
            {
              key: 'web',
              label: (
                <span>
                  <GlobalOutlined />
                  웹사이트 방문
                </span>
              ),
              children: (
                <Table
                  columns={webColumns}
                  dataSource={webUsage}
                  rowKey="id"
                  pagination={false}
                  locale={{ emptyText: '방문 기록이 없습니다' }}
                />
              ),
            },
            {
              key: 'screenshots',
              label: (
                <span>
                  <CameraOutlined />
                  스크린샷
                </span>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  {recentScreenshots.map((screenshot) => (
                    <Col key={screenshot.id} xs={24} sm={12} md={8} lg={6}>
                      <Card
                        hoverable
                        actions={[
                          <ExpandOutlined key="expand" onClick={() => handleScreenshotClick(screenshot)} />
                        ]}
                        cover={
                          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => handleScreenshotClick(screenshot)}>
                            <img
                              alt="Screenshot"
                              src={screenshot.file_url || screenshot.thumbnail_url}
                              style={{ height: 150, objectFit: 'cover' }}
                              onError={(e) => {
                                // Handle broken images
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuydtOuvuOyngCDsl4bsmYQ8L3RleHQ+PC9zdmc+';
                              }}
                            />
                          </div>
                        }
                      >
                        <Card.Meta
                          description={dayjs(screenshot.captured_at || screenshot.created_at).format('HH:mm:ss')}
                        />
                      </Card>
                    </Col>
                  ))}
                  {recentScreenshots.length === 0 && (
                    <Col span={24}>
                      <Alert
                        message="스크린샷이 없습니다"
                        description="모니터링이 시작되면 주기적으로 스크린샷이 캡처됩니다."
                        type="info"
                      />
                    </Col>
                  )}
                </Row>
              ),
            },
            {
              key: 'agent',
              label: (
                <span>
                  <SettingOutlined />
                  에이전트 관리
                </span>
              ),
              children: <AgentManagement />,
            },
          ]}
        />
      </Card>

      {/* Privacy Notice */}
      <Alert
        message="개인정보 보호 안내"
        description="모든 모니터링 데이터는 업무 생산성 향상을 위해서만 사용되며, 관련 법규에 따라 안전하게 관리됩니다."
        type="info"
        showIcon
        className="mt-4"
      />

      {/* Screenshot Modal */}
      <Modal
        title="스크린샷 상세 보기"
        open={screenshotModalOpen}
        onCancel={() => setScreenshotModalOpen(false)}
        footer={null}
        width={800}
        centered
      >
        {selectedScreenshot && (
          <div>
            <Image
              src={selectedScreenshot.file_url || selectedScreenshot.thumbnail_url}
              alt="Screenshot"
              style={{ width: '100%', marginBottom: 16 }}
              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuydtOuvuOyngCDsl4bsmYQ8L3RleHQ+PC9zdmc+"
            />
            <Typography.Text type="secondary">
              캡처 시간: {dayjs(selectedScreenshot.captured_at || selectedScreenshot.created_at).format('YYYY년 MM월 DD일 HH:mm:ss')}
            </Typography.Text>
            {selectedScreenshot.active_app && (
              <div style={{ marginTop: 8 }}>
                <Typography.Text type="secondary">
                  활성 앱: {selectedScreenshot.active_app}
                </Typography.Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AttitudeDashboard;