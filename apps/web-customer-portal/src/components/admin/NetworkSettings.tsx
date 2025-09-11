import { useState, useEffect } from 'react';
import { 
  Form, 
  Switch, 
  Button, 
  Card, 
  message, 
  Typography, 
  Table,
  Space,
  Input,
  Modal,
  Tag,
  Tooltip
} from 'antd';
import { 
  WifiOutlined, 
  SaveOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  GlobalOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface NetworkRule {
  id: string;
  type: 'WIFI' | 'IP';
  value: string;
  description?: string;
  isActive: boolean;
}

interface NetworkSettingsData {
  enableWifiRestriction: boolean;
  enableIpRestriction: boolean;
  allowMobileData: boolean;
  strictNetworkCheck: boolean;
}

const mockNetworkRules: NetworkRule[] = [
  {
    id: '1',
    type: 'WIFI',
    value: 'Nova-HR-Office',
    description: 'Main office WiFi',
    isActive: true,
  },
  {
    id: '2',
    type: 'WIFI', 
    value: 'Nova-HR-Guest',
    description: 'Guest WiFi network',
    isActive: true,
  },
  {
    id: '3',
    type: 'IP',
    value: '192.168.1.0/24',
    description: 'Office network range',
    isActive: true,
  },
];

export const NetworkSettings = () => {
  const [form] = Form.useForm<NetworkSettingsData>();
  const [networkRules, setNetworkRules] = useState<NetworkRule[]>(mockNetworkRules);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRuleForm] = Form.useForm();
  const [currentNetworkInfo, setCurrentNetworkInfo] = useState<any>(null);

  useEffect(() => {
    // Initialize with default settings
    form.setFieldsValue({
      enableWifiRestriction: false,
      enableIpRestriction: false,
      allowMobileData: true,
      strictNetworkCheck: false,
    });

    // Get current network information
    getCurrentNetworkInfo();
  }, [form]);

  const getCurrentNetworkInfo = async () => {
    try {
      // In a real application, you would get this from the browser's network APIs
      // For demo purposes, we'll simulate this
      const mockNetworkInfo = {
        connection: navigator.onLine ? 'Connected' : 'Disconnected',
        type: 'wifi', // Could be wifi, cellular, ethernet, etc.
        downlink: '10 Mbps',
        effectiveType: '4g',
      };
      setCurrentNetworkInfo(mockNetworkInfo);
    } catch (error) {
      console.error('Failed to get network info:', error);
    }
  };

  const handleSubmit = async (values: NetworkSettingsData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Updated network settings:', values);
      console.log('Network rules:', networkRules);
      message.success('네트워크 설정이 성공적으로 업데이트되었습니다');
    } catch (error) {
      message.error('네트워크 설정 업데이트에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRule = (values: any) => {
    const newRule: NetworkRule = {
      id: Date.now().toString(),
      type: values.type,
      value: values.value,
      description: values.description,
      isActive: true,
    };
    
    setNetworkRules(prev => [...prev, newRule]);
    setIsModalOpen(false);
    newRuleForm.resetFields();
    message.success('네트워크 규칙이 추가되었습니다');
  };

  const handleDeleteRule = (ruleId: string) => {
    Modal.confirm({
      title: '규칙 삭제',
      content: '이 네트워크 규칙을 삭제하시겠습니까?',
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => {
        setNetworkRules(prev => prev.filter(rule => rule.id !== ruleId));
        message.success('네트워크 규칙이 삭제되었습니다');
      },
    });
  };

  const handleToggleRule = (ruleId: string) => {
    setNetworkRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const getNetworkTypeIcon = (type: string) => {
    return type === 'WIFI' ? <WifiOutlined /> : <GlobalOutlined />;
  };

  const getNetworkTypeTag = (type: string) => {
    return (
      <Tag color={type === 'WIFI' ? 'blue' : 'green'}>
        {type === 'WIFI' ? 'WiFi' : 'IP 주소'}
      </Tag>
    );
  };

  const columns: ColumnsType<NetworkRule> = [
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => getNetworkTypeTag(type),
    },
    {
      title: '값',
      dataIndex: 'value',
      key: 'value',
      render: (value: string, record) => (
        <div className="flex items-center gap-2">
          {getNetworkTypeIcon(record.type)}
          <span className="font-mono">{value}</span>
        </div>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      render: (description?: string) => description || '-',
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleRule(record.id)}
          size="small"
        />
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Tooltip title="삭제">
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDeleteRule(record.id)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Text strong className="text-lg">네트워크 접근 제한 설정</Text>
        <div className="text-gray-500 text-sm mt-1">
          특정 WiFi 네트워크나 IP 주소에서만 출석 체크를 허용할 수 있습니다
        </div>
      </div>

      {/* Current Network Info */}
      {currentNetworkInfo && (
        <Card size="small" className="bg-blue-50">
          <div className="flex items-start gap-3">
            <InfoCircleOutlined className="text-blue-600 mt-1" />
            <div>
              <Text strong className="text-blue-800">현재 네트워크 정보</Text>
              <div className="text-blue-700 text-sm mt-1 space-y-1">
                <div>상태: {currentNetworkInfo.connection}</div>
                <div>유형: {currentNetworkInfo.type}</div>
                <div>속도: {currentNetworkInfo.downlink}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {/* Network Restriction Settings */}
        <Card title="네트워크 제한 설정" size="small" className="mb-4">
          <Form.Item
            name="enableWifiRestriction"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>WiFi 네트워크 제한</Text>
                <div className="text-gray-500 text-sm">
                  지정된 WiFi 네트워크에서만 출석 체크를 허용합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            name="enableIpRestriction"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>IP 주소 제한</Text>
                <div className="text-gray-500 text-sm">
                  지정된 IP 주소 범위에서만 출석 체크를 허용합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            name="allowMobileData"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>모바일 데이터 허용</Text>
                <div className="text-gray-500 text-sm">
                  모바일 데이터를 사용한 출석 체크를 허용합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            name="strictNetworkCheck"
            valuePropName="checked"
            className="mb-0"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>엄격한 네트워크 확인</Text>
                <div className="text-gray-500 text-sm">
                  네트워크 조건을 만족하지 않으면 출석 체크를 차단합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>
        </Card>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={isLoading}
            icon={<SaveOutlined />}
          >
            설정 저장
          </Button>
        </Form.Item>
      </Form>

      {/* Network Rules */}
      <Card 
        title="허용된 네트워크 목록"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            규칙 추가
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={networkRules}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* Add Rule Modal */}
      <Modal
        title="새 네트워크 규칙 추가"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          newRuleForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={newRuleForm}
          layout="vertical"
          onFinish={handleAddRule}
          autoComplete="off"
        >
          <Form.Item
            label="규칙 유형"
            name="type"
            rules={[
              { required: true, message: '규칙 유형을 선택해주세요' },
            ]}
          >
            <Space.Compact size="large" style={{ width: '100%' }}>
              <Button 
                style={{ width: '50%' }}
                onClick={() => newRuleForm.setFieldValue('type', 'WIFI')}
              >
                <WifiOutlined /> WiFi
              </Button>
              <Button 
                style={{ width: '50%' }}
                onClick={() => newRuleForm.setFieldValue('type', 'IP')}
              >
                <GlobalOutlined /> IP 주소
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            label="값"
            name="value"
            rules={[
              { required: true, message: '값을 입력해주세요' },
            ]}
          >
            <Input
              size="large"
              placeholder="WiFi명 또는 IP 주소 (예: 192.168.1.0/24)"
            />
          </Form.Item>

          <Form.Item
            label="설명 (선택사항)"
            name="description"
          >
            <Input
              size="large"
              placeholder="이 규칙에 대한 설명을 입력하세요"
            />
          </Form.Item>

          <div className="bg-yellow-50 p-3 rounded-lg mb-4">
            <Text className="text-yellow-800 text-sm">
              <strong>팁:</strong> IP 주소는 CIDR 표기법을 사용할 수 있습니다 (예: 192.168.1.0/24)
            </Text>
          </div>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalOpen(false)}>
                취소
              </Button>
              <Button type="primary" htmlType="submit">
                추가
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};