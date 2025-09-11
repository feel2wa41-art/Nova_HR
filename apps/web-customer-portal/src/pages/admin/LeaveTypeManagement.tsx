import { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Switch, 
  InputNumber, 
  Typography, 
  Space, 
  App,
  Popconfirm,
  ColorPicker,
  Tag,
  Select,
  Alert,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CalendarOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useLeave } from '../../hooks/useLeave';
import { apiClient } from '../../lib/api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 일반적인 휴가 종류 템플릿
const LEAVE_TEMPLATES = [
  {
    name: '연차',
    code: 'ANNUAL',
    colorHex: '#3b82f6',
    maxDaysYear: 15,
    isPaid: true,
    requiresApproval: true,
    description: '근로기준법에 따른 연차휴가'
  },
  {
    name: '병가',
    code: 'SICK',
    colorHex: '#ef4444',
    maxDaysYear: 30,
    isPaid: true,
    requiresApproval: false,
    description: '질병으로 인한 휴가'
  },
  {
    name: '경조사휴가',
    code: 'FAMILY_EVENT',
    colorHex: '#8b5cf6',
    maxDaysYear: 5,
    isPaid: true,
    requiresApproval: true,
    description: '경조사 관련 휴가'
  },
  {
    name: '출산휴가',
    code: 'MATERNITY',
    colorHex: '#f59e0b',
    maxDaysYear: 90,
    isPaid: true,
    requiresApproval: true,
    description: '모성보호를 위한 출산휴가'
  },
  {
    name: '육아휴직',
    code: 'CHILDCARE',
    colorHex: '#10b981',
    maxDaysYear: 365,
    isPaid: false,
    requiresApproval: true,
    description: '육아를 위한 장기휴직'
  },
  {
    name: '개인사유휴가',
    code: 'PERSONAL',
    colorHex: '#6b7280',
    maxDaysYear: 5,
    isPaid: false,
    requiresApproval: true,
    description: '개인적인 사유로 인한 휴가'
  }
];

// 휴가 종류명에서 코드 자동 생성 함수
const generateCodeFromName = (name: string): string => {
  // 한글을 영어로 매핑
  const koreanToEnglish: { [key: string]: string } = {
    '연차': 'ANNUAL',
    '병가': 'SICK',
    '경조사': 'FAMILY_EVENT',
    '경조사휴가': 'FAMILY_EVENT',
    '출산휴가': 'MATERNITY',
    '출산': 'MATERNITY',
    '육아휴직': 'CHILDCARE',
    '육아': 'CHILDCARE',
    '개인사유': 'PERSONAL',
    '개인': 'PERSONAL',
    '특별휴가': 'SPECIAL',
    '보상휴가': 'COMPENSATORY',
    '공가': 'OFFICIAL',
    '교육휴가': 'EDUCATION',
    '연수': 'TRAINING'
  };

  // 직접 매핑되는 경우
  if (koreanToEnglish[name]) {
    return koreanToEnglish[name];
  }

  // 일반적인 변환: 한글 제거하고 영어/숫자만 남기기, 공백을 언더스코어로
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '') // 영어, 숫자, 공백만 남기기
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_') // 공백을 언더스코어로
    || 'CUSTOM_LEAVE'; // 빈 문자열이면 기본값
};

interface LeaveType {
  id: string;
  name: string;
  code: string;
  colorHex: string;
  maxDaysYear: number | null;
  isPaid: boolean;
  requiresApproval: boolean;
  description?: string;
}

interface LeaveTypeFormData {
  name: string;
  code: string;
  colorHex: string;
  maxDaysYear?: number;
  isPaid: boolean;
  requiresApproval: boolean;
  description?: string;
}

export const LeaveTypeManagement = () => {
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveType | null>(null);
  const [form] = Form.useForm<LeaveTypeFormData>();
  const [loading, setLoading] = useState(false);
  const [useTemplate, setUseTemplate] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { leaveTypes, fetchLeaveTypes } = useLeave();

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      isPaid: true,
      requiresApproval: true,
      colorHex: '#3b82f6',
      maxDaysYear: 15 // 기본값 설정
    });
    setIsModalOpen(true);
  };

  // 예시 휴가 종류 선택 핸들러
  const handleExampleSelect = (example: typeof LEAVE_TEMPLATES[0]) => {
    form.setFieldsValue({
      name: example.name,
      code: example.code,
      colorHex: example.colorHex,
      maxDaysYear: example.maxDaysYear,
      isPaid: example.isPaid,
      requiresApproval: example.requiresApproval,
      description: example.description
    });
  };

  // 휴가 종류명 변경 시 자동으로 코드 생성
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    // 신규 생성 시에만 자동 생성
    if (name && !editingItem) {
      const currentCode = form.getFieldValue('code');
      
      // 코드가 비어있거나 사용자가 수정하지 않은 경우에만 자동 생성
      if (!currentCode || currentCode.length === 0) {
        const generatedCode = generateCodeFromName(name);
        form.setFieldValue('code', generatedCode);
      }
    }
  };

  const handleEdit = (item: LeaveType) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: LeaveTypeFormData) => {
    setLoading(true);
    try {
      if (editingItem) {
        // Update existing leave type
        await apiClient.put(`/leave-types/${editingItem.id}`, values);
        message.success('휴가 종류가 수정되었습니다.');
      } else {
        // Create new leave type
        await apiClient.post('/leave-types', values);
        message.success('휴가 종류가 생성되었습니다.');
      }
      
      setIsModalOpen(false);
      form.resetFields();
      setEditingItem(null);
      await fetchLeaveTypes();
    } catch (error: any) {
      message.error(error.response?.data?.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/leave-types/${id}`);
      message.success('휴가 종류가 삭제되었습니다.');
      await fetchLeaveTypes();
    } catch (error: any) {
      message.error(error.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  // 순서 변경 함수
  const moveLeaveType = async (id: string, direction: 'up' | 'down') => {
    try {
      const response = await apiClient.put(`/leave-types/${id}/move`, { direction });
      if (response.data?.success) {
        // message.success(response.data.message);
        fetchLeaveTypes(); // 데이터 새로고침
      }
    } catch (error: any) {
      console.error('Failed to move leave type:', error);
      // message.error(error.response?.data?.message || '순서 변경에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '순번',
      key: 'order',
      width: 80,
      render: (text: string, record: LeaveType, index: number) => (
        <div className="flex items-center space-x-1">
          <span className="font-medium">{index + 1}</span>
          <div className="flex flex-col">
            <Button 
              type="text" 
              size="small" 
              icon={<ArrowUpOutlined />}
              disabled={index === 0}
              onClick={() => moveLeaveType(record.id, 'up')}
              style={{ padding: '0 4px', height: '16px', fontSize: '10px' }}
            />
            <Button 
              type="text" 
              size="small" 
              icon={<ArrowDownOutlined />}
              disabled={index === leaveTypes.length - 1}
              onClick={() => moveLeaveType(record.id, 'down')}
              style={{ padding: '0 4px', height: '16px', fontSize: '10px' }}
            />
          </div>
        </div>
      ),
    },
    {
      title: '휴가 종류',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LeaveType) => (
        <Space>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: record.colorHex }}
          />
          <span className="font-medium">{text}</span>
        </Space>
      ),
    },
    {
      title: '코드',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '연간 최대일수',
      dataIndex: 'maxDaysYear',
      key: 'maxDaysYear',
      render: (days: number | null) => days ? `${days}일` : '제한없음',
    },
    {
      title: '유급여부',
      dataIndex: 'isPaid',
      key: 'isPaid',
      render: (isPaid: boolean) => (
        <Tag color={isPaid ? 'green' : 'orange'}>
          {isPaid ? '유급' : '무급'}
        </Tag>
      ),
    },
    {
      title: '승인필요',
      dataIndex: 'requiresApproval',
      key: 'requiresApproval',
      render: (requires: boolean) => (
        <Tag color={requires ? 'blue' : 'gray'}>
          {requires ? '승인필요' : '자동승인'}
        </Tag>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record: LeaveType) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="휴가 종류 삭제"
            description="이 휴가 종류를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button
              type="link"
              size="small"
              icon={<DeleteOutlined />}
              danger
            >
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={2}>휴가 종류 관리</Title>
          <p className="text-gray-600">휴가 종류를 생성하고 관리합니다</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          size="large"
        >
          휴가 종류 추가
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={leaveTypes}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} / 총 ${total}개`,
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <CalendarOutlined />
            {editingItem ? '휴가 종류 수정' : '휴가 종류 추가'}
          </Space>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          setUseTemplate(true);
          setSelectedTemplate('');
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          className="mt-4"
        >
          {!editingItem && (
            <Alert
              message="빠른 설정"
              description={
                <div>
                  <p className="mb-2">일반적인 휴가 종류 예시를 참고하여 빠르게 생성할 수 있습니다.</p>
                  <Space wrap>
                    {LEAVE_TEMPLATES.slice(0, 4).map(example => (
                      <Button 
                        key={example.name}
                        size="small"
                        type="dashed"
                        onClick={() => handleExampleSelect(example)}
                        style={{ 
                          borderColor: example.colorHex,
                          color: example.colorHex
                        }}
                      >
                        {example.name} ({example.code})
                      </Button>
                    ))}
                  </Space>
                </div>
              }
              type="info"
              showIcon
              className="mb-4"
            />
          )}
          <Form.Item
            label="휴가 종류명"
            name="name"
            rules={[
              { required: true, message: '휴가 종류명을 입력해주세요' },
            ]}
          >
            <Input 
              placeholder="예: 연차, 병가, 출산휴가" 
              onChange={handleNameChange}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                <span>코드</span>
                <Tooltip title="시스템에서 사용되는 고유 식별자입니다. 대문자와 언더스코어만 사용 가능합니다.">
                  <InfoCircleOutlined className="text-gray-400" />
                </Tooltip>
              </Space>
            }
            name="code"
            rules={[
              { required: true, message: '코드를 입력해주세요' },
              { pattern: /^[A-Z][A-Z0-9_]*$/, message: '대문자로 시작하고, 대문자/숫자/언더스코어만 사용해주세요' },
              { min: 2, message: '최소 2자 이상 입력해주세요' },
              { max: 20, message: '최대 20자까지 입력 가능합니다' },
            ]}
            extra={!editingItem ? "휴가 종류명 입력 시 자동 생성됩니다. 필요시 수정 가능합니다." : null}
          >
            <Input 
              placeholder="예: ANNUAL, SICK, MATERNITY" 
              style={{ textTransform: 'uppercase' }}
              disabled={!!editingItem}
              onChange={(e) => {
                // 입력값을 대문자로 변환
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '');
                form.setFieldValue('code', value);
              }}
            />
          </Form.Item>

          {!editingItem && (
            <Alert
              message="코드 사용 안내"
              description={
                <ul className="list-disc list-inside text-sm">
                  <li>코드는 시스템 내부에서 휴가 종류를 구분하는 고유값입니다</li>
                  <li>한번 생성된 코드는 변경하지 않는 것을 권장합니다</li>
                  <li>자동 생성된 코드를 수정할 수 있지만, 중복되지 않도록 주의하세요</li>
                </ul>
              }
              type="info"
              showIcon
              className="mb-4"
            />
          )}

          <Form.Item
            label="색상"
            name="colorHex"
            rules={[{ required: true, message: '색상을 선택해주세요' }]}
          >
            <ColorPicker format="hex" />
          </Form.Item>

          <Form.Item
            label="연간 최대 일수"
            name="maxDaysYear"
            help="빈 값으로 두면 제한없음으로 설정됩니다"
          >
            <InputNumber 
              min={0}
              max={365}
              placeholder="최대 일수 (선택사항)"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="유급/무급"
            name="isPaid"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="유급"
              unCheckedChildren="무급"
            />
          </Form.Item>

          <Form.Item
            label="승인 필요"
            name="requiresApproval"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="승인필요"
              unCheckedChildren="자동승인"
            />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
          >
            <TextArea
              rows={3}
              placeholder="휴가 종류에 대한 설명 (선택사항)"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                  form.resetFields();
                }}
              >
                취소
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
              >
                {editingItem ? '수정' : '생성'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};