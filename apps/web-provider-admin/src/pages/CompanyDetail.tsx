import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Descriptions,
  Tag,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Statistic,
  Badge,
  Tooltip,
  Popconfirm,
  App
} from 'antd';
import {
  ArrowLeftOutlined,
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  TeamOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyAPI, userAPI } from '../lib/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  department?: string;
  position?: string;
  role: string;
  status: string;
  created_at: string;
  last_login?: string;
}

const CompanyDetail: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  // 회사 정보 조회
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companyAPI.getCompanyById(companyId!),
    enabled: !!companyId
  });

  // 회사 사용자 목록 조회
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: () => userAPI.getCompanyUsers(companyId!),
    enabled: !!companyId
  });

  // 사용자 추가/수정
  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      if (editingUser) {
        return userAPI.updateUser(editingUser.id, values);
      }
      return userAPI.createUser({ ...values, company_id: companyId });
    },
    onSuccess: () => {
      message.success(editingUser ? '사용자가 수정되었습니다.' : '사용자가 추가되었습니다.');
      setUserModalVisible(false);
      form.resetFields();
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
    },
    onError: () => {
      message.error('작업 중 오류가 발생했습니다.');
    }
  });

  // 사용자 삭제
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => userAPI.deleteUser(userId),
    onSuccess: () => {
      message.success('사용자가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
    },
    onError: () => {
      message.error('삭제 중 오류가 발생했습니다.');
    }
  });

  // 사용자 상태 변경
  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      userAPI.updateUserStatus(userId, status),
    onSuccess: () => {
      message.success('상태가 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
    },
    onError: () => {
      message.error('상태 변경 중 오류가 발생했습니다.');
    }
  });

  // 비밀번호 초기화
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => userAPI.resetPassword(userId),
    onSuccess: () => {
      message.success('비밀번호가 초기화되었습니다. 이메일을 확인해주세요.');
    },
    onError: () => {
      message.error('비밀번호 초기화 중 오류가 발생했습니다.');
    }
  });

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setUserModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setUserModalVisible(true);
  };

  const handleSaveUser = () => {
    form.validateFields().then(values => {
      saveMutation.mutate(values);
    });
  };

  const userColumns: ColumnsType<User> = [
    {
      title: '사용자 정보',
      key: 'userInfo',
      render: (record: User) => (
        <div>
          <Text strong>{record.name}</Text>
          <br />
          <Space size="small">
            <MailOutlined style={{ fontSize: '12px', color: '#999' }} />
            <Text style={{ fontSize: '12px', color: '#666' }}>{record.email}</Text>
          </Space>
          {record.phone && (
            <>
              <br />
              <Space size="small">
                <PhoneOutlined style={{ fontSize: '12px', color: '#999' }} />
                <Text style={{ fontSize: '12px', color: '#666' }}>{record.phone}</Text>
              </Space>
            </>
          )}
        </div>
      )
    },
    {
      title: '부서/직급',
      key: 'department',
      render: (record: User) => (
        <div>
          <Text>{record.department || '-'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.position || '-'}
          </Text>
        </div>
      )
    },
    {
      title: '권한',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleMap: Record<string, { label: string; color: string }> = {
          SUPER_ADMIN: { label: '슈퍼 관리자', color: 'red' },
          ADMIN: { label: '관리자', color: 'orange' },
          HR_MANAGER: { label: 'HR 매니저', color: 'blue' },
          MANAGER: { label: '팀장', color: 'green' },
          EMPLOYEE: { label: '직원', color: 'default' }
        };
        const roleInfo = roleMap[role] || { label: role, color: 'default' };
        return <Tag color={roleInfo.color}>{roleInfo.label}</Tag>;
      }
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          ACTIVE: { label: '활성', color: 'success' },
          INACTIVE: { label: '비활성', color: 'default' },
          SUSPENDED: { label: '정지', color: 'error' }
        };
        const statusInfo = statusMap[status] || { label: status, color: 'default' };
        return <Badge status={statusInfo.color as any} text={statusInfo.label} />;
      }
    },
    {
      title: '가입일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR')
    },
    {
      title: '마지막 로그인',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (date?: string) => date ? new Date(date).toLocaleString('ko-KR') : '-'
    },
    {
      title: '관리',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (record: User) => (
        <Space>
          <Tooltip title="수정">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'ACTIVE' ? '비활성화' : '활성화'}>
            <Button
              type="text"
              size="small"
              icon={record.status === 'ACTIVE' ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => statusMutation.mutate({
                userId: record.id,
                status: record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
              })}
            />
          </Tooltip>
          <Tooltip title="비밀번호 초기화">
            <Popconfirm
              title="비밀번호를 초기화하시겠습니까?"
              onConfirm={() => resetPasswordMutation.mutate(record.id)}
            >
              <Button
                type="text"
                size="small"
                icon={<LockOutlined />}
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="삭제">
            <Popconfirm
              title="정말 삭제하시겠습니까?"
              onConfirm={() => deleteMutation.mutate(record.id)}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  if (companyLoading || !company) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/company-management')}
          style={{ marginBottom: '16px' }}
        >
          회사 목록으로
        </Button>
        <Title level={2}>
          <BankOutlined /> {company.name}
        </Title>
      </div>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="전체 사용자"
              value={users.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="활성 사용자"
              value={users.filter(u => u.status === 'ACTIVE').length}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="월 이용료"
              value={company.monthlyRevenue || 0}
              prefix="₩"
              valueStyle={{ color: '#fa8c16' }}
              formatter={(value) => `${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="가입일"
              value={new Date(company.created_at).toLocaleDateString('ko-KR')}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 탭 컨텐츠 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="회사 정보" key="info">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="회사명">{company.name}</Descriptions.Item>
              <Descriptions.Item label="사업자등록번호">{company.business_number}</Descriptions.Item>
              <Descriptions.Item label="대표자명">{company.ceo_name}</Descriptions.Item>
              <Descriptions.Item label="업종">{company.industry || '-'}</Descriptions.Item>
              <Descriptions.Item label="이메일">{company.email}</Descriptions.Item>
              <Descriptions.Item label="전화번호">{company.phone}</Descriptions.Item>
              <Descriptions.Item label="주소" span={2}>
                {company.address} {company.address_detail}
              </Descriptions.Item>
              <Descriptions.Item label="요금제">
                <Tag color={company.tenant?.plan === 'ENTERPRISE' ? 'gold' : 'blue'}>
                  {company.tenant?.plan || 'BASIC'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag color={company.status === 'ACTIVE' ? 'success' : 'default'}>
                  {company.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="가입일">
                {new Date(company.created_at).toLocaleString('ko-KR')}
              </Descriptions.Item>
              <Descriptions.Item label="최종 수정일">
                {new Date(company.updated_at).toLocaleString('ko-KR')}
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane tab={`사용자 관리 (${users.length})`} key="users">
            <div style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={handleAddUser}
              >
                사용자 추가
              </Button>
            </div>
            <Table
              dataSource={users}
              columns={userColumns}
              rowKey="id"
              loading={usersLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `총 ${total}명`
              }}
              scroll={{ x: 1200 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 사용자 추가/수정 모달 */}
      <Modal
        title={editingUser ? '사용자 수정' : '사용자 추가'}
        open={userModalVisible}
        onOk={handleSaveUser}
        onCancel={() => {
          setUserModalVisible(false);
          form.resetFields();
          setEditingUser(null);
        }}
        confirmLoading={saveMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'EMPLOYEE',
            status: 'ACTIVE'
          }}
        >
          <Form.Item
            name="email"
            label="이메일"
            rules={[
              { required: true, message: '이메일을 입력해주세요.' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다.' }
            ]}
          >
            <Input placeholder="user@example.com" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: '이름을 입력해주세요.' }]}
          >
            <Input placeholder="홍길동" />
          </Form.Item>

          <Form.Item name="phone" label="전화번호">
            <Input placeholder="010-1234-5678" />
          </Form.Item>

          <Form.Item name="department" label="부서">
            <Input placeholder="인사팀" />
          </Form.Item>

          <Form.Item name="position" label="직급">
            <Input placeholder="대리" />
          </Form.Item>

          <Form.Item
            name="role"
            label="권한"
            rules={[{ required: true, message: '권한을 선택해주세요.' }]}
          >
            <Select>
              <Select.Option value="ADMIN">관리자</Select.Option>
              <Select.Option value="HR_MANAGER">HR 매니저</Select.Option>
              <Select.Option value="MANAGER">팀장</Select.Option>
              <Select.Option value="EMPLOYEE">직원</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="상태"
            rules={[{ required: true, message: '상태를 선택해주세요.' }]}
          >
            <Select>
              <Select.Option value="ACTIVE">활성</Select.Option>
              <Select.Option value="INACTIVE">비활성</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyDetail;