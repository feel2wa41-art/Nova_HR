import { Card, Table, Tag, Button, Space, Tooltip, message, Popconfirm } from 'antd';
import { 
  CalendarOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';
import { useEffect } from 'react';
import { useLeave } from '../../hooks/useLeave';
import type { ColumnsType } from 'antd/es/table';

interface LeaveRequestsListProps {
  className?: string;
}

export const LeaveRequestsList = ({ className }: LeaveRequestsListProps) => {
  const {
    leaveRequests,
    isLoading,
    fetchLeaveRequests,
    cancelLeaveRequest,
  } = useLeave();

  useEffect(() => {
    fetchLeaveRequests().catch(console.error);
  }, [fetchLeaveRequests]);

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelLeaveRequest(requestId);
      message.success('휴가 신청이 취소되었습니다');
    } catch (error: any) {
      message.error(error.message || '휴가 신청 취소에 실패했습니다');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <ClockCircleOutlined />;
      case 'APPROVED':
        return <CheckCircleOutlined />;
      case 'REJECTED':
        return <CloseCircleOutlined />;
      case 'CANCELLED':
        return <DeleteOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'processing';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '승인 대기';
      case 'APPROVED':
        return '승인됨';
      case 'REJECTED':
        return '반려됨';
      case 'CANCELLED':
        return '취소됨';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const columns: ColumnsType<any> = [
    {
      title: '휴가 종류',
      dataIndex: 'leaveTypeName',
      key: 'leaveTypeName',
      width: 100,
    },
    {
      title: '기간',
      key: 'period',
      width: 180,
      render: (_, record) => (
        <div>
          <div>{formatDate(record.startDate)}</div>
          <div className="text-gray-500 text-sm">
            ~ {formatDate(record.endDate)}
          </div>
        </div>
      ),
    },
    {
      title: '일수',
      dataIndex: 'daysCount',
      key: 'daysCount',
      width: 60,
      render: (days: number) => <span className="font-medium">{days}일</span>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record) => (
        <div>
          <Tag 
            icon={getStatusIcon(status)} 
            color={getStatusColor(status)}
          >
            {getStatusText(status)}
          </Tag>
          {record.emergency && (
            <Tag color="red" className="ml-1">
              긴급
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '신청일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (createdAt: string) => (
        <span className="text-gray-600 text-sm">
          {formatDateTime(createdAt)}
        </span>
      ),
    },
    {
      title: '사유',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string) => (
        reason ? (
          <Tooltip title={reason}>
            <span className="text-gray-600">{reason}</span>
          </Tooltip>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      title: '결재자/의견',
      key: 'approval',
      width: 150,
      render: (_, record) => (
        <div>
          {record.decidedBy && (
            <div className="text-sm">
              <div className="font-medium">{record.decidedBy}</div>
              <div className="text-gray-500">
                {formatDateTime(record.decidedAt)}
              </div>
            </div>
          )}
          {record.comments && (
            <Tooltip title={record.comments}>
              <div className="text-gray-600 text-sm mt-1 truncate">
                {record.comments}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'PENDING' && (
            <Popconfirm
              title="휴가 신청을 취소하시겠습니까?"
              description="취소된 신청은 복구할 수 없습니다."
              onConfirm={() => handleCancelRequest(record.id)}
              okText="취소"
              cancelText="아니오"
              okType="danger"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              >
                취소
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      className={className}
      title={
        <Space>
          <CalendarOutlined />
          휴가 신청 내역
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={leaveRequests}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / 총 ${total}건`,
        }}
        scroll={{ x: 800 }}
        size="small"
      />
    </Card>
  );
};