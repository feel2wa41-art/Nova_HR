import { Modal, Form, Input, Select, Button, Space } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useEffect } from 'react';

interface UserFormProps {
  open: boolean;
  user?: any;
  onOk: (userData: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface UserFormData {
  name: string;
  email: string;
  phone?: string;
  title?: string;
  role: string;
  status: string;
  organizationId: string;
  order: number;
}

export const UserForm = ({ open, user, onOk, onCancel, loading }: UserFormProps) => {
  const [form] = Form.useForm<UserFormData>();

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue(user);
    } else if (open) {
      form.resetFields();
    }
  }, [open, user, form]);

  const handleSubmit = async (values: UserFormData) => {
    onOk(values);
  };

  const roleOptions = [
    { value: 'EMPLOYEE', label: '직원' },
    { value: 'MANAGER', label: '매니저' },
    { value: 'HR_MANAGER', label: 'HR 매니저' },
    { value: 'SUPER_ADMIN', label: '시스템 관리자' },
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: '활성' },
    { value: 'INACTIVE', label: '비활성' },
    { value: 'SUSPENDED', label: '정지' },
    { value: 'PENDING', label: '승인대기' },
  ];

  return (
    <Modal
      title={user ? '사용자 수정' : '새 사용자 추가'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={{
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          organizationId: 'org_4',
          order: 0,
        }}
      >
        <Form.Item
          label="이름"
          name="name"
          rules={[
            { required: true, message: '이름을 입력해주세요' },
            { min: 2, message: '이름은 2자 이상이어야 합니다' },
          ]}
        >
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder="사용자 이름을 입력하세요"
          />
        </Form.Item>

        <Form.Item
          label="이메일"
          name="email"
          rules={[
            { required: true, message: '이메일을 입력해주세요' },
            { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined />}
            placeholder="이메일 주소를 입력하세요"
          />
        </Form.Item>

        <Form.Item
          label="연락처"
          name="phone"
        >
          <Input
            size="large"
            prefix={<PhoneOutlined />}
            placeholder="연락처를 입력하세요 (예: +62 812-3456-7890)"
          />
        </Form.Item>

        <Form.Item
          label="직책"
          name="title"
        >
          <Input
            size="large"
            placeholder="직책을 입력하세요 (예: 시니어 개발자)"
          />
        </Form.Item>

        <Form.Item
          label="권한"
          name="role"
          rules={[
            { required: true, message: '권한을 선택해주세요' },
          ]}
        >
          <Select
            size="large"
            placeholder="권한을 선택하세요"
            options={roleOptions}
          />
        </Form.Item>

        <Form.Item
          label="조직"
          name="organizationId"
          rules={[{ required: true, message: '조직을 선택해주세요' }]}
        >
          <Select
            size="large"
            placeholder="조직을 선택하세요"
            options={[
              { value: 'org_1', label: 'Nova HR (본사)' },
              { value: 'org_2', label: 'IT팀' },
              { value: 'org_3', label: 'HR팀' },
              { value: 'org_4', label: '개발팀' },
              { value: 'org_5', label: '디자인팀' },
              { value: 'org_6', label: '영업팀' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="표시 순서"
          name="order"
        >
          <Input 
            type="number" 
            min={0} 
            size="large"
            placeholder="조직 내에서의 순서 (0부터 시작)"
          />
        </Form.Item>

        <Form.Item
          label="상태"
          name="status"
          rules={[
            { required: true, message: '상태를 선택해주세요' },
          ]}
        >
          <Select
            size="large"
            placeholder="상태를 선택하세요"
            options={statusOptions}
          />
        </Form.Item>

        {!user && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-blue-700 mb-2">
              <strong>초기 비밀번호 안내</strong>
            </p>
            <p className="text-sm text-blue-600">
              새 사용자의 초기 비밀번호는 <code>admin123</code>으로 설정됩니다. 
              사용자는 첫 로그인 후 비밀번호를 변경해야 합니다.
            </p>
          </div>
        )}

        <Form.Item className="mb-0">
          <Space className="w-full justify-end">
            <Button size="large" onClick={onCancel}>
              취소
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
            >
              {user ? '수정' : '추가'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};