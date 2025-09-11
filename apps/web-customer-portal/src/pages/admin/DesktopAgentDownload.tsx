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
          downloadUrl = '/downloads/Reko HR Desktop Agent-1.0.0-win-x64.exe';
          fileName = 'Reko HR Desktop Agent-1.0.0-win-x64.exe';
          break;
        case 'macos':
          downloadUrl = '/downloads/reko-hr-agent.dmg';
          fileName = 'reko-hr-agent.dmg';
          break;
        case 'linux':
          downloadUrl = '/downloads/reko-hr-agent.AppImage';
          fileName = 'reko-hr-agent.AppImage';
          break;
      }

      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success(`${fileName} download has started!`);
    } catch (error) {
      message.error('Download failed. Please contact the IT support team.');
    } finally {
      setDownloading(false);
    }
  };

  const systemRequirements = [
    { os: 'Windows', version: '10 or later (64-bit)', icon: <WindowsOutlined /> },
    { os: 'macOS', version: '10.15+ (Catalina)', icon: <AppleOutlined /> },
    { os: 'Linux', version: 'Ubuntu 18.04+', icon: '🐧' },
  ];

  const installSteps = [
    {
      title: 'Download Agent',
      description: 'Download the installer for your operating system.',
      icon: <DownloadOutlined />,
    },
    {
      title: 'Install with Administrator Rights',
      description: 'Right-click the installer and select "Run as administrator".',
      icon: <SecurityScanOutlined />,
    },
    {
      title: 'Web Portal Login',
      description: 'Log in with your company account at http://localhost:3001.',
      icon: <CheckCircleOutlined />,
    },
    {
      title: 'Start Monitoring',
      description: 'Click "Start Monitoring" in the Attitude Management menu.',
      icon: <MonitorOutlined />,
    },
  ];

  const features = [
    {
      title: 'Automatic Background Monitoring',
      description: 'Automatically monitors activity during work hours.',
      icon: <MonitorOutlined style={{ color: '#1890ff' }} />,
    },
    {
      title: 'Secure Data Transmission',
      description: 'All data is encrypted and transmitted securely.',
      icon: <SafetyOutlined style={{ color: '#52c41a' }} />,
    },
    {
      title: 'System Tray Control',
      description: 'Control monitoring anytime from the system tray.',
      icon: <SettingOutlined style={{ color: '#722ed1' }} />,
    },
  ];

  const faqData = [
    {
      question: 'Do I need to install this on my personal PC?',
      answer: 'Only if you work from home do you need to install it on your personal PC.',
    },
    {
      question: 'Will it monitor me after work hours?',
      answer: 'No, monitoring is only active during work hours.',
    },
    {
      question: 'Are personal files transmitted?',
      answer: 'No, only screen captures and application names are collected. Personal file contents are not transmitted.',
    },
    {
      question: 'I want to remove the agent.',
      answer: 'You can remove it from Control Panel > Add or Remove Programs by finding "Reko HR Agent".',
    },
    {
      question: 'My antivirus is blocking it.',
      answer: 'Please add Reko HR Agent to your antivirus program\'s exception list.',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <Title level={1} style={{ marginBottom: '8px' }}>
          🖥️ Reko HR Desktop Agent
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          Desktop monitoring software for work attitude management
        </Text>
      </div>

      {/* Important Notice */}
      <Alert
        message="Essential Information Before Installation"
        description={
          <div>
            <p>• Administrator rights are required</p>
            <p>• May be blocked by antivirus software - please add to exceptions</p>
            <p>• After installation, please log in through the web portal for connection</p>
          </div>
        }
        type="warning"
        showIcon
        style={{ marginBottom: '32px' }}
      />

      <Row gutter={[24, 24]}>
        {/* Download Section */}
        <Col xs={24} lg={12}>
          <Card title="📥 Download" style={{ height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={4}>Select Your Operating System</Title>
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
                      Download ({req.os === 'Windows' ? '75MB' : '15.5MB'})
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
                View Detailed Installation Guide
              </Button>
            </div>
          </Card>
        </Col>

        {/* Installation Steps */}
        <Col xs={24} lg={12}>
          <Card title="🚀 Installation Steps" style={{ height: '100%' }}>
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

      {/* Key Features */}
      <Card title="✨ Key Features" style={{ marginTop: '24px' }}>
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

      {/* System Requirements */}
      <Card title="💾 System Requirements" style={{ marginTop: '24px' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <List
              header={<Text strong>Hardware</Text>}
              size="small"
              dataSource={[
                'RAM: Minimum 4GB recommended',
                'Disk space: 100MB or more',
                'Internet connection required',
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
              header={<Text strong>Permissions</Text>}
              size="small"
              dataSource={[
                'Administrator rights (for installation)',
                'Screen capture permission',
                'Network access permission',
                'Startup program registration permission',
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
      <Card title="❓ Frequently Asked Questions" style={{ marginTop: '24px' }}>
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

      {/* Support Contact */}
      <Card
        title="📞 Support & Contact"
        style={{ marginTop: '24px', textAlign: 'center' }}
      >
        <Space direction="vertical" size="middle">
          <div>
            <CustomerServiceOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          </div>
          <div>
            <Title level={4}>IT Support Team</Title>
            <Space direction="vertical">
              <Text>📧 Email: it-support@reko-hr.com</Text>
              <Text>📞 Extension: 1234</Text>
              <Text>🕒 Support hours: Weekdays 09:00-18:00</Text>
            </Space>
          </div>
        </Space>
      </Card>

      {/* Installation Guide Modal */}
      <Modal
        title="📖 Detailed Installation Guide"
        open={showInstallGuide}
        onCancel={() => setShowInstallGuide(false)}
        footer={[
          <Button key="close" onClick={() => setShowInstallGuide(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Collapse defaultActiveKey={['1', '2']}>
            <Panel header="🔧 Installation Method" key="1">
              <Steps
                direction="vertical"
                size="small"
                items={[
                  {
                    title: 'Windows Installation',
                    description: (
                      <div>
                        <p>1. Right-click the Reko HR Desktop Agent installer file</p>
                        <p>2. Select "Run as administrator"</p>
                        <p>3. Follow the installation wizard instructions</p>
                        <p>4. Background service starts automatically after installation</p>
                      </div>
                    ),
                  },
                  {
                    title: 'Web Portal Connection',
                    description: (
                      <div>
                        <p>1. Access http://localhost:3001 in your web browser</p>
                        <p>2. Log in with your company-provided account</p>
                        <p>3. Agent automatically connects upon login</p>
                      </div>
                    ),
                  },
                  {
                    title: 'Start Monitoring',
                    description: (
                      <div>
                        <p>1. Web Portal → "Attitude" → "Personal Dashboard" menu</p>
                        <p>2. Click "Start Monitoring" button</p>
                        <p>3. Check status in system tray</p>
                      </div>
                    ),
                  },
                ]}
              />
            </Panel>
            <Panel header="⚠️ Troubleshooting" key="2">
              <List
                dataSource={[
                  {
                    title: 'Installation fails',
                    content: 'Run as administrator again and temporarily disable antivirus software before trying.',
                  },
                  {
                    title: 'Blocked by antivirus',
                    content: 'Add Nova HR Agent to your antivirus program\'s exception list.',
                  },
                  {
                    title: 'Login not working',
                    content: 'Check internet connection and firewall settings, and verify the API server URL.',
                  },
                  {
                    title: 'Monitoring not starting',
                    content: 'Check agent status in system tray and verify all required permissions are granted.',
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