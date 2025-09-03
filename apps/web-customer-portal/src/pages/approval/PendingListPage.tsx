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
  Input,
  Avatar,
  Tooltip,
  Empty,
  Spin,
} from 'antd';
import {
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { approvalApi, ApprovalDraft } from '../../lib/api';

const { Title } = Typography;
const { Search } = Input;

interface PendingListPageProps {
  embedded?: boolean;
}

export const PendingListPage = ({ embedded = false }: PendingListPageProps) => {
  const navigate = useNavigate();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals', page, pageSize],
    queryFn: () => approvalApi.getPendingApprovals({
      page,
      limit: pageSize,
    }),
    retry: 1,
  });

  const getUrgencyTag = (submittedAt: string) => {
    const daysDiff = dayjs().diff(dayjs(submittedAt), 'day');
    if (daysDiff >= 3) {
      return <Tag color="red">긴급</Tag>;
    } else if (daysDiff >= 1) {
      return <Tag color="orange">주의</Tag>;
    }
    return null;
  };

  const columns = [
    {
      title: '신청자',
      dataIndex: 'user',
      key: 'user',
      width: 120,
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
      title: '제출일',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 120,
      render: (date: string) => (
        <div>
          <div>{dayjs(date).format('MM-DD')}</div>
          <div className="text-xs text-gray-500">
            {dayjs(date).format('HH:mm')}
          </div>
        </div>
      ),
    },
    {
      title: '긴급도',
      dataIndex: 'submitted_at',
      key: 'urgency',
      width: 80,
      render: (submittedAt: string) => getUrgencyTag(submittedAt),
    },
    {
      title: '액션',
      key: 'actions',
      width: 120,
      render: (_, record: ApprovalDraft) => (
        <Space size="small">
          <Tooltip title="상세보기/결재">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/approval/drafts/${record.id}`)}
            >
              결재
            </Button>
          </Tooltip>
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
          <Title level={2} className="!mb-0">결재 대기함</Title>
        </div>

        <Card>
          <div className="flex justify-end items-center mb-4">
            <Search
              placeholder="제목이나 신청자로 검색"
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
              emptyText: <Empty description="결재 대기 중인 문서가 없습니다" />,
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
            emptyText: <Empty description="결재 대기 중인 문서가 없습니다" />,
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/approval/drafts/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
        
        {data && data.pagination.total > 5 && (
          <div className="text-center mt-3">
            <Button type="link" onClick={() => navigate('/approval/pending')}>
              전체 보기 ({data.pagination.total}건)
            </Button>
          </div>
        )}
      </Spin>
    </div>
  );
};