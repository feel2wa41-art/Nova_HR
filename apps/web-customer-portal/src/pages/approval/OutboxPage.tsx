import { useState } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Select,
  Input,
  Typography,
  Avatar,
  Tooltip,
  Empty,
  Spin,
  Modal,
  Form,
  message,
  Popconfirm,
  App
} from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  SendOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { approvalApi, type ApprovalDraft } from '../../lib/api';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;

interface OutboxDocument extends ApprovalDraft {
  // OutboxPage specific properties can be added here if needed
}

export const OutboxPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { modal } = App.useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('submitted_at_desc');

  // Get outbox documents
  const { data: outboxData, isLoading } = useQuery({
    queryKey: ['outbox-documents', currentPage, pageSize, searchText, selectedStatus, sortBy],
    queryFn: () => approvalApi.getOutboxDocuments({
      page: currentPage,
      limit: pageSize,
      ...(searchText && { search: searchText }),
      ...(selectedStatus && { status: selectedStatus }),
      ...(sortBy && { sortBy }),
    }),
  });

  // 회수 뮤테이션
  const recallMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) =>
      approvalApi.recallDraft(id, { comments }),
    onSuccess: (data) => {
      message.success(data.message || '문서가 회수되었습니다');
      queryClient.invalidateQueries({ queryKey: ['outbox-documents'] });
      queryClient.invalidateQueries({ queryKey: ['my-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '문서 회수에 실패했습니다');
    },
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

  const getProgressInfo = (document: OutboxDocument) => {
    if (!document.route?.stages) return { current: 0, total: 0 };
    
    const stages = document.route.stages;
    const completedStages = stages.filter(stage => stage.status === 'COMPLETED').length;
    
    return {
      current: completedStages,
      total: stages.length,
    };
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

  const handleViewDocument = (document: OutboxDocument) => {
    navigate(`/approval/drafts/${document.id}`);
  };

  const handleRecall = (document: OutboxDocument) => {
    modal.confirm({
      title: '문서 회수',
      content: '정말 이 문서를 회수하시겠습니까? 회수된 문서는 임시보관함으로 이동되며 결재 진행이 취소됩니다.',
      icon: <ExclamationCircleOutlined />,
      okText: '회수',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => {
        recallMutation.mutate({
          id: document.id,
          comments: '문서를 회수했습니다'
        });
      },
    });
  };

  const canRecall = (document: OutboxDocument) => {
    // Can recall only submitted or in_progress documents
    if (!['SUBMITTED', 'IN_PROGRESS'].includes(document.status)) {
      return false;
    }

    // Check if any approvals or rejections have been made
    if (document.route?.stages) {
      const hasDecisions = document.route.stages.some(stage =>
        stage.approvers.some(approver => 
          ['APPROVED', 'REJECTED'].includes(approver.status)
        )
      );
      return !hasDecisions; // Can only recall if no decisions have been made
    }

    return true;
  };

  const columns: ColumnsType<OutboxDocument> = [
    {
      title: '문서 정보',
      dataIndex: 'title',
      key: 'title',
      width: '35%',
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
      title: '진행상황',
      key: 'progress',
      width: '15%',
      render: (_, record) => {
        const progress = getProgressInfo(record);
        return (
          <div className="text-sm">
            <div>{progress.current} / {progress.total} 단계</div>
            <div className="text-gray-500">
              {progress.total > 0 && `${Math.round(progress.current / progress.total * 100)}%`}
            </div>
          </div>
        );
      },
    },
    {
      title: '제출일',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: '20%',
      render: (date) => (
        <div className="text-sm">
          <div>{formatDate(date).split(' ')[0]}</div>
          <div className="text-gray-500">{formatDate(date).split(' ')[1]}</div>
        </div>
      ),
    },
    {
      title: '완료일',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: '20%',
      render: (date) => date ? (
        <div className="text-sm">
          <div>{formatDate(date).split(' ')[0]}</div>
          <div className="text-gray-500">{formatDate(date).split(' ')[1]}</div>
        </div>
      ) : (
        <Text type="secondary">-</Text>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: '15%',
      render: (_, record) => (
        <Space>
          <Tooltip title="문서 보기">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDocument(record)}
            />
          </Tooltip>
          {canRecall(record) && (
            <Tooltip title="문서 회수 (아직 결재되지 않은 문서만 회수 가능)">
              <Button
                type="text"
                danger
                icon={<RollbackOutlined />}
                onClick={() => handleRecall(record)}
                loading={recallMutation.isPending}
              />
            </Tooltip>
          )}
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
            <SendOutlined className="mr-3" />
            상신함
          </Title>
          <Text type="secondary">
            내가 제출한 결재 문서들의 진행 상황을 확인할 수 있습니다.
          </Text>
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
              { label: '제출됨', value: 'SUBMITTED' },
              { label: '진행중', value: 'IN_PROGRESS' },
              { label: '승인완료', value: 'APPROVED' },
              { label: '반려됨', value: 'REJECTED' },
            ]}
          />
          <Select
            placeholder="정렬 기준"
            style={{ width: 150 }}
            value={sortBy}
            onChange={setSortBy}
            options={[
              { label: '최근 제출순', value: 'submitted_at_desc' },
              { label: '오래된 제출순', value: 'submitted_at_asc' },
              { label: '진행률 높은순', value: 'progress_desc' },
              { label: '진행률 낮은순', value: 'progress_asc' },
              { label: '제목순', value: 'title_asc' },
            ]}
          />
        </div>
      </Card>

      {/* Content */}
      <Card>
        <Table
          columns={columns}
          dataSource={outboxData?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: outboxData?.pagination?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / 총 ${total}개`,
            onChange: setCurrentPage,
            onShowSizeChange: (_, size) => setPageSize(size),
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: <Empty description="제출한 결재 문서가 없습니다" />,
          }}
        />
      </Card>
    </div>
  );
};