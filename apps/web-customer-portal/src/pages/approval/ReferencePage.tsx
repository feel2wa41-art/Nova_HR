import { useState } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Input,
  Typography,
  Avatar,
  Tooltip,
  Empty,
  Spin,
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { approvalApi, ApprovalDraft } from '../../lib/api';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;

export const ReferencePage = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');

  // Get reference documents
  const { data: referenceData, isLoading } = useQuery({
    queryKey: ['reference-documents', currentPage, pageSize],
    queryFn: () => approvalApi.getReferenceDocuments({
      page: currentPage,
      limit: pageSize,
    }),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'processing';
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
      case 'SUBMITTED':
        return '제출됨';
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

  const getReferenceType = (document: ApprovalDraft) => {
    if (!document.route?.stages) return null;
    
    // Find the stage where current user is a reference
    const referenceStage = document.route.stages.find(stage => 
      ['REFERENCE', 'RECEPTION', 'CIRCULATION'].includes(stage.type)
    );
    
    if (!referenceStage) return null;
    
    switch (referenceStage.type) {
      case 'REFERENCE':
        return <Tag color="blue">참조</Tag>;
      case 'RECEPTION':
        return <Tag color="green">수신</Tag>;
      case 'CIRCULATION':
        return <Tag color="purple">공람</Tag>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('YYYY-MM-DD HH:mm');
  };

  const handleViewDocument = (document: ApprovalDraft) => {
    navigate(`/approval/drafts/${document.id}`);
  };

  const columns: ColumnsType<ApprovalDraft> = [
    {
      title: '신청자',
      dataIndex: 'user',
      key: 'user',
      width: '15%',
      render: (user: any) => (
        <div className="flex items-center space-x-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="font-medium">{user?.name || '알 수 없음'}</div>
            <div className="text-xs text-gray-500">
              {user?.employee_profile?.department || ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '문서 정보',
      dataIndex: 'title',
      key: 'title',
      width: '30%',
      render: (title, record: ApprovalDraft) => (
        <div>
          <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
               onClick={() => handleViewDocument(record)}>
            {title}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <Tag color="blue">{record.category?.name}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: '참조 구분',
      key: 'referenceType',
      width: '10%',
      render: (_, record) => getReferenceType(record),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
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
          {date ? formatDate(date) : '-'}
        </div>
      ),
    },
    {
      title: '완료일',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: '15%',
      render: (date) => (
        <div className="text-sm">
          {date ? formatDate(date) : '-'}
        </div>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: '10%',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-2">
            <FileTextOutlined className="mr-3" />
            참조문서
          </Title>
          <Text type="secondary">
            참조자로 지정된 결재 문서들을 확인할 수 있습니다.
          </Text>
        </div>
      </div>

      {/* Filters */}
      <Card size="small">
        <div className="flex items-center gap-4">
          <Search
            placeholder="문서 제목 검색"
            allowClear
            style={{ width: 200 }}
            onSearch={setSearchText}
            onChange={(e) => !e.target.value && setSearchText('')}
          />
        </div>
      </Card>

      {/* Content */}
      <Card>
        <Table
          columns={columns}
          dataSource={referenceData?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: referenceData?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / 총 ${total}개`,
            onChange: setCurrentPage,
            onShowSizeChange: (_, size) => setPageSize(size),
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: <Empty description="참조된 결재 문서가 없습니다" />,
          }}
        />
      </Card>
    </div>
  );
};