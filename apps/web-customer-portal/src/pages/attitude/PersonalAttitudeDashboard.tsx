import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  Typography,
  Space,
  Table,
  Tag,
  Alert,
  Timeline,
  Tabs,
  Select,
  DatePicker,
  Spin,
  Badge,
  message,
  notification,
  Avatar,
  List,
} from 'antd';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  DesktopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  BarChartOutlined,
  AimOutlined,
  CalendarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { AgentUtils, agentBridge } from '../../lib/agentBridge';
import dayjs, { Dayjs } from 'dayjs';
import { Line, Column } from '@ant-design/charts';
import { ProductivityInsights } from '../../components/analytics/ProductivityInsights';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface PersonalSession {
  id: string;
  date: string;
  loginTime: string;
  logoutTime?: string;
  totalActiveTime: number;
  productivityScore: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface AppUsage {
  appName: string;
  totalTime: number;
  category: 'PRODUCTIVE' | 'NEUTRAL' | 'DISTRACTING';
}

const PersonalAttitudeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'days'),
    dayjs(),
  ]);
  const [agentStatus, setAgentStatus] = useState<{
    isRunning: boolean;
    isAuthenticated: boolean;
    version?: string;
    status?: string;
  }>({
    isRunning: false,
    isAuthenticated: false,
  });

  // Check agent status periodically
  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const status = await agentBridge.getAgentStatus();
        setAgentStatus(status);
      } catch (error) {
        console.warn('Failed to check agent status:', error);
        setAgentStatus({ isRunning: false, isAuthenticated: false });
      }
    };

    // Check immediately
    checkAgentStatus();

    // Check every 30 seconds
    const interval = setInterval(checkAgentStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Get current session
  const { data: currentSession, isLoading: currentSessionLoading, refetch: refetchCurrentSession } = useQuery({
    queryKey: ['attitude-current-session'],
    queryFn: () => apiClient.get('/attitude/session/current').then(res => res.data),
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // 30 seconds
  });

  // Get user sessions
  const { data: userSessions, isLoading: userSessionsLoading } = useQuery({
    queryKey: ['attitude-user-sessions', dateRange],
    queryFn: async () => {
      const params = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        page: 1,
        limit: 50,
      };
      const response = await apiClient.get('/attitude/sessions', { params });
      return response.data.data || [];
    },
    staleTime: 30000,
  });

  // Get productivity report
  const { data: productivityReport, isLoading: productivityLoading } = useQuery({
    queryKey: ['attitude-personal-productivity', dateRange],
    queryFn: async () => {
      const data = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        userId: user?.id,
      };
      const response = await apiClient.post('/attitude/report/productivity', data);
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Start/End session mutations with agent login
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      try {
        // 1. 에이전트 자동 로그인을 위한 토큰 공유
        await shareTokenWithAgent();
        
        // 2. 세션 시작
        const response = await apiClient.post('/attitude/session/start', {});
        
        // 3. 에이전트 모니터링 자동 시작
        try {
          const monitoringResult = await agentBridge.startMonitoring();
          if (monitoringResult.success) {
            console.log('✅ Desktop agent monitoring started automatically');
            message.success('데스크톱 모니터링이 자동으로 시작되었습니다');
          } else {
            console.warn('⚠️ Could not start monitoring automatically:', monitoringResult.message);
          }
        } catch (monitoringError) {
          console.warn('Monitoring auto-start failed:', monitoringError);
        }
        
        // 4. 에이전트 상태 확인 (optional - 실패해도 세션은 시작됨)
        try {
          const agentStatus = await apiClient.get('/attitude/agent/status');
          
          // 개발 모드에서는 더 친화적인 메시지 표시
          if (import.meta.env.DEV) {
            if (agentStatus.data.isInstalled) {
              notification.success({
                message: '에이전트 시뮬레이션 모드',
                description: '개발 모드에서는 에이전트가 시뮬레이션됩니다.',
                duration: 5,
                key: 'agent-dev-mode'
              });
            }
          } else {
            // 프로덕션 모드에서만 에이전트 설치 경고 표시
            if (!agentStatus.data.isInstalled) {
              notification.warning({
                message: '에이전트 설치 필요',
                description: '데스크톱 에이전트가 설치되지 않았습니다. 설치 후 다시 시도해주세요.',
                duration: 10,
                key: 'agent-warning'
              });
            } else {
              // 4. 에이전트 자동 실행 시도
              await launchAgent();
            }
          }
        } catch (agentError) {
          console.warn('Agent status check failed:', agentError);
          
          // 개발 모드에서는 에러를 덜 강조
          if (import.meta.env.DEV) {
            console.log('개발 모드: 에이전트 상태 확인 실패는 정상적인 상황입니다.');
          } else {
            notification.info({
              message: '에이전트 연결 확인 중',
              description: '데스크톱 에이전트 연결을 확인하고 있습니다. 수동으로 에이전트를 실행해주세요.',
              duration: 8,
              key: 'agent-info'
            });
          }
        }
        
        return response;
      } catch (error) {
        console.error('Session start error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      notification.success({
        message: '세션 시작됨',
        description: '근무 세션이 시작되었습니다. 데스크톱 에이전트가 자동으로 연결됩니다.',
      });
      refetchCurrentSession();
    },
    onError: (error: any) => {
      console.error('Session start error:', error);
      notification.error({
        message: '세션 시작 실패',
        description: '세션 시작에 실패했습니다. 데스크톱 에이전트를 확인해주세요.',
      });
    },
  });

  // 에이전트와 토큰 공유 함수
  const shareTokenWithAgent = async () => {
    try {
      const token = localStorage.getItem('nova_hr_token');
      
      if (!token) {
        console.warn('No token found for agent authentication');
        return;
      }

      if (!user) {
        console.warn('No user data available for agent authentication');
        return;
      }

      // Use the new agent bridge to authenticate
      const result = await agentBridge.sendAuthToken(token, user);
      
      if (result.success) {
        console.log('✅ Desktop agent authenticated successfully');
        message.success('데스크톱 에이전트 인증 완료');
      } else {
        console.warn('⚠️ Could not authenticate desktop agent:', result.message);
        if (!await agentBridge.isAgentRunning()) {
          message.warning('데스크톱 에이전트가 실행되지 않았습니다. 먼저 에이전트를 시작해주세요.');
        }
      }
      
    } catch (error) {
      console.error('Failed to share token with agent:', error);
      // 에러가 발생해도 세션 시작을 방해하지 않음
    }
  };

  // 에이전트 실행 함수
  // 에이전트 버전 체크 및 업데이트
  const checkAgentVersion = async () => {
    try {
      // 서버에서 최신 버전 정보 가져오기
      const serverInfo = await apiClient.get('/download/agent-status');
      const latestVersion = serverInfo.data.data.latestVersion;

      // 현재 실행 중인 에이전트 버전 확인
      const status = await agentBridge.getAgentStatus();
      
      if (status.isRunning && status.version) {
        console.log(`Current agent version: ${status.version}`);
        console.log(`Latest agent version: ${latestVersion}`);
        
        if (status.version !== latestVersion) {
          // 버전이 다를 경우 업데이트 안내
          notification.warning({
            message: '에이전트 업데이트 필요',
            description: `새로운 버전(${latestVersion})이 있습니다. 기존 에이전트를 종료하고 새 버전을 다운로드하세요.`,
            duration: 0,
            key: 'agent-update-required',
            btn: (
              <Button type="primary" size="small" onClick={() => {
                shutdownAgent();
                downloadAgent();
                notification.destroy('agent-update-required');
              }}>
                업데이트
              </Button>
            )
          });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.warn('Failed to check agent version:', error);
      return true; // 버전 체크 실패시 계속 진행
    }
  };

  // 에이전트 다운로드 및 설치
  const downloadAgent = async () => {
    // 기존 에이전트가 실행 중이면 먼저 종료
    const isRunning = await agentBridge.isAgentRunning();
    if (isRunning) {
      const shutdownResult = await agentBridge.shutdownAgent();
      if (shutdownResult.success) {
        message.info('기존 에이전트를 종료했습니다. 새 버전을 다운로드합니다.');
        // 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const downloadUrl = '/api/v1/download/nova-hr-agent.exe';
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'nova-hr-agent-setup.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('데스크톱 에이전트 다운로드가 시작되었습니다.');
    
    // 다운로드 후 설치 안내
    notification.info({
      message: '설치 안내',
      description: `다운로드한 파일을 마우스 우클릭하여 "관리자 권한으로 실행"을 선택해 설치해주세요. 
      
⚠️ 중요: 기존 에이전트가 실행 중인 경우 자동으로 업데이트됩니다.`,
      duration: 15,
      key: 'agent-install-guide'
    });
  };

  const launchAgent = async () => {
    try {
      const result = await agentBridge.launchAgent();
      if (result.success) {
        message.success('데스크톱 에이전트가 실행되었습니다.');
      } else {
        message.info(result.message || '데스크톱 에이전트를 수동으로 실행해주세요.');
      }
    } catch (error) {
      console.error('Failed to launch agent:', error);
      message.warning('데스크톱 에이전트 실행에 실패했습니다. 수동으로 실행해주세요.');
    }
  };

  const shutdownAgent = async () => {
    try {
      const result = await agentBridge.shutdownAgent();
      if (result.success) {
        message.success('데스크톱 에이전트가 종료되었습니다.');
        // 에이전트 상태 업데이트
        setAgentStatus(prev => ({
          ...prev,
          isRunning: false,
          isAuthenticated: false
        }));
      } else {
        message.error(result.message || '에이전트 종료에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to shutdown agent:', error);
      message.error('에이전트 종료에 실패했습니다.');
    }
  };

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      try {
        // 1. 에이전트 모니터링 자동 중지
        try {
          const monitoringResult = await agentBridge.stopMonitoring();
          if (monitoringResult.success) {
            console.log('✅ Desktop agent monitoring stopped automatically');
            message.success('데스크톱 모니터링이 자동으로 중지되었습니다');
          } else {
            console.warn('⚠️ Could not stop monitoring automatically:', monitoringResult.message);
          }
        } catch (monitoringError) {
          console.warn('Monitoring auto-stop failed:', monitoringError);
        }
        
        // 2. 세션 종료
        const response = await apiClient.post('/attitude/session/end', {});
        return response;
      } catch (error) {
        console.error('Session end error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      message.success('근무 세션이 종료되었습니다.');
      refetchCurrentSession();
    },
    onError: () => {
      message.error('세션 종료에 실패했습니다.');
    },
  });

  // 테스트용 스크린샷 캡처 함수
  const captureTestScreenshot = async () => {
    if (!currentSession) {
      message.error('활성 세션이 없습니다.');
      return;
    }

    try {
      // 현재 화면을 캔버스로 캡처 (브라우저 API 사용)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 화면 크기 설정
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // 배경색 설정
      if (ctx) {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 텍스트 추가
        ctx.fillStyle = '#1890ff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nova HR 테스트 스크린샷', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.fillText(`캡처 시간: ${new Date().toLocaleString()}`, canvas.width / 2, canvas.height / 2);
        ctx.fillText(`사용자: ${user?.name || '익명'}`, canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText(`세션 ID: ${currentSession.id}`, canvas.width / 2, canvas.height / 2 + 60);
      }
      
      // 캔버스를 base64로 변환
      const dataURL = canvas.toDataURL('image/png');
      
      // API로 스크린샷 저장
      const response = await apiClient.post('/attitude/screenshot', {
        sessionId: currentSession.id,
        imageData: dataURL,
        isBlurred: false,
        metadata: {
          activeApp: 'Nova HR Portal',
          timestamp: new Date().toISOString(),
          testMode: true,
          screenSize: `${canvas.width}x${canvas.height}`,
          userAgent: navigator.userAgent
        }
      });

      if (response.data) {
        message.success('테스트 스크린샷이 저장되었습니다!');
        console.log('Screenshot saved:', response.data);
      }
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      message.error('스크린샷 캡처에 실패했습니다.');
    }
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setDateRange([dates[0], dates[1]]);
    }
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

  const getProductivityLabel = (score: number) => {
    if (score >= 80) return '우수';
    if (score >= 60) return '양호';
    return '개선필요';
  };

  // Calculate statistics
  const totalSessions = userSessions?.length || 0;
  const totalActiveTime = userSessions?.reduce((sum: number, session: any) => 
    sum + (session.total_active_time || 0), 0) || 0;
  const averageProductivity = totalSessions > 0 
    ? Math.round(userSessions?.reduce((sum: number, session: any) => 
        sum + (session.productivity_score || 0), 0) / totalSessions)
    : 0;
  const averageSessionTime = totalSessions > 0 
    ? Math.round(totalActiveTime / totalSessions)
    : 0;

  // Chart data
  const chartData = userSessions?.slice(-7).map((session: any) => ({
    date: dayjs(session.date).format('MM-DD'),
    productivity: session.productivity_score || 0,
    activeTime: Math.round((session.total_active_time || 0) / 3600), // Convert to hours
  })) || [];

  const sessionColumns = [
    {
      title: '날짜',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (
        <Text>{dayjs(date).format('YYYY-MM-DD')}</Text>
      ),
    },
    {
      title: '근무 시간',
      key: 'workTime',
      render: (_: any, record: any) => (
        <Text>
          {dayjs(record.login_time).format('HH:mm')} - {
            record.logout_time 
              ? dayjs(record.logout_time).format('HH:mm')
              : '진행 중'
          }
        </Text>
      ),
    },
    {
      title: '활동 시간',
      dataIndex: 'total_active_time',
      key: 'activeTime',
      render: (time: number) => formatDuration(time || 0),
    },
    {
      title: '생산성',
      dataIndex: 'productivity_score',
      key: 'productivity',
      render: (score: number) => (
        <Space>
          <Progress
            type="circle"
            size={50}
            percent={score || 0}
            strokeColor={getProductivityColor(score || 0)}
            format={() => `${score || 0}%`}
          />
          <Tag color={getProductivityColor(score || 0)}>
            {getProductivityLabel(score || 0)}
          </Tag>
        </Space>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>
          {status === 'ACTIVE' ? '진행 중' : '완료'}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Title level={2}>📈 나의 태도 대시보드</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            allowClear={false}
          />
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => message.info('개인 보고서 내보내기 기능이 곧 제공됩니다.')}
          >
            보고서 다운로드
          </Button>
        </Space>
      </div>

      {/* 현재 세션 상태 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                현재 세션 상태
                {agentStatus.isRunning && (
                  <Badge 
                    status={agentStatus.isAuthenticated ? "success" : "warning"} 
                    text={agentStatus.isAuthenticated ? "모니터링 활성" : "인증 대기 중"} 
                  />
                )}
                {!agentStatus.isRunning && (
                  <Badge status="error" text="에이전트 미연결" />
                )}
              </Space>
            }
            extra={
              <Space>
                {currentSession?.status === 'ACTIVE' ? (
                  <Button
                    type="primary"
                    danger
                    icon={<PauseCircleOutlined />}
                    loading={endSessionMutation.isPending}
                    onClick={() => endSessionMutation.mutate()}
                  >
                    세션 종료
                  </Button>
                ) : (
                  <Space>
                    {!agentStatus.isRunning ? (
                      // 에이전트가 설치되지 않은 경우 다운로드 버튼
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={downloadAgent}
                      >
                        데스크톱 에이전트 다운로드
                      </Button>
                    ) : (
                      // 에이전트가 설치된 경우 세션 시작 버튼
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={startSessionMutation.isPending}
                        onClick={() => startSessionMutation.mutate()}
                      >
                        세션 시작
                      </Button>
                    )}
                    
                    {/* 에이전트 관리 버튼들 */}
                    {agentStatus.isRunning && (
                      <Button
                        type="default"
                        danger
                        onClick={shutdownAgent}
                      >
                        에이전트 종료
                      </Button>
                    )}
                    
                    {/* 개발모드에서만 보이는 테스트 버튼 */}
                    {import.meta.env.DEV && currentSession?.status === 'ACTIVE' && (
                      <Button
                        type="dashed"
                        icon={<DesktopOutlined />}
                        onClick={captureTestScreenshot}
                      >
                        테스트 스크린샷
                      </Button>
                    )}
                  </Space>
                )}
              </Space>
            }
          >
            {currentSessionLoading ? (
              <Spin />
            ) : currentSession ? (
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title="오늘 활동 시간"
                    value={formatDuration(currentSession.total_active_time || 0)}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="현재 생산성"
                    value={currentSession.productivity_score || 0}
                    suffix="%"
                    prefix={<TrophyOutlined />}
                    valueStyle={{ 
                      color: getProductivityColor(currentSession.productivity_score || 0) 
                    }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="세션 시작 시간"
                    value={currentSession.login_time 
                      ? dayjs(currentSession.login_time).format('HH:mm:ss')
                      : '-'
                    }
                    prefix={<PlayCircleOutlined />}
                  />
                </Col>
              </Row>
            ) : (
              <Alert
                message="활성 세션이 없습니다"
                description="근무를 시작하려면 '세션 시작' 버튼을 클릭하세요."
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 세션 수"
              value={totalSessions}
              prefix={<BarChartOutlined />}
              loading={userSessionsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="총 활동 시간"
              value={formatDuration(totalActiveTime)}
              prefix={<ClockCircleOutlined />}
              loading={userSessionsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="평균 생산성"
              value={averageProductivity}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: getProductivityColor(averageProductivity) }}
              loading={userSessionsLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="평균 세션 시간"
              value={formatDuration(averageSessionTime)}
              prefix={<AimOutlined />}
              loading={userSessionsLoading}
            />
          </Card>
        </Col>
      </Row>

      <Tabs 
        defaultActiveKey="overview" 
        type="card"
        items={[
          {
            key: 'overview',
            label: '개요',
            children: (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="최근 7일 생산성 트렌드">
                {chartData.length > 0 ? (
                  <Line
                    data={chartData}
                    xField="date"
                    yField="productivity"
                    point={{
                      size: 5,
                      shape: 'diamond',
                    }}
                    color="#1890ff"
                    height={300}
                    meta={{
                      productivity: {
                        alias: '생산성 점수 (%)',
                        min: 0,
                        max: 100,
                      },
                    }}
                  />
                ) : (
                  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text type="secondary">데이터가 없습니다</Text>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="생산성 목표 달성률">
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Progress
                    type="circle"
                    percent={averageProductivity}
                    size={180}
                    strokeColor={getProductivityColor(averageProductivity)}
                    format={() => (
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                          {averageProductivity}%
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {getProductivityLabel(averageProductivity)}
                        </div>
                      </div>
                    )}
                  />
                  <div style={{ marginTop: '20px' }}>
                    <Text>목표: 80% 이상</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
            )
          },
          {
            key: 'sessions',
            label: '세션 기록',
            children: (
          <Card>
            <Table
              dataSource={userSessions}
              columns={sessionColumns}
              rowKey="id"
              loading={userSessionsLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `총 ${total}개 세션`,
              }}
            />
          </Card>
            )
          },
          {
            key: 'insights',
            label: 'AI 인사이트',
            children: <ProductivityInsights />
          },
          {
            key: 'suggestions',
            label: '개선 제안',
            children: (
          <Card title="생산성 향상을 위한 제안">
            <List
              dataSource={[
                {
                  icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
                  title: '휴식 시간 관리',
                  description: '50분 집중 - 10분 휴식 패턴을 활용해보세요.',
                },
                {
                  icon: <AimOutlined style={{ color: '#52c41a' }} />,
                  title: '목표 설정',
                  description: '일일 생산성 목표를 80% 이상으로 설정하고 달성해보세요.',
                },
                {
                  icon: <DesktopOutlined style={{ color: '#faad14' }} />,
                  title: '앱 사용 최적화',
                  description: '업무에 집중할 수 있는 앱들을 주로 사용하세요.',
                },
                {
                  icon: <CalendarOutlined style={{ color: '#722ed1' }} />,
                  title: '일정 관리',
                  description: '정기적인 근무 패턴을 유지하여 생산성을 높이세요.',
                },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={item.icon} />}
                    title={item.title}
                    description={item.description}
                  />
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

export default PersonalAttitudeDashboard;