import { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Space, Modal, Form, Input, message, Tag, Avatar, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;

interface LateRequest {
  id: string;
  userId: string;
  userName: string;
  date: string;
  lateMinutes: number;
  reason: string;
  photoData: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewComment?: string;
}

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewComment?: string;
}

export const ApprovalManagement = () => {
  const [lateRequests, setLateRequests] = useState<LateRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    // Load late requests
    const storedLateRequests = JSON.parse(localStorage.getItem('nova_hr_late_requests') || '[]');
    const lateRequestsWithNames = storedLateRequests.map((req: any) => ({
      ...req,
      id: req.userId + '_' + req.submittedAt,
      userName: getUserName(req.userId)
    }));
    setLateRequests(lateRequestsWithNames);

    // Load leave requests
    const storedLeaveRequests = JSON.parse(localStorage.getItem('nova_hr_leave_requests') || '[]');
    const leaveRequestsWithNames = storedLeaveRequests.map((req: any) => ({
      ...req,
      userName: getUserName(req.userId)
    }));
    setLeaveRequests(leaveRequestsWithNames);
  };

  const getUserName = (userId: string) => {
    const userMap: { [key: string]: string } = {
      '1': '홍길동',
      '2': '김인사',
      '3': '시스템 관리자'
    };
    return userMap[userId] || '알 수 없는 사용자';
  };

  const formatLateTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const handleReview = (request: any, type: 'late' | 'leave') => {
    setSelectedRequest({ ...request, type });
    setReviewModal(true);
    form.resetFields();
  };

  const handlePhotoView = (photoData: string) => {
    setSelectedPhoto(photoData);
    setPhotoModal(true);
  };

  const submitReview = async (values: { decision: 'APPROVED' | 'REJECTED'; comment: string }) => {
    if (!selectedRequest) return;

    try {
      const now = new Date().toISOString();
      const updatedRequest = {
        ...selectedRequest,
        status: values.decision,
        reviewedAt: now,
        reviewComment: values.comment
      };

      if (selectedRequest.type === 'late') {
        const requests = JSON.parse(localStorage.getItem('nova_hr_late_requests') || '[]');
        const updatedRequests = requests.map((req: any) => 
          req.userId === selectedRequest.userId && req.submittedAt === selectedRequest.submittedAt 
            ? updatedRequest 
            : req
        );
        localStorage.setItem('nova_hr_late_requests', JSON.stringify(updatedRequests));
      } else {
        const requests = JSON.parse(localStorage.getItem('nova_hr_leave_requests') || '[]');
        const updatedRequests = requests.map((req: any) => 
          req.id === selectedRequest.id ? updatedRequest : req
        );
        localStorage.setItem('nova_hr_leave_requests', JSON.stringify(updatedRequests));
      }

      loadRequests();
      setReviewModal(false);
      setSelectedRequest(null);
      
      message.success(`${values.decision === 'APPROVED' ? '승인' : '반려'} 처리가 완료되었습니다.`);
    } catch (error) {
      message.error('처리 중 오류가 발생했습니다.');
    }
  };

  const lateColumns: ColumnsType<LateRequest> = [
    {
      title: '신청자',
      dataIndex: 'userName',
      key: 'userName',
      render: (name) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" icon={<UserOutlined />} />
          {name}
        </div>
      ),
    },
    {
      title: '지각 일시',
      dataIndex: 'date',
      key: 'date',
      render: (date) => formatDate(date),
    },
    {
      title: '지각 시간',
      dataIndex: 'lateMinutes',
      key: 'lateMinutes',
      render: (minutes) => (
        <Tag color="orange" icon={<ClockCircleOutlined />}>
          {formatLateTime(minutes)}
        </Tag>
      ),
    },
    {
      title: '사유',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason) => (
        <Tooltip title={reason}>
          <span>{reason.length > 30 ? reason.substring(0, 30) + '...' : reason}</span>
        </Tooltip>
      ),
    },
    {
      title: '신청일',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date) => formatDateTime(date),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          'PENDING_APPROVAL': 'orange',
          'APPROVED': 'green',
          'REJECTED': 'red'
        };
        const labels = {
          'PENDING_APPROVAL': '검토대기',
          'APPROVED': '승인',
          'REJECTED': '반려'
        };
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>;
      },
    },
    {
      title: '액션',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.photoData && (
            <Button 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => handlePhotoView(record.photoData)}
            >
              사진
            </Button>
          )}
          {record.status === 'PENDING_APPROVAL' && (
            <Button 
              size="small" 
              type="primary" 
              onClick={() => handleReview(record, 'late')}
            >
              검토
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const leaveColumns: ColumnsType<LeaveRequest> = [
    {
      title: '신청자',
      dataIndex: 'userName',
      key: 'userName',
      render: (name) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" icon={<UserOutlined />} />
          {name}
        </div>
      ),
    },
    {
      title: '휴가 종류',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeLabels: { [key: string]: string } = {
          'ANNUAL': '연차',
          'SICK': '병가',
          'PERSONAL': '개인사유',
          'MATERNITY': '출산휴가',
          'PATERNITY': '육아휴가'
        };
        return <Tag>{typeLabels[type] || type}</Tag>;
      },
    },
    {
      title: '기간',
      key: 'period',
      render: (_, record) => `${formatDate(record.startDate)} ~ ${formatDate(record.endDate)}`,
    },
    {
      title: '사유',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason) => (
        <Tooltip title={reason}>
          <span>{reason.length > 30 ? reason.substring(0, 30) + '...' : reason}</span>
        </Tooltip>
      ),
    },
    {
      title: '신청일',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (date) => formatDateTime(date),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          'PENDING': 'orange',
          'APPROVED': 'green',
          'REJECTED': 'red'
        };
        const labels = {
          'PENDING': '검토대기',
          'APPROVED': '승인',
          'REJECTED': '반려'
        };
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>;
      },
    },
    {
      title: '액션',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING' && (
            <Button 
              size="small" 
              type="primary" 
              onClick={() => handleReview(record, 'leave')}
            >
              검토
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'late',
      label: `지각 승인 (${lateRequests.filter(req => req.status === 'PENDING_APPROVAL').length})`,
      children: (
        <Table
          columns={lateColumns}
          dataSource={lateRequests}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'leave',
      label: `휴가 승인 (${leaveRequests.filter(req => req.status === 'PENDING').length})`,
      children: (
        <Table
          columns={leaveColumns}
          dataSource={leaveRequests}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="승인 관리">
        <Tabs items={tabItems} />
      </Card>

      {/* Review Modal */}
      <Modal
        title={`${selectedRequest?.type === 'late' ? '지각' : '휴가'} 승인 검토`}
        open={reviewModal}
        onCancel={() => setReviewModal(false)}
        footer={null}
        width={600}
      >
        {selectedRequest && (
          <div className="space-y-4">
            {/* Request Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">신청 내용</h4>
              <div className="space-y-2">
                <div><strong>신청자:</strong> {selectedRequest.userName}</div>
                {selectedRequest.type === 'late' && (
                  <>
                    <div><strong>지각 일시:</strong> {formatDate(selectedRequest.date)}</div>
                    <div><strong>지각 시간:</strong> {formatLateTime(selectedRequest.lateMinutes)}</div>
                  </>
                )}
                {selectedRequest.type === 'leave' && (
                  <>
                    <div><strong>휴가 종류:</strong> {selectedRequest.type}</div>
                    <div><strong>기간:</strong> {formatDate(selectedRequest.startDate)} ~ {formatDate(selectedRequest.endDate)}</div>
                  </>
                )}
                <div><strong>사유:</strong> {selectedRequest.reason}</div>
                <div><strong>신청일:</strong> {formatDateTime(selectedRequest.submittedAt)}</div>
              </div>
            </div>

            {/* Review Form */}
            <Form
              form={form}
              layout="vertical"
              onFinish={submitReview}
            >
              <Form.Item
                label="검토 의견"
                name="comment"
                rules={[
                  { required: true, message: '검토 의견을 입력해주세요' },
                  { min: 5, message: '검토 의견은 5자 이상 입력해주세요' }
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="승인/반려 사유를 상세히 작성해주세요"
                  maxLength={500}
                  showCount
                />
              </Form.Item>

              <Form.Item className="mb-0">
                <Space className="w-full justify-end">
                  <Button onClick={() => setReviewModal(false)}>
                    취소
                  </Button>
                  <Button
                    type="primary"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => form.setFieldValue('decision', 'REJECTED')}
                    htmlType="submit"
                  >
                    반려
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={() => form.setFieldValue('decision', 'APPROVED')}
                    htmlType="submit"
                  >
                    승인
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Photo Modal */}
      <Modal
        title="출근 인증 사진"
        open={photoModal}
        onCancel={() => setPhotoModal(false)}
        footer={null}
        width={500}
      >
        {selectedPhoto && (
          <div className="text-center">
            <img
              src={selectedPhoto}
              alt="출근 인증"
              className="max-w-full h-auto rounded-lg"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};