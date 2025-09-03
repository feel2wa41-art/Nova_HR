import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Tabs, 
  Modal, 
  Form, 
  Input,
  Select,
  message,
  Badge,
  Descriptions,
  Row,
  Col,
  Avatar
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserOutlined, 
  EyeOutlined, 
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { apiClient } from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface User {
  id: string;
  email: string;
  name: string;
  title: string;
  phone: string;
  role: string;
  status: string;
  email_verified: boolean;
  created_at: string;
  tenant: {
    id: string;
    name: string;
    domain: string;
  } | null;
  company: {
    id: string;
    name: string;
  } | null;
}

interface PendingUser {
  id: string;
  email: string;
  name: string;
  title: string;
  phone: string;
  status: 'PENDING_EMAIL_VERIFICATION' | 'PENDING_HR_APPROVAL';
  email_verified: boolean;
  created_at: string;
  company_name: string;
}

export default function GlobalUserManagement() {
  const [activeTab, setActiveTab] = useState('users');
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | PendingUser | null>(null);
  const [approvalForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Get all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: () => apiClient.get('/auth/all-users').then(res => res.data),
    enabled: activeTab === 'users',
  });

  // Get pending users
  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-pending-users'],
    queryFn: () => apiClient.get('/auth/pending-users').then(res => res.data),
    enabled: activeTab === 'pending',
  });

  // Approve user
  const approveUserMutation = useMutation({
    mutationFn: (data: { userId: string; notes?: string }) =>
      apiClient.post(`/auth/approve-user/${data.userId}`, { notes: data.notes }),
    onSuccess: () => {
      message.success('사용자가 승인되었습니다');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      setApprovalModalVisible(false);
      setSelectedUser(null);
      approvalForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다');
    },
  });

  // Reject user
  const rejectUserMutation = useMutation({
    mutationFn: (data: { userId: string; notes?: string }) =>
      apiClient.post(`/auth/reject-user/${data.userId}`, { notes: data.notes }),
    onSuccess: () => {
      message.success('사용자가 거부되었습니다');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-users'] });
      setApprovalModalVisible(false);
      setSelectedUser(null);
      approvalForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '거부 처리 중 오류가 발생했습니다');
    },
  });

  // Update user
  const updateUserMutation = useMutation({
    mutationFn: (data: { userId: string; updates: any }) =>
      apiClient.put(`/auth/users/${data.userId}`, data.updates),
    onSuccess: () => {
      message.success('사용자 정보가 업데이트되었습니다');
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      setEditModalVisible(false);
      setSelectedUser(null);
      editForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '업데이트 중 오류가 발생했습니다');
    },
  });

  const handleApprove = (user: PendingUser) => {
    setSelectedUser(user);
    setApprovalModalVisible(true);
    approvalForm.setFieldValue('action', 'approve');
  };

  const handleReject = (user: PendingUser) => {
    setSelectedUser(user);
    setApprovalModalVisible(true);
    approvalForm.setFieldValue('action', 'reject');
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    editForm.setFieldsValue({
      name: user.name,
      title: user.title,
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
    setEditModalVisible(true);
  };

  const handleApprovalSubmit = () => {
    approvalForm.validateFields().then(values => {
      if (!selectedUser) return;

      const data = {
        userId: selectedUser.id,
        notes: values.notes
      };

      if (values.action === 'approve') {
        approveUserMutation.mutate(data);
      } else {
        rejectUserMutation.mutate(data);
      }
    });
  };

  const handleEditSubmit = () => {
    editForm.validateFields().then(values => {
      if (!selectedUser) return;

      updateUserMutation.mutate({
        userId: selectedUser.id,
        updates: values
      });
    });
  };

  const userColumns = [
    {
      title: '사용자',
      key: 'user',
      render: (record: User) => (
        <div className="flex items-center space-x-3">
          <Avatar size="large" icon={<UserOutlined />} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" className="text-xs">{record.email}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '회사',
      key: 'company',
      render: (record: User) => (
        <div>
          {record.company ? (
            <>
              <div>{record.company.name}</div>
              <div className="text-xs text-gray-500">{record.tenant?.domain}</div>
            </>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </div>
      ),
    },
    {
      title: '역할',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colors = {
          SUPER_ADMIN: 'red',
          CUSTOMER_ADMIN: 'orange',
          HR_MANAGER: 'blue',
          MANAGER: 'green',
          EMPLOYEE: 'default',
        };
        return <Tag color={colors[role as keyof typeof colors]}>{role}</Tag>;
      },
    },
    {
      title: '직책',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '연락처',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: User) => (
        <div>
          <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
            {status === 'ACTIVE' ? '활성' : '비활성'}
          </Tag>
          {record.email_verified && (
            <Tag color="blue" className="ml-1">이메일 인증</Tag>
          )}
        </div>
      ),
    },
    {
      title: '가입일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '작업',
      key: 'actions',
      render: (record: User) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setViewModalVisible(true);
            }}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Space>
      ),
    },
  ];

  const pendingColumns = [
    {
      title: '사용자',
      key: 'user',
      render: (record: PendingUser) => (
        <div className="flex items-center space-x-3">
          <Avatar size="large" icon={<UserOutlined />} />
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" className="text-xs">{record.email}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '회사명',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (text: string) => text || '-',
    },
    {
      title: '직책',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => text || '-',
    },
    {
      title: '연락처',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: PendingUser) => (
        <div>
          <Tag color={status === 'PENDING_EMAIL_VERIFICATION' ? 'orange' : 'processing'}>
            {status === 'PENDING_EMAIL_VERIFICATION' ? '이메일 인증 대기' : 'HR 승인 대기'}
          </Tag>
          {record.email_verified && (
            <Tag color="blue" className="ml-1">이메일 인증</Tag>
          )}
        </div>
      ),
    },
    {
      title: '신청일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '작업',
      key: 'actions',
      render: (record: PendingUser) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setViewModalVisible(true);
            }}
          />
          {record.status === 'PENDING_HR_APPROVAL' && (
            <>
              <Button 
                type="text" 
                icon={<CheckOutlined />}
                className="text-green-600"
                onClick={() => handleApprove(record)}
              />
              <Button 
                type="text" 
                icon={<CloseOutlined />}
                className="text-red-600" 
                onClick={() => handleReject(record)}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  const pendingUsersCount = pendingUsers?.length || 0;
  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter((u: User) => u.status === 'ACTIVE').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>
          <TeamOutlined className="mr-3" />
          전체 사용자 관리
        </Title>
      </div>

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
              <div className="text-gray-500">전체 사용자</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
              <div className="text-gray-500">활성 사용자</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingUsersCount}</div>
              <div className="text-gray-500">승인 대기</div>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {users?.filter((u: User) => u.role === 'SUPER_ADMIN').length || 0}
              </div>
              <div className="text-gray-500">관리자</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'users',
            label: '전체 사용자',
            children: (
              <Card>
                <Table
                  columns={userColumns}
                  dataSource={users}
                  loading={usersLoading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            )
          },
          {
            key: 'pending',
            label: (
              <span>
                승인 대기
                {pendingUsersCount > 0 && (
                  <Badge count={pendingUsersCount} offset={[10, -5]} />
                )}
              </span>
            ),
            children: (
              <Card>
                <Table
                  columns={pendingColumns}
                  dataSource={pendingUsers}
                  loading={pendingLoading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            )
          }
        ]}
      />

      {/* View User Modal */}
      <Modal
        title="사용자 상세 정보"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedUser && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="이름">
              {selectedUser.name}
            </Descriptions.Item>
            <Descriptions.Item label="이메일">
              <div className="flex items-center">
                <MailOutlined className="mr-2" />
                {selectedUser.email}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="전화번호">
              <div className="flex items-center">
                <PhoneOutlined className="mr-2" />
                {selectedUser.phone || '-'}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="직책">
              {'title' in selectedUser ? selectedUser.title : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="역할">
              {'role' in selectedUser ? (
                <Tag color="blue">{selectedUser.role}</Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              {'status' in selectedUser ? (
                <Tag color={selectedUser.status === 'ACTIVE' ? 'green' : 'red'}>
                  {selectedUser.status}
                </Tag>
              ) : (
                <Tag color="orange">PENDING</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="이메일 인증">
              <Tag color={selectedUser.email_verified ? 'green' : 'red'}>
                {selectedUser.email_verified ? '인증완료' : '미인증'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="가입일">
              {new Date(selectedUser.created_at).toLocaleString('ko-KR')}
            </Descriptions.Item>
            {'company' in selectedUser && selectedUser.company && (
              <Descriptions.Item label="소속 회사" span={2}>
                {selectedUser.company.name}
              </Descriptions.Item>
            )}
            {'company_name' in selectedUser && selectedUser.company_name && (
              <Descriptions.Item label="희망 회사" span={2}>
                {selectedUser.company_name}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal
        title={approvalForm.getFieldValue('action') === 'approve' ? '사용자 승인' : '사용자 거부'}
        open={approvalModalVisible}
        onOk={handleApprovalSubmit}
        onCancel={() => {
          setApprovalModalVisible(false);
          setSelectedUser(null);
          approvalForm.resetFields();
        }}
        confirmLoading={approveUserMutation.isPending || rejectUserMutation.isPending}
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item name="action" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="notes"
            label="처리 의견"
            help={approvalForm.getFieldValue('action') === 'approve' ? "승인 사유를 입력해주세요" : "거부 사유를 입력해주세요"}
          >
            <TextArea rows={4} placeholder="처리 의견을 입력하세요..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title="사용자 정보 수정"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedUser(null);
          editForm.resetFields();
        }}
        confirmLoading={updateUserMutation.isPending}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: '이름을 입력해주세요' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="title"
            label="직책"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="전화번호"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="역할"
            rules={[{ required: true, message: '역할을 선택해주세요' }]}
          >
            <Select>
              <Option value="EMPLOYEE">직원</Option>
              <Option value="MANAGER">매니저</Option>
              <Option value="HR_MANAGER">HR 매니저</Option>
              <Option value="CUSTOMER_ADMIN">고객사 관리자</Option>
              <Option value="SUPER_ADMIN">슈퍼 관리자</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="상태"
            rules={[{ required: true, message: '상태를 선택해주세요' }]}
          >
            <Select>
              <Option value="ACTIVE">활성</Option>
              <Option value="INACTIVE">비활성</Option>
              <Option value="SUSPENDED">정지</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}