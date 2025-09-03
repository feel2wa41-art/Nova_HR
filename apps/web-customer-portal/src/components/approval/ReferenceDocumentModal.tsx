import { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Empty,
  Pagination,
  message,
} from 'antd';
import { SearchOutlined, EyeOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { approvalApi, ApprovalDraft, ApprovalCategory } from '../../lib/api';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ReferenceDocumentModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (document: ApprovalDraft) => void;
}

export const ReferenceDocumentModal = ({
  open,
  onCancel,
  onSelect,
}: ReferenceDocumentModalProps) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // 카테고리 목록 조회
  const { data: categories } = useQuery({
    queryKey: ['approval-categories'],
    queryFn: approvalApi.getCategories,
    retry: false,
  });

  // 완료된 문서 목록 조회
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['completed-documents', page, pageSize, search, categoryId, dateRange],
    queryFn: () => approvalApi.getCompletedDocuments({
      page,
      limit: pageSize,
      search: search || undefined,
      categoryId: categoryId || undefined,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
    }),
    enabled: open,
    retry: false,
  });

  // 검색 필터 초기화
  const handleReset = () => {
    setSearch('');
    setCategoryId('');
    setDateRange(null);
    setPage(1);
  };

  // 문서 선택 처리
  const handleSelectDocument = (document: ApprovalDraft) => {
    onSelect(document);
    message.success('참조 문서가 선택되었습니다');
  };

  // 상태 태그 렌더링
  const getStatusTag = (status: string) => {
    const statusMap = {
      APPROVED: { color: 'success', text: '승인완료' },
      REJECTED: { color: 'error', text: '반려' },
      IN_PROGRESS: { color: 'processing', text: '진행중' },
      SUBMITTED: { color: 'processing', text: '제출됨' },
      DRAFT: { color: 'default', text: '임시저장' },
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
          <div className="text-sm text-gray-500">
            {record.category?.name} • {record.user?.name}
          </div>
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
      title: '완료일',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '액션',
      key: 'actions',
      width: 120,
      render: (_, record: ApprovalDraft) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              // 문서 미리보기 기능 (추후 구현)
              message.info('문서 미리보기 기능은 추후 구현 예정입니다');
            }}
          />
          <Button
            type="primary"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleSelectDocument(record)}
          >
            선택
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="참조 문서 선택"
      open={open}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          취소
        </Button>,
      ]}
    >
      <div className="space-y-4">
        {/* 검색 필터 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="제목으로 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={() => {
                setPage(1);
                refetch();
              }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="카테고리"
              style={{ width: '100%' }}
              value={categoryId || undefined}
              onChange={(value) => {
                setCategoryId(value || '');
                setPage(1);
              }}
              allowClear
            >
              {categories?.map(category => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              placeholder={['시작날짜', '종료날짜']}
              style={{ width: '100%' }}
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates);
                setPage(1);
              }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button icon={<SearchOutlined />} onClick={() => refetch()}>
                검색
              </Button>
              <Button onClick={handleReset}>
                초기화
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 결과 테이블 */}
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="middle"
          locale={{
            emptyText: (
              <Empty 
                description="완료된 결재 문서가 없습니다"
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
              />
            ),
          }}
        />

        {/* 페이지네이션 */}
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

        {/* 도움말 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <Text type="secondary" className="text-sm">
            💡 <strong>참조 문서 활용 방법:</strong>
            <br />
            • 선택한 문서의 내용과 양식을 새로운 결재 문서의 참고 자료로 활용할 수 있습니다
            <br />
            • 승인 완료된 문서만 참조할 수 있습니다
            <br />
            • 참조한 내용은 필요에 따라 수정하여 사용하세요
          </Text>
        </div>
      </div>
    </Modal>
  );
};