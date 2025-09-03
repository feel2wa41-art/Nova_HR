import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Alert,
  Typography,
  Steps,
  Modal,
  Progress,
  Space,
  Badge,
  Descriptions,
  message,
  Spin,
} from 'antd';
import {
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  DesktopOutlined,
  AppleOutlined,
  WindowsOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { attitudeApi } from '../../lib/api';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface AgentStatus {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
  lastHeartbeat?: string;
  osType: 'windows' | 'macos' | 'linux' | 'unknown';
}

interface DownloadInfo {
  currentVersion: string;
  downloads: {
    windows: { url: string; filename: string; size: string };
    macos: { url: string; filename: string; size: string };
    linux: { url: string; filename: string; size: string };
  };
}

const AgentManagement: React.FC = () => {
  const { user } = useAuth();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    isInstalled: false,
    isRunning: false,
    osType: 'unknown'
  });
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    detectOS();
    checkAgentStatus();
    loadDownloadInfo();
    
    // 주기적으로 에이전트 상태 확인
    const interval = setInterval(checkAgentStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // 에이전트가 설치되고 실행 중일 때 자동으로 세션 시작 제안
  useEffect(() => {
    if (agentStatus.isInstalled && agentStatus.isRunning) {
      const hasAutoStartPrompted = localStorage.getItem('nova-hr-auto-start-prompted');
      
      if (!hasAutoStartPrompted) {
        Modal.confirm({
          title: '모니터링 시작',
          content: '데스크톱 에이전트가 준비되었습니다. 지금 모니터링을 시작하시겠습니까?',
          okText: '시작',
          cancelText: '나중에',
          onOk: async () => {
            try {
              await attitudeApi.startSession({});
              message.success('모니터링이 시작되었습니다.');
              localStorage.setItem('nova-hr-auto-start-prompted', 'true');
            } catch (error) {
              message.error('모니터링 시작에 실패했습니다.');
            }
          },
          onCancel: () => {
            localStorage.setItem('nova-hr-auto-start-prompted', 'true');
          }
        });
      }
    }
  }, [agentStatus.isInstalled, agentStatus.isRunning]);

  const loadDownloadInfo = async () => {
    try {
      const info = await attitudeApi.getAgentDownloadInfo();
      setDownloadInfo(info);
    } catch (error) {
      console.error('Failed to load download info:', error);
    }
  };

  const detectOS = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    let osType: AgentStatus['osType'] = 'unknown';
    
    if (userAgent.includes('win')) {
      osType = 'windows';
    } else if (userAgent.includes('mac')) {
      osType = 'macos';
    } else if (userAgent.includes('linux')) {
      osType = 'linux';
    }
    
    setAgentStatus(prev => ({ ...prev, osType }));
  };

  const checkAgentStatus = async () => {
    try {
      // 서버에서 에이전트 상태 확인
      const agentStatusResponse = await attitudeApi.getAgentStatus();
      
      // 하트비트 기반으로 실행 상태 정확히 판단
      const now = new Date();
      const lastHeartbeat = agentStatusResponse.lastHeartbeat ? new Date(agentStatusResponse.lastHeartbeat) : null;
      const heartbeatThreshold = 2 * 60 * 1000; // 2분
      
      const isRunning = lastHeartbeat && (now.getTime() - lastHeartbeat.getTime()) < heartbeatThreshold;
      
      setAgentStatus(prev => ({
        ...prev,
        isInstalled: agentStatusResponse.isInstalled || agentStatusResponse.hasHeartbeat,
        isRunning: Boolean(isRunning),
        lastHeartbeat: agentStatusResponse.lastHeartbeat,
        version: agentStatusResponse.version
      }));

      // 설치/실행 기록 저장
      if (agentStatusResponse.isInstalled || isRunning) {
        localStorage.setItem('nova-hr-agent-installed', 'true');
      }
      
      // 실행 상태 업데이트
      if (isRunning) {
        localStorage.setItem('nova-hr-agent-last-seen', now.toISOString());
      }
      
    } catch (error) {
      console.error('Failed to check agent status:', error);
      
      // 에러가 발생한 경우 로컬 기록으로 추정
      const hasInstallHistory = localStorage.getItem('nova-hr-agent-installed') === 'true';
      const lastSeen = localStorage.getItem('nova-hr-agent-last-seen');
      const lastSeenTime = lastSeen ? new Date(lastSeen) : null;
      const now = new Date();
      
      // 마지막으로 확인된 시간이 5분 이내면 실행 중일 가능성 있음
      const isLikelyRunning = lastSeenTime && (now.getTime() - lastSeenTime.getTime()) < 5 * 60 * 1000;
      
      setAgentStatus(prev => ({
        ...prev,
        isInstalled: hasInstallHistory,
        isRunning: Boolean(isLikelyRunning),
        lastHeartbeat: lastSeen
      }));
    }
  };

  const getDownloadUrl = () => {
    if (!downloadInfo) {
      // 다운로드 정보가 아직 로드되지 않은 경우 기본값 사용
      const baseUrl = window.location.origin;
      const version = '1.0.12';
      switch (agentStatus.osType) {
        case 'windows':
          return `${baseUrl}/downloads/Nova HR Agent Setup ${version}.exe`;
        case 'macos':
          return `${baseUrl}/downloads/Nova HR Agent-${version}.dmg`;
        case 'linux':
          return `${baseUrl}/downloads/Nova HR Agent-${version}.AppImage`;
        default:
          return `${baseUrl}/downloads/`;
      }
    }

    // API에서 가져온 다운로드 정보 사용
    switch (agentStatus.osType) {
      case 'windows':
        return downloadInfo.downloads.windows.url;
      case 'macos':
        return downloadInfo.downloads.macos.url;
      case 'linux':
        return downloadInfo.downloads.linux.url;
      default:
        return window.location.origin + '/downloads/';
    }
  };

  const getOSIcon = () => {
    switch (agentStatus.osType) {
      case 'windows':
        return <WindowsOutlined style={{ fontSize: 24, color: '#0078d4' }} />;
      case 'macos':
        return <AppleOutlined style={{ fontSize: 24, color: '#000' }} />;
      default:
        return <DesktopOutlined style={{ fontSize: 24, color: '#666' }} />;
    }
  };

  const getOSName = () => {
    switch (agentStatus.osType) {
      case 'windows':
        return 'Windows';
      case 'macos':
        return 'macOS';
      case 'linux':
        return 'Linux';
      default:
        return '알 수 없음';
    }
  };

  const handleDownload = () => {
    const url = getDownloadUrl();
    
    // OS별 안내 메시지 표시
    const osInstruction = getOSInstruction();
    
    // 다운로드 시작
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDownloadModalVisible(true);
    setCurrentStep(1);
    
    message.success(`다운로드가 시작되었습니다. ${osInstruction}`);
  };

  const getOSInstruction = () => {
    switch (agentStatus.osType) {
      case 'windows':
        return 'exe 파일을 실행하여 설치를 진행하세요.';
      case 'macos':
        return 'dmg 파일을 열어 애플리케이션 폴더로 드래그하세요.';
      case 'linux':
        return 'AppImage 파일에 실행 권한을 부여한 후 실행하세요.';
      default:
        return '다운로드한 파일을 실행하여 설치를 진행하세요.';
    }
  };

  const handleStartMonitoring = async () => {
    if (!agentStatus.isInstalled) {
      Modal.confirm({
        title: '데스크톱 에이전트가 설치되지 않았습니다',
        content: '모니터링을 시작하려면 먼저 데스크톱 에이전트를 설치해야 합니다. 지금 설치하시겠습니까?',
        okText: '설치하기',
        cancelText: '취소',
        onOk: () => handleDownload(),
      });
      return;
    }

    // 에이전트가 설치되어 있지만 실행되지 않는 경우
    if (!agentStatus.isRunning) {
      Modal.confirm({
        title: '데스크톱 에이전트가 실행되지 않았습니다',
        content: '모니터링을 시작하려면 데스크톱 에이전트가 실행되어야 합니다. 시스템 트레이에서 Nova HR 에이전트를 실행하거나, 설치된 프로그램에서 실행해주세요.',
        okText: '확인',
        cancelText: '취소',
      });
      return;
    }

    setLoading(true);
    try {
      await attitudeApi.startSession({});
      await checkAgentStatus();
      message.success('모니터링이 시작되었습니다.');
    } catch (error) {
      message.error('모니터링 시작에 실패했습니다. 데스크톱 에이전트를 확인해주세요.');
    }
    setLoading(false);
  };

  const handleStopMonitoring = async () => {
    setLoading(true);
    try {
      await attitudeApi.endSession();
      await checkAgentStatus();
      message.success('모니터링이 중지되었습니다.');
    } catch (error) {
      message.error('모니터링 중지에 실패했습니다.');
    }
    setLoading(false);
  };

  const installationSteps = [
    {
      title: '다운로드',
      description: '설치 파일을 다운로드합니다.',
    },
    {
      title: '설치 실행',
      description: '다운로드한 파일을 실행하여 설치합니다.',
    },
    {
      title: '에이전트 시작',
      description: '설치 완료 후 에이전트가 자동으로 시작됩니다.',
    },
    {
      title: '로그인',
      description: '에이전트에서 회사 계정으로 로그인합니다.',
    },
  ];

  return (
    <div className="p-6">
      <Title level={2}>데스크톱 에이전트 관리</Title>
      <Paragraph>
        근무 태도 모니터링을 위한 데스크톱 에이전트를 설치하고 관리합니다.
      </Paragraph>

      {/* 에이전트 상태 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="에이전트 상태" extra={
            <Button 
              icon={<SyncOutlined />} 
              onClick={checkAgentStatus}
              loading={loading}
              size="small"
            >
              새로고침
            </Button>
          }>
            <Descriptions column={1}>
              <Descriptions.Item label="운영체제">
                <Space>
                  {getOSIcon()}
                  {getOSName()}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="설치 상태">
                <Badge 
                  status={agentStatus.isInstalled ? 'success' : 'error'} 
                  text={agentStatus.isInstalled ? '설치됨' : '설치 안됨'} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="실행 상태">
                <Badge 
                  status={agentStatus.isRunning ? 'processing' : 'default'} 
                  text={agentStatus.isRunning ? '실행 중' : '중지됨'} 
                />
              </Descriptions.Item>
              {agentStatus.lastHeartbeat && (
                <Descriptions.Item label="마지막 활동">
                  {new Date(agentStatus.lastHeartbeat).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="빠른 실행" className="h-full">
            <Space direction="vertical" className="w-full">
              {!agentStatus.isInstalled ? (
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  size="large"
                  block
                >
                  데스크톱 에이전트 다운로드
                </Button>
              ) : !agentStatus.isRunning ? (
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartMonitoring}
                  loading={loading}
                  size="large"
                  block
                >
                  모니터링 시작
                </Button>
              ) : (
                <Button 
                  danger
                  icon={<PauseCircleOutlined />}
                  onClick={handleStopMonitoring}
                  loading={loading}
                  size="large"
                  block
                >
                  모니터링 중지
                </Button>
              )}
              
              <Text type="secondary" className="text-center block">
                {!agentStatus.isInstalled 
                  ? '먼저 데스크톱 에이전트를 설치해주세요.'
                  : agentStatus.isRunning 
                    ? '모니터링이 활성화되어 있습니다.'
                    : '모니터링을 시작할 수 있습니다.'
                }
              </Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 설치 안내 */}
      {!agentStatus.isInstalled && (
        <Card title="설치 안내" className="mb-6">
          <Alert
            message="데스크톱 에이전트 설치 필요"
            description="근무 태도 모니터링을 위해서는 데스크톱 에이전트를 설치해야 합니다."
            type="info"
            showIcon
            className="mb-4"
          />
          
          <Steps current={currentStep} className="mb-4">
            {installationSteps.map((step, index) => (
              <Step 
                key={index}
                title={step.title} 
                description={step.description}
                icon={index < currentStep ? <CheckCircleOutlined /> : undefined}
              />
            ))}
          </Steps>
        </Card>
      )}

      {/* 에이전트 미실행 경고 */}
      {agentStatus.isInstalled && !agentStatus.isRunning && (
        <Alert
          message="데스크톱 에이전트가 실행되지 않고 있습니다"
          description="모니터링을 위해 데스크톱 에이전트를 시작해주세요. 시스템 트레이에서 Nova HR 아이콘을 찾아 실행하거나, 위의 '모니터링 시작' 버튼을 클릭하세요."
          type="warning"
          showIcon
          className="mb-6"
        />
      )}

      {/* 다운로드 진행 모달 */}
      <Modal
        title="설치 안내"
        open={downloadModalVisible}
        onCancel={() => setDownloadModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDownloadModalVisible(false)}>
            닫기
          </Button>,
          <Button key="check" type="primary" onClick={checkAgentStatus}>
            설치 완료 확인
          </Button>
        ]}
      >
        <Steps current={currentStep} direction="vertical" size="small">
          {installationSteps.map((step, index) => (
            <Step 
              key={index}
              title={step.title} 
              description={step.description}
              status={
                index < currentStep ? 'finish' : 
                index === currentStep ? 'process' : 'wait'
              }
            />
          ))}
        </Steps>
        
        <Alert
          message="설치 후 할 일"
          description={
            <div>
              <p>1. 다운로드한 설치 파일을 실행하세요.</p>
              <p>2. 설치 완료 후 시스템 트레이에서 Nova HR 아이콘을 확인하세요.</p>
              <p>3. 에이전트에서 회사 계정으로 로그인하세요:</p>
              <p>   - 이메일: {user?.email}</p>
              <p>   - 비밀번호: [귀하의 로그인 비밀번호]</p>
            </div>
          }
          type="info"
          className="mt-4"
        />
      </Modal>
    </div>
  );
};

export default AgentManagement;