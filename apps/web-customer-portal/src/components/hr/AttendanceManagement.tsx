import { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Space, Modal, Form, Input, message, Tag, Avatar, Tooltip, DatePicker, Select, Row, Col, Statistic } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, ClockCircleOutlined, UserOutlined, CalendarOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { initializeMockData, generateMockAttendanceData } from '../../utils/mockAttendanceData';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  isLate: boolean;
  lateMinutes: number;
  status: 'NORMAL' | 'LATE' | 'ABSENT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  lateReason?: string;
  photoData?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewComment?: string;
}

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

export const AttendanceManagement = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [lateRequests, setLateRequests] = useState<LateRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LateRequest | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form] = Form.useForm();

  useEffect(() => {
    // Initialize mock data if none exists
    initializeMockData();
    loadAttendanceData();
  }, []);

  const loadAttendanceData = () => {
    // Load attendance records from all users
    const mockUsers = ['1', '2', '3', '4', '5', '6'];
    const allRecords: AttendanceRecord[] = [];

    mockUsers.forEach(userId => {
      const userRecords = JSON.parse(localStorage.getItem(`nova_hr_today_attendance_${userId}`) || '[]');
      const recordsWithUserName = userRecords.map((record: any) => ({
        ...record,
        id: `${userId}_${record.date}`,
        userId,
        userName: getUserName(userId),
      }));
      allRecords.push(...recordsWithUserName);
    });

    setAttendanceRecords(allRecords);

    // Load late requests
    const storedLateRequests = JSON.parse(localStorage.getItem('nova_hr_late_requests') || '[]');
    const lateRequestsWithNames = storedLateRequests.map((req: any) => ({
      ...req,
      id: req.userId + '_' + req.submittedAt,
      userName: getUserName(req.userId)
    }));
    setLateRequests(lateRequestsWithNames);
  };

  const getUserName = (userId: string) => {
    const userMap: { [key: string]: string } = {
      '1': '홍길동',
      '2': '김인사',
      '3': '시스템 관리자',
      '4': '이개발',
      '5': '박디자인',
      '6': '최영업'
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

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReview = (request: LateRequest) => {
    setSelectedRequest(request);
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

      // Update late requests storage
      const requests = JSON.parse(localStorage.getItem('nova_hr_late_requests') || '[]');
      const updatedRequests = requests.map((req: any) => 
        req.userId === selectedRequest.userId && req.submittedAt === selectedRequest.submittedAt 
          ? updatedRequest 
          : req
      );
      localStorage.setItem('nova_hr_late_requests', JSON.stringify(updatedRequests));

      // Update attendance record if approved
      if (values.decision === 'APPROVED') {
        const userAttendance = JSON.parse(localStorage.getItem(`nova_hr_today_attendance_${selectedRequest.userId}`) || '[]');
        const updatedAttendance = userAttendance.map((record: any) => 
          record.date === selectedRequest.date 
            ? { ...record, status: 'APPROVED', lateReason: selectedRequest.reason }
            : record
        );
        localStorage.setItem(`nova_hr_today_attendance_${selectedRequest.userId}`, JSON.stringify(updatedAttendance));
      }

      loadAttendanceData();
      setReviewModal(false);
      setSelectedRequest(null);
      
      message.success(`${values.decision === 'APPROVED' ? '승인' : '반려'} 처리가 완료되었습니다.`);
    } catch (error) {
      message.error('처리 중 오류가 발생했습니다.');
    }
  };

  // Filter data based on date range and status
  const filteredAttendanceRecords = attendanceRecords.filter(record => {
    const recordDate = dayjs(record.date);
    const dateInRange = !dateRange || (recordDate.isAfter(dateRange[0]) && recordDate.isBefore(dateRange[1].add(1, 'day')));
    const statusMatch = statusFilter === 'all' || record.status === statusFilter;
    return dateInRange && statusMatch;
  });

  const filteredLateRequests = lateRequests.filter(request => {
    const requestDate = dayjs(request.date);
    const dateInRange = !dateRange || (requestDate.isAfter(dateRange[0]) && requestDate.isBefore(dateRange[1].add(1, 'day')));
    return dateInRange;
  });

  // Statistics
  const totalAttendance = filteredAttendanceRecords.length;
  const lateCount = filteredAttendanceRecords.filter(r => r.isLate).length;
  const pendingApprovals = filteredLateRequests.filter(r => r.status === 'PENDING_APPROVAL').length;
  const absentCount = filteredAttendanceRecords.filter(r => r.status === 'ABSENT').length;

  const attendanceColumns: ColumnsType<AttendanceRecord> = [
    {
      title: '사용자',
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
      title: '날짜',
      dataIndex: 'date',
      key: 'date',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: '출근 시간',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (time) => time ? formatTime(time) : '-',
    },
    {
      title: '퇴근 시간',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      render: (time) => time ? formatTime(time) : '-',
    },
    {
      title: '지각 시간',
      dataIndex: 'lateMinutes',
      key: 'lateMinutes',
      render: (minutes, record) => {
        if (!record.isLate || minutes === 0) return '-';
        return (
          <Tag color="orange" icon={<ClockCircleOutlined />}>
            {formatLateTime(minutes)}
          </Tag>
        );
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          'NORMAL': { color: 'green', label: '정상' },
          'LATE': { color: 'orange', label: '지각' },
          'ABSENT': { color: 'red', label: '결근' },
          'PENDING_APPROVAL': { color: 'blue', label: '승인대기' },
          'APPROVED': { color: 'green', label: '승인됨' },
          'REJECTED': { color: 'red', label: '반려됨' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', label: status };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
      filters: [
        { text: '정상', value: 'NORMAL' },
        { text: '지각', value: 'LATE' },
        { text: '결근', value: 'ABSENT' },
        { text: '승인대기', value: 'PENDING_APPROVAL' },
        { text: '승인됨', value: 'APPROVED' },
        { text: '반려됨', value: 'REJECTED' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '지각 사유',
      dataIndex: 'lateReason',
      key: 'lateReason',
      ellipsis: true,
      render: (reason) => {
        if (!reason) return '-';
        return (
          <Tooltip title={reason}>
            <span>{reason.length > 20 ? reason.substring(0, 20) + '...' : reason}</span>
          </Tooltip>
        );
      },
    },
  ];

  const lateRequestColumns: ColumnsType<LateRequest> = [
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
              onClick={() => handleReview(record)}
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
      key: 'attendance',
      label: `출석 현황 (${totalAttendance})`,
      children: (
        <div className="space-y-4">
          {/* Filters */}
          <Card size="small">
            <Row gutter={16} align="middle">
              <Col span={8}>
                <div className="flex items-center gap-2">
                  <CalendarOutlined />
                  <span className="font-medium">기간:</span>
                  <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    format="YYYY-MM-DD"
                    placeholder={['시작일', '종료일']}
                  />
                </div>
              </Col>
              <Col span={6}>
                <div className="flex items-center gap-2">
                  <FilterOutlined />
                  <span className="font-medium">상태:</span>
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: 'all', label: '전체' },
                      { value: 'NORMAL', label: '정상' },
                      { value: 'LATE', label: '지각' },
                      { value: 'ABSENT', label: '결근' },
                      { value: 'PENDING_APPROVAL', label: '승인대기' },
                      { value: 'APPROVED', label: '승인됨' },
                      { value: 'REJECTED', label: '반려됨' },
                    ]}
                    style={{ width: 120 }}
                  />
                </div>
              </Col>
              <Col span={10}>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      generateMockAttendanceData();
                      loadAttendanceData();
                      message.success('테스트 데이터가 생성되었습니다.');
                    }}
                  >
                    테스트 데이터 생성
                  </Button>
                  <Button
                    onClick={() => {
                      setDateRange(null);
                      setStatusFilter('all');
                    }}
                  >
                    필터 초기화
                  </Button>
                </div>
              </Col>
            </Row>
          </Card>

          <Table
            columns={attendanceColumns}
            dataSource={filteredAttendanceRecords}
            rowKey="id"
            pagination={{ 
              pageSize: 15,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
            }}
          />
        </div>
      ),
    },
    {
      key: 'late-requests',
      label: `지각 승인 (${pendingApprovals})`,
      children: (
        <Table
          columns={lateRequestColumns}
          dataSource={filteredLateRequests}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="총 출석"
              value={totalAttendance}
              suffix="건"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="지각"
              value={lateCount}
              suffix="건"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="승인 대기"
              value={pendingApprovals}
              suffix="건"
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="결근"
              value={absentCount}
              suffix="건"
              prefix={<CloseOutlined />}
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Card title="출석 관리">
        <Tabs items={tabItems} />
      </Card>

      {/* Review Modal */}
      <Modal
        title="지각 승인 검토"
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
                <div><strong>지각 일시:</strong> {formatDate(selectedRequest.date)}</div>
                <div><strong>지각 시간:</strong> {formatLateTime(selectedRequest.lateMinutes)}</div>
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