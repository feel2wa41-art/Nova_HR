import { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Select, 
  Modal, 
  message,
  Tooltip,
  Avatar,
  Typography 
} from 'antd';
import { 
  TeamOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { UserForm } from '../../components/admin/UserForm';

const { Title } = Typography;
const { Search } = Input;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  title?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: string;
  lastLogin?: string;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: '홍길동',
    email: 'employee@nova-hr.com',
    role: 'EMPLOYEE',
    title: '시니어 개발자',
    phone: '+62 812-3456-7890',
    status: 'ACTIVE',
    createdAt: '2025-01-15T09:00:00.000Z',
    lastLogin: '2025-08-19T08:30:00.000Z',
  },
  {
    id: '2',
    name: '김인사',
    email: 'hr@nova-hr.com',
    role: 'HR_MANAGER',
    title: 'HR 매니저',
    phone: '+62 812-3456-7891',
    status: 'ACTIVE',
    createdAt: '2025-01-10T09:00:00.000Z',
    lastLogin: '2025-08-19T08:15:00.000Z',
  },
  {
    id: '3',
    name: '시스템 관리자',
    email: 'admin@nova-hr.com',
    role: 'SUPER_ADMIN',
    title: 'IT 관리자',
    phone: '+62 812-3456-7892',
    status: 'ACTIVE',
    createdAt: '2025-01-01T09:00:00.000Z',
    lastLogin: '2025-08-19T09:00:00.000Z',
  },
  {
    id: '4',
    name: '이직원',
    email: 'employee2@nova-hr.com',
    role: 'EMPLOYEE',
    title: '주니어 개발자',
    phone: '+62 812-3456-7893',
    status: 'INACTIVE',
    createdAt: '2025-02-01T09:00:00.000Z',
    lastLogin: '2025-08-10T17:30:00.000Z',
  },
];

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [filteredUsers, setFilteredUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    filterUsers();
  }, [searchText, filterRole, filterStatus, users]);

  const filterUsers = () => {
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

  const getRoleTag = (role: string) => {
    const roleConfig = {
      SUPER_ADMIN: { color: 'red', text: '시스템 관리자' },
      HR_MANAGER: { color: 'orange', text: 'HR 매니저' },
      MANAGER: { color: 'blue', text: '매니저' },
      EMPLOYEE: { color: 'green', text: '직원' },
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

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleDelete = (user: User) => {
    Modal.confirm({
      title: '사용자 삭제',
      content: `${user.name} 사용자를 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        setIsLoading(true);
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setUsers(prev => prev.filter(u => u.id !== user.id));
          message.success('사용자가 삭제되었습니다');
        } catch (error) {
          message.error('사용자 삭제에 실패했습니다');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleModalOk = async (userData: any) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (selectedUser) {
        // Update existing user
        setUsers(prev => prev.map(user => 
          user.id === selectedUser.id ? { ...user, ...userData } : user
        ));
        message.success('사용자 정보가 업데이트되었습니다');
      } else {
        // Add new user
        const newUser: User = {
          id: Date.now().toString(),
          ...userData,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        setUsers(prev => [...prev, newUser]);
        message.success('새 사용자가 추가되었습니다');
      }
      
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      message.error('사용자 정보 저장에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: '사용자',
      key: 'user',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar size="default" icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-gray-500 text-sm">{record.title}</div>
          </div>
        </div>
      ),
    },
    {
      title: '연락처',
      key: 'contact',
      render: (_, record) => (
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
      title: '권한',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => getRoleTag(role),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
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
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => new Date(createdAt).toLocaleDateString('ko-KR'),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="수정">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="삭제">
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={2}>
            <TeamOutlined className="mr-2" />
            사용자 관리
          </Title>
          <p className="text-gray-600">시스템 사용자를 관리하세요</p>
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
              { value: 'SUPER_ADMIN', label: '시스템 관리자' },
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
              { value: 'PENDING', label: '승인대기' },
            ]}
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / 총 ${total}명`,
          }}
        />
      </Card>

      {/* User Form Modal */}
      <UserForm
        open={isModalOpen}
        user={selectedUser}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        loading={isLoading}
      />
    </div>
  );
};