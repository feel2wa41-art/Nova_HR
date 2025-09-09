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
  message,
  Popconfirm,
  ColorPicker,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CalendarOutlined 
} from '@ant-design/icons';
import { useLeave } from '../../hooks/useLeave';
import { apiClient } from '../../lib/api';

const { Title } = Typography;
const { TextArea } = Input;

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveType | null>(null);
  const [form] = Form.useForm<LeaveTypeFormData>();
  const [loading, setLoading] = useState(false);
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
      colorHex: '#3b82f6'
    });
    setIsModalOpen(true);
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

  const columns = [
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
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          className="mt-4"
        >
          <Form.Item
            label="휴가 종류명"
            name="name"
            rules={[
              { required: true, message: '휴가 종류명을 입력해주세요' },
            ]}
          >
            <Input placeholder="예: 연차, 병가, 출산휴가" />
          </Form.Item>

          <Form.Item
            label="코드"
            name="code"
            rules={[
              { required: true, message: '코드를 입력해주세요' },
              { pattern: /^[A-Z_]+$/, message: '대문자와 언더스코어만 사용해주세요' },
            ]}
          >
            <Input 
              placeholder="예: ANNUAL, SICK, MATERNITY" 
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

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