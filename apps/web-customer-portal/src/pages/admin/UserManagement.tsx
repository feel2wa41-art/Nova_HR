import React, { useState, useEffect } from 'react';
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
  Avatar,
  Tooltip
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
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { UserForm } from '../../components/admin/UserForm';
import { apiClient } from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea, Search } = Input;
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
  lastLogin?: string;
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

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [userFormVisible, setUserFormVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | PendingUser | null>(null);
  const [selectedUserForForm, setSelectedUserForForm] = useState<User | null>(null);
  const [approvalForm] = Form.useForm();
  const [editForm] = Form.useForm();
  
  // Search and filter states
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Get current user's company ID
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => apiClient.get('/users/profile').then(res => res.data),
  });

  const companyId = profile?.org_unit?.company?.id;

  // Get all users (company users for customer portal)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const response = await apiClient.get(`/users/company/${companyId}`);
      return response.data;
    },
    enabled: activeTab === 'users' && !!companyId,
  });

  // Get pending users
  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin-pending-users'],
    queryFn: () => apiClient.get('/auth/pending-users').then(res => res.data),
    enabled: activeTab === 'pending',
  });

  useEffect(() => {
    filterUsers();
  }, [searchText, filterRole, filterStatus, users]);

  const filterUsers = () => {
    if (!users) return;
    let filtered = users;

    // Search filter
    if (searchText) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase()) ||
        user.title?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => user.status === filterStatus);
    }

    setFilteredUsers(filtered);
  };

  // Approve user
  const approveUserMutation = useMutation({
    mutationFn: (data: { userId: string; notes?: string }) =>
      apiClient.post(`/auth/approve-user/${data.userId}`, { notes: data.notes }),
    onSuccess: () => {
      message.success('사용자가 승인되었습니다');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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

  // Delete user mutation (deactivate user)
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
      message.success('사용자가 비활성화되었습니다');
    },
    onError: () => {
      message.error('사용자 비활성화에 실패했습니다');
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (!companyId) throw new Error('Company ID not found');
      return await apiClient.post(`/users/company/${companyId}/invite`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
      message.success('사용자 초대가 완료되었습니다. 이메일을 확인해주세요.');
      setUserFormVisible(false);
      setSelectedUserForForm(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '사용자 초대에 실패했습니다');
    },
  });

  // Save user mutation (for UserForm - both invite and update)
  const saveUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId?: string; userData: any }) => {
      if (userId) {
        // Update existing user
        return await apiClient.put(`/users/${userId}`, userData);
      } else {
        // Invite new user
        if (!companyId) throw new Error('Company ID not found');
        return await apiClient.post(`/users/company/${companyId}/invite`, userData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
      message.success(selectedUserForForm ? '사용자 정보가 수정되었습니다' : '사용자 초대가 완료되었습니다');
      setUserFormVisible(false);
      setSelectedUserForForm(null);
    },
    onError: (error: any) => {
      const action = selectedUserForForm ? '수정' : '초대';
      message.error(error.response?.data?.message || `사용자 ${action}에 실패했습니다`);
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

  const handleAdd = () => {
    setSelectedUserForForm(null);
    setUserFormVisible(true);
  };

  const handleEditForForm = (user: User) => {
    setSelectedUserForForm(user);
    setUserFormVisible(true);
  };

  const handleDelete = (user: User) => {
    Modal.confirm({
      title: '사용자 비활성화',
      content: `${user.name} 사용자를 비활성화하시겠습니까?`,
      okText: '비활성화',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => deleteMutation.mutate(user.id),
    });
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
    // This modal is deprecated, use the main UserForm instead
    message.info('사용자 수정은 메인 수정 버튼을 사용해주세요');
    setEditModalVisible(false);
  };

  const handleModalOk = async (userData: any) => {
    saveUserMutation.mutate({ 
      userId: selectedUserForForm?.id,
      userData 
    });
  };

  const getRoleTag = (role: string) => {
    const roleConfig = {
      SUPER_ADMIN: { color: 'red', text: '시스템 관리자' },
      CUSTOMER_ADMIN: { color: 'orange', text: '고객사 관리자' },
      HR_MANAGER: { color: 'blue', text: 'HR 매니저' },
      MANAGER: { color: 'green', text: '매니저' },
      EMPLOYEE: { color: 'default', text: '직원' },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || { color: 'default', text: role };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'success', text: '활성' },
      INACTIVE: { color: 'default', text: '비활성' },
      SUSPENDED: { color: 'error', text: '정지' },
      PENDING: { color: 'processing', text: '승인대기' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
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
      title: '연락처',
      key: 'contact',
      render: (record: User) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <MailOutlined className="text-gray-400" />
            <span>{record.email}</span>
          </div>
          {record.phone && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <PhoneOutlined className="text-gray-400" />
              <span>{record.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '직책',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => title || '-',
    },
    {
      title: '역할',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => getRoleTag(role),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: User) => (
        <div>
          {getStatusTag(status)}
          {record.email_verified && (
            <Tag color="blue" className="ml-1">이메일 인증</Tag>
          )}
        </div>
      ),
    },
    {
      title: '최근 로그인',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (lastLogin: string) => 
        lastLogin ? new Date(lastLogin).toLocaleString('ko-KR') : '-',
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
      width: 120,
      render: (record: User) => (
        <Space size="small">
          <Tooltip title="보기">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedUser(record);
                setViewModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="수정">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditForForm(record)}
            />
          </Tooltip>
          <Tooltip title="비활성화">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
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
        <div>
          <Title level={2}>
            <TeamOutlined className="mr-3" />
            사용자 관리
          </Title>
          <p className="text-gray-600">직원을 관리하고 가입 승인을 처리하세요</p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          사용자 추가
        </Button>
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
                {users?.filter((u: User) => u.role === 'HR_MANAGER' || u.role === 'CUSTOMER_ADMIN').length || 0}
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
            label: '직원 관리',
            children: (
              <div className="space-y-4">
                {/* Filters */}
                <Card>
                  <div className="flex flex-wrap gap-4">
                    <Search
                      placeholder="이름, 이메일, 직책으로 검색"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 250 }}
                      allowClear
                    />
                    <Select
                      placeholder="권한 필터"
                      value={filterRole}
                      onChange={setFilterRole}
                      style={{ width: 150 }}
                      options={[
                        { value: 'all', label: '전체 권한' },
                        { value: 'CUSTOMER_ADMIN', label: '고객사 관리자' },
                        { value: 'HR_MANAGER', label: 'HR 매니저' },
                        { value: 'MANAGER', label: '매니저' },
                        { value: 'EMPLOYEE', label: '직원' },
                      ]}
                    />
                    <Select
                      placeholder="상태 필터"
                      value={filterStatus}
                      onChange={setFilterStatus}
                      style={{ width: 120 }}
                      options={[
                        { value: 'all', label: '전체 상태' },
                        { value: 'ACTIVE', label: '활성' },
                        { value: 'INACTIVE', label: '비활성' },
                        { value: 'SUSPENDED', label: '정지' },
                      ]}
                    />
                  </div>
                </Card>

                <Card>
                  <Table
                    columns={userColumns}
                    dataSource={filteredUsers}
                    loading={usersLoading}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} / 총 ${total}명`,
                    }}
                  />
                </Card>
              </div>
            )
          },
          {
            key: 'pending',
            label: (
              <span>
                가입 승인
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

      {/* User Form Modal */}
      <UserForm
        open={userFormVisible}
        user={selectedUserForForm}
        onOk={handleModalOk}
        onCancel={() => {
          setUserFormVisible(false);
          setSelectedUserForForm(null);
        }}
        loading={saveUserMutation.isPending}
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
            {'role' in selectedUser && (
              <Descriptions.Item label="역할">
                <Tag color="blue">{selectedUser.role}</Tag>
              </Descriptions.Item>
            )}
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
        confirmLoading={false}
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
};