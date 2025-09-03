import { useState } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Select, 
  DatePicker, 
  Input,
  Typography,
  Avatar,
  Tooltip,
  Badge,
  Tabs
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  InboxOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

interface InboxDocument {
  id: string;
  title: string;
  category: {
    id: string;
    name: string;
  };
  user: {
    name: string;
    email: string;
    employee_profile?: {
      emp_no: string;
      department: string;
    };
  };
  status: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
  created_at: string;
  submitted_at: string;
  completed_at?: string;
  route: {
    stages: Array<{
      type: string;
      approvers: Array<{
        user_id: string;
        status: string;
      }>;
    }>;
  };
}

export const InboxPage = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Get inbox documents
  const { data: inboxData, isLoading } = useQuery({
    queryKey: ['inbox-documents', currentPage, pageSize, selectedType, searchText, selectedStatus],
    queryFn: () => apiClient.get('/approval/inbox', {
      params: {
        page: currentPage,
        limit: pageSize,
        ...(selectedType && { type: selectedType }),
        ...(searchText && { search: searchText }),
        ...(selectedStatus && { status: selectedStatus }),
      }
    }).then(res => res.data),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'processing';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return '진행중';
      case 'APPROVED':
        return '승인완료';
      case 'REJECTED':
        return '반려됨';
      default:
        return status;
    }
  };

  const getUserRole = (document: InboxDocument, userId: string = 'current-user-id') => {
    // Find user's role in this document
    for (const stage of document.route?.stages || []) {
      const approver = stage.approvers.find(a => a.user_id === userId);
      if (approver) {
        switch (stage.type) {
          case 'COOPERATION':
            return { type: '협조', color: 'orange' };
          case 'APPROVAL':
            return { type: '결재', color: 'green' };
          case 'REFERENCE':
            return { type: '참조', color: 'blue' };
          case 'RECEPTION':
            return { type: '수신', color: 'purple' };
          case 'CIRCULATION':
            return { type: '공람', color: 'cyan' };
          default:
            return { type: '알림', color: 'default' };
        }
      }
    }
    return { type: '알림', color: 'default' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDocument = (document: InboxDocument) => {
    navigate(`/approval/document/${document.id}`);
  };

  const columns: ColumnsType<InboxDocument> = [
    {
      title: '문서 정보',
      dataIndex: 'title',
      key: 'title',
      width: '30%',
      render: (title, record) => (
        <div>
          <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
               onClick={() => handleViewDocument(record)}>
            {title}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <Tag color="blue">{record.category.name}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: '신청자',
      dataIndex: 'user',
      key: 'user',
      width: '20%',
      render: (user) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{user.name}</div>
            {user.employee_profile && (
              <div className="text-xs text-gray-500">
                {user.employee_profile.department}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '역할',
      key: 'role',
      width: '15%',
      render: (_, record) => {
        const role = getUserRole(record);
        return (
          <Tag color={role.color}>
            {role.type}
          </Tag>
        );
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '제출일',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: '15%',
      render: (date) => (
        <div className="text-sm">
          <div>{formatDate(date).split(' ')[0]}</div>
          <div className="text-gray-500">{formatDate(date).split(' ')[1]}</div>
        </div>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: '5%',
      render: (_, record) => (
        <Space>
          <Tooltip title="문서 보기">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDocument(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: '',
      label: `전체 (${inboxData?.data?.pagination?.total || 0})`,
      icon: <InboxOutlined />,
    },
    {
      key: 'REFERENCE',
      label: '참조',
      icon: <FileTextOutlined />,
    },
    {
      key: 'RECEPTION',
      label: '수신',
      icon: <InboxOutlined />,
    },
    {
      key: 'CIRCULATION',
      label: '공람',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-2">
            <InboxOutlined className="mr-3" />
            수신함
          </Title>
          <Text type="secondary">
            참조, 수신, 공람으로 받은 문서를 확인할 수 있습니다.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Badge count={inboxData?.data?.pagination?.total || 0} showZero>
            <Button icon={<InboxOutlined />}>
              전체 문서
            </Button>
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card size="small">
        <div className="flex items-center gap-4 flex-wrap">
          <Search
            placeholder="문서 제목 검색"
            allowClear
            style={{ width: 200 }}
            onSearch={setSearchText}
            onChange={(e) => !e.target.value && setSearchText('')}
          />
          <Select
            placeholder="상태 선택"
            style={{ width: 120 }}
            allowClear
            value={selectedStatus || undefined}
            onChange={setSelectedStatus}
            options={[
              { label: '진행중', value: 'IN_PROGRESS' },
              { label: '승인완료', value: 'APPROVED' },
              { label: '반려됨', value: 'REJECTED' },
            ]}
          />
          <RangePicker
            placeholder={['시작일', '종료일']}
            style={{ width: 220 }}
          />
        </div>
      </Card>

      {/* Content */}
      <Card>
        <Tabs
          activeKey={selectedType}
          onChange={setSelectedType}
          items={tabItems}
          className="mb-4"
        />

        <Table
          columns={columns}
          dataSource={inboxData?.data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: inboxData?.data?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / 총 ${total}개`,
            onChange: setCurrentPage,
            onShowSizeChange: (_, size) => setPageSize(size),
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};