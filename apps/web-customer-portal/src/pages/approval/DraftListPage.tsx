import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Pagination,
  Select,
  Input,
  message,
  Popconfirm,
  Tooltip,
  Empty,
  Spin,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { approvalApi, ApprovalDraft } from '../../lib/api';

const { Title } = Typography;
const { Search } = Input;

interface DraftListPageProps {
  embedded?: boolean;
}

export const DraftListPage = ({ embedded = false }: DraftListPageProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('DRAFT');
  const [searchText, setSearchText] = useState('');

  // 내 결재 목록 조회 (임시 목업 데이터 사용)
  const mockDrafts = {
    data: [
      {
        id: '1',
        title: '클라이언트 미팅 교통비 청구',
        status: 'SUBMITTED',
        created_at: '2024-01-16T09:30:00Z',
        submitted_at: '2024-01-16T09:30:00Z',
        category: { name: '비용 청구', icon: '💳' },
        content: { amount: 35000, category: 'TRANSPORT' }
      },
      {
        id: '2',
        title: '연차 휴가 신청 (개인 사유)',
        status: 'DRAFT',
        created_at: '2024-01-15T14:20:00Z',
        submitted_at: null,
        category: { name: '휴가 신청', icon: '🏖️' },
        content: { leave_type: 'ANNUAL', duration: 'FULL_DAY' }
      }
    ],
    pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['my-drafts', page, pageSize, status],
    queryFn: () => approvalApi.getMyDrafts({
      page,
      limit: pageSize,
      status: status || 'DRAFT', // 기본적으로 임시저장(DRAFT) 상태 문서 조회
    }),
    retry: 1,
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: approvalApi.deleteDraft,
    onSuccess: () => {
      message.success('문서가 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['my-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
    },
    onError: () => {
      message.error('문서 삭제에 실패했습니다');
    },
  });

  const getStatusTag = (status: string) => {
    const statusMap = {
      DRAFT: { color: 'default', text: '임시저장' },
      SUBMITTED: { color: 'processing', text: '제출됨' },
      IN_PROGRESS: { color: 'processing', text: '진행중' },
      APPROVED: { color: 'success', text: '승인' },
      REJECTED: { color: 'error', text: '반려' },
      CANCELLED: { color: 'default', text: '취소' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ApprovalDraft) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-sm text-gray-500">{record.category?.name}</div>
        </div>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '작성일',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '제출일',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '액션',
      key: 'actions',
      width: 150,
      render: (_, record: ApprovalDraft) => (
        <Space size="small">
          <Tooltip title="상세보기">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/approval/drafts/${record.id}`)}
            />
          </Tooltip>
          
          {record.status === 'DRAFT' && (
            <>
              <Tooltip title="수정">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/approval/create?edit=${record.id}`)}
                />
              </Tooltip>
              
              <Tooltip title="삭제">
                <Popconfirm
                  title="정말 삭제하시겠습니까?"
                  onConfirm={() => deleteMutation.mutate(record.id)}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleteMutation.isPending}
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setSearchText(value);
    // TODO: 서버 사이드 검색 구현
  };

  if (!embedded) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={2} className="!mb-0">임시보관함</Title>
            <div className="text-sm text-gray-500 mt-1">
              임시저장된 문서와 회수된 문서를 관리할 수 있습니다
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/approval/create')}
          >
            새 결재 작성
          </Button>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <Space>
              <Select
                placeholder="상태 필터"
                style={{ width: 120 }}
                allowClear
                value={status || undefined}
                onChange={setStatus}
              >
                <Select.Option value="DRAFT">임시저장</Select.Option>
                <Select.Option value="SUBMITTED">제출됨</Select.Option>
                <Select.Option value="IN_PROGRESS">진행중</Select.Option>
                <Select.Option value="APPROVED">승인</Select.Option>
                <Select.Option value="REJECTED">반려</Select.Option>
              </Select>
            </Space>
            
            <Search
              placeholder="제목으로 검색"
              style={{ width: 250 }}
              onSearch={handleSearch}
              allowClear
            />
          </div>

          <Table
            columns={columns}
            dataSource={data?.data || []}
            rowKey="id"
            loading={isLoading}
            pagination={false}
            locale={{
              emptyText: <Empty description="작성한 결재 문서가 없습니다" />,
            }}
          />

          {data && data.pagination.total > 0 && (
            <div className="flex justify-center mt-4">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={data.pagination.total}
                onChange={(newPage, newPageSize) => {
                  setPage(newPage);
                  if (newPageSize) setPageSize(newPageSize);
                }}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) => 
                  `${range[0]}-${range[1]} / 총 ${total}건`
                }
              />
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Embedded mode for dashboard
  return (
    <div>
      <Spin spinning={isLoading}>
        <Table
          columns={columns.slice(0, -1)} // Remove actions column in embedded mode
          dataSource={data?.data?.slice(0, 5) || []} // Show only first 5 items
          rowKey="id"
          pagination={false}
          size="small"
          locale={{
            emptyText: <Empty description="작성한 결재 문서가 없습니다" />,
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/approval/drafts/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
        
        {data && data.pagination.total > 5 && (
          <div className="text-center mt-3">
            <Button type="link" onClick={() => navigate('/approval/drafts')}>
              전체 보기 ({data.pagination.total}건)
            </Button>
          </div>
        )}
      </Spin>
    </div>
  );
};