import React, { useState } from 'react';
import {
  Card,
  Button,
  Steps,
  Typography,
  Alert,
  Space,
  Divider,
  Row,
  Col,
  Tag,
  Collapse,
  List,
  Modal,
  message,
} from 'antd';
import {
  DownloadOutlined,
  WindowsOutlined,
  AppleOutlined,
  SecurityScanOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  MonitorOutlined,
  SafetyOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const DesktopAgentDownload: React.FC = () => {
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (platform: 'windows' | 'macos' | 'linux') => {
    setDownloading(true);
    try {
      let downloadUrl = '';
      let fileName = '';

      switch (platform) {
        case 'windows':
          downloadUrl = '/downloads/nova-hr-agent-setup.exe';
          fileName = 'nova-hr-agent-setup.exe';
          break;
        case 'macos':
          downloadUrl = '/downloads/nova-hr-agent.dmg';
          fileName = 'nova-hr-agent.dmg';
          break;
        case 'linux':
          downloadUrl = '/downloads/nova-hr-agent.AppImage';
          fileName = 'nova-hr-agent.AppImage';
          break;
      }

      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success(`${fileName} 다운로드가 시작되었습니다!`);
    } catch (error) {
      message.error('다운로드에 실패했습니다. IT 지원팀에 문의해주세요.');
    } finally {
      setDownloading(false);
    }
  };

  const systemRequirements = [
    { os: 'Windows', version: '10 이상 (64비트)', icon: <WindowsOutlined /> },
    { os: 'macOS', version: '10.15+ (Catalina)', icon: <AppleOutlined /> },
    { os: 'Linux', version: 'Ubuntu 18.04+', icon: '🐧' },
  ];

  const installSteps = [
    {
      title: '에이전트 다운로드',
      description: '운영체제에 맞는 설치 파일을 다운로드합니다.',
      icon: <DownloadOutlined />,
    },
    {
      title: '관리자 권한으로 설치',
      description: '설치 파일을 우클릭하여 "관리자 권한으로 실행"을 선택합니다.',
      icon: <SecurityScanOutlined />,
    },
    {
      title: '웹 포털 로그인',
      description: 'http://localhost:3001에서 회사 계정으로 로그인합니다.',
      icon: <CheckCircleOutlined />,
    },
    {
      title: '모니터링 시작',
      description: '태도 관리 메뉴에서 "모니터링 시작"을 클릭합니다.',
      icon: <MonitorOutlined />,
    },
  ];

  const features = [
    {
      title: '자동 백그라운드 모니터링',
      description: '업무 시간 중 자동으로 활동을 모니터링합니다.',
      icon: <MonitorOutlined style={{ color: '#1890ff' }} />,
    },
    {
      title: '보안 데이터 전송',
      description: '모든 데이터는 암호화되어 안전하게 전송됩니다.',
      icon: <SafetyOutlined style={{ color: '#52c41a' }} />,
    },
    {
      title: '시스템 트레이 제어',
      description: '시스템 트레이에서 언제든 모니터링을 제어할 수 있습니다.',
      icon: <SettingOutlined style={{ color: '#722ed1' }} />,
    },
  ];

  const faqData = [
    {
      question: '개인 PC에서도 설치해야 하나요?',
      answer: '재택근무를 하시는 경우에만 개인 PC에 설치하시면 됩니다.',
    },
    {
      question: '퇴근 후에도 모니터링 되나요?',
      answer: '아니요, 업무 시간에만 모니터링이 활성화됩니다.',
    },
    {
      question: '개인 파일이 전송되나요?',
      answer: '아니요, 화면 캡처와 애플리케이션 이름만 수집되며 개인 파일 내용은 전송되지 않습니다.',
    },
    {
      question: '에이전트를 제거하고 싶어요.',
      answer: '제어판 > 프로그램 추가/제거에서 "Nova HR Agent"를 찾아 제거하실 수 있습니다.',
    },
    {
      question: '백신 프로그램에서 차단됩니다.',
      answer: '백신 프로그램에서 Nova HR Agent를 예외 목록에 추가해주세요.',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <Title level={1} style={{ marginBottom: '8px' }}>
          🖥️ Nova HR 데스크톱 에이전트
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          업무 태도 관리를 위한 데스크톱 모니터링 소프트웨어
        </Text>
      </div>

      {/* 중요 안내 */}
      <Alert
        message="설치 전 필수 확인사항"
        description={
          <div>
            <p>• 관리자 권한이 필요합니다</p>
            <p>• 백신 프로그램에서 차단될 수 있으니 예외 설정을 해주세요</p>
            <p>• 설치 후 웹 포털에서 로그인하여 연동해주세요</p>
          </div>
        }
        type="warning"
        showIcon
        style={{ marginBottom: '32px' }}
      />

      <Row gutter={[24, 24]}>
        {/* 다운로드 섹션 */}
        <Col xs={24} lg={12}>
          <Card title="📥 다운로드" style={{ height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={4}>운영체제를 선택하세요</Title>
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {systemRequirements.map((req, index) => (
                <Card key={index} size="small" style={{ textAlign: 'center' }}>
                  <Space direction="vertical">
                    <div style={{ fontSize: '32px' }}>{req.icon}</div>
                    <Title level={5}>{req.os}</Title>
                    <Text type="secondary">{req.version}</Text>
                    <Button
                      type="primary"
                      size="large"
                      icon={<DownloadOutlined />}
                      loading={downloading}
                      onClick={() => handleDownload(req.os.toLowerCase() as any)}
                      style={{ width: '200px' }}
                    >
                      다운로드 ({req.os === 'Windows' ? '15.2MB' : '15.5MB'})
                    </Button>
                  </Space>
                </Card>
              ))}
            </Space>

            <Divider />
            
            <div style={{ textAlign: 'center' }}>
              <Button
                type="link"
                icon={<InfoCircleOutlined />}
                onClick={() => setShowInstallGuide(true)}
              >
                상세 설치 가이드 보기
              </Button>
            </div>
          </Card>
        </Col>

        {/* 설치 단계 */}
        <Col xs={24} lg={12}>
          <Card title="🚀 설치 단계" style={{ height: '100%' }}>
            <Steps
              direction="vertical"
              size="small"
              items={installSteps.map((step, index) => ({
                title: step.title,
                description: step.description,
                icon: step.icon,
              }))}
            />
          </Card>
        </Col>
      </Row>

      {/* 주요 기능 */}
      <Card title="✨ 주요 기능" style={{ marginTop: '24px' }}>
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} md={8} key={index}>
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>
                  {feature.icon}
                </div>
                <Title level={5}>{feature.title}</Title>
                <Text type="secondary">{feature.description}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 시스템 요구사항 */}
      <Card title="💾 시스템 요구사항" style={{ marginTop: '24px' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <List
              header={<Text strong>하드웨어</Text>}
              size="small"
              dataSource={[
                'RAM: 최소 4GB 이상 권장',
                '디스크 공간: 100MB 이상',
                '인터넷 연결 필수',
              ]}
              renderItem={(item) => (
                <List.Item>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  {item}
                </List.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <List
              header={<Text strong>권한</Text>}
              size="small"
              dataSource={[
                '관리자 권한 (설치 시)',
                '화면 캡처 권한',
                '네트워크 접근 권한',
                '시작 프로그램 등록 권한',
              ]}
              renderItem={(item) => (
                <List.Item>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  {item}
                </List.Item>
              )}
            />
          </Col>
        </Row>
      </Card>

      {/* FAQ */}
      <Card title="❓ 자주 묻는 질문" style={{ marginTop: '24px' }}>
        <Collapse ghost>
          {faqData.map((faq, index) => (
            <Panel 
              header={faq.question} 
              key={index}
              extra={<QuestionCircleOutlined />}
            >
              <Text>{faq.answer}</Text>
            </Panel>
          ))}
        </Collapse>
      </Card>

      {/* 지원 문의 */}
      <Card
        title="📞 지원 및 문의"
        style={{ marginTop: '24px', textAlign: 'center' }}
      >
        <Space direction="vertical" size="middle">
          <div>
            <CustomerServiceOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          </div>
          <div>
            <Title level={4}>IT 지원팀</Title>
            <Space direction="vertical">
              <Text>📧 이메일: it-support@nova-hr.com</Text>
              <Text>📞 내선: 1234</Text>
              <Text>🕒 지원 시간: 평일 09:00-18:00</Text>
            </Space>
          </div>
        </Space>
      </Card>

      {/* 설치 가이드 모달 */}
      <Modal
        title="📖 상세 설치 가이드"
        open={showInstallGuide}
        onCancel={() => setShowInstallGuide(false)}
        footer={[
          <Button key="close" onClick={() => setShowInstallGuide(false)}>
            닫기
          </Button>,
        ]}
        width={800}
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Collapse defaultActiveKey={['1', '2']}>
            <Panel header="🔧 설치 방법" key="1">
              <Steps
                direction="vertical"
                size="small"
                items={[
                  {
                    title: 'Windows 설치',
                    description: (
                      <div>
                        <p>1. nova-hr-agent-setup.exe 파일을 우클릭</p>
                        <p>2. "관리자 권한으로 실행" 선택</p>
                        <p>3. 설치 마법사의 지시를 따라 진행</p>
                        <p>4. 설치 완료 후 자동으로 백그라운드 서비스 시작</p>
                      </div>
                    ),
                  },
                  {
                    title: '웹 포털 연동',
                    description: (
                      <div>
                        <p>1. 웹 브라우저에서 http://localhost:3001 접속</p>
                        <p>2. 회사에서 제공받은 계정으로 로그인</p>
                        <p>3. 로그인 시 에이전트가 자동으로 연동됨</p>
                      </div>
                    ),
                  },
                  {
                    title: '모니터링 시작',
                    description: (
                      <div>
                        <p>1. 웹 포털 → "태도" → "개인 대시보드" 메뉴</p>
                        <p>2. "모니터링 시작" 버튼 클릭</p>
                        <p>3. 시스템 트레이에서 상태 확인</p>
                      </div>
                    ),
                  },
                ]}
              />
            </Panel>
            <Panel header="⚠️ 문제 해결" key="2">
              <List
                dataSource={[
                  {
                    title: '설치가 실패하는 경우',
                    content: '관리자 권한으로 재실행하고, 백신 프로그램을 임시 비활성화한 후 시도해보세요.',
                  },
                  {
                    title: '백신에서 차단되는 경우',
                    content: 'Nova HR Agent를 백신 프로그램의 예외 목록에 추가해주세요.',
                  },
                  {
                    title: '로그인이 안 되는 경우',
                    content: '인터넷 연결과 방화벽 설정을 확인하고, API 서버 URL을 점검해주세요.',
                  },
                  {
                    title: '모니터링이 시작되지 않는 경우',
                    content: '시스템 트레이에서 에이전트 상태를 확인하고, 필요한 권한이 모두 부여되었는지 확인해주세요.',
                  },
                ]}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Text strong>{item.title}</Text>}
                      description={item.content}
                    />
                  </List.Item>
                )}
              />
            </Panel>
          </Collapse>
        </div>
      </Modal>
    </div>
  );
};

export default DesktopAgentDownload;