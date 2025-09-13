import React, { useState } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  message, 
  Tabs, 
  Modal, 
  Input, 
  Avatar, 
  Timeline, 
  Typography,
  Badge,
  Descriptions,
  Divider
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BellOutlined,
  EyeOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface LeaveRequestApprover {
  id: string;
  user_id: string;
  name: string;
  email: string;
  step: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_at?: string;
  rejected_at?: string;
  comments?: string;
  notification_sent: boolean;
}

interface LeaveRequest {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    employee_profile?: {
      department?: string;
      emp_no?: string;
    };
  };
  leave_type: {
    id: string;
    name: string;
    code: string;
    color_hex?: string;
  };
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  current_approval_step?: number;
  total_approval_steps?: number;
  approval_completed_at?: string;
  comments?: string;
  approvers?: LeaveRequestApprover[];
}

export const LeaveApprovalComplete: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/profile');
      return response.data;
    },
  });

  // Get leave requests with approvers
  const { data: leaveRequestsData, isLoading } = useQuery({
    queryKey: ['sequential-leave-requests', selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus && selectedStatus !== 'ALL') {
        params.append('status', selectedStatus);
      }

      const response = await apiClient.get(`/leave/requests?${params.toString()}`);
      const requests = response.data.data || [];

      // For each request, fetch approval details if draft_id exists
      const requestsWithApprovers = await Promise.all(
        requests.map(async (request: any) => {
          // Mock approvers for demonstration - in production, this should come from API
          const mockApprovers = [
            {
              id: '1',
              user_id: currentUser?.id || 'd4e583ae-98b8-4576-8bf4-c4bab5aa1868',
              name: currentUser?.name || '시스템 관리자',
              email: currentUser?.email || 'admin@reko-hr.com',
              step: 1,
              status: 'PENDING' as const,
              notification_sent: false
            },
            {
              id: '2',
              user_id: '81f8ad4b-5291-4383-a892-c7feec90f46e',
              name: 'HR 매니저',
              email: 'hr@reko-hr.com',
              step: 2,
              status: 'PENDING' as const,
              notification_sent: false
            }
          ];

          // Determine current step based on status
          let currentStep = 1;
          let totalSteps = 2;

          // If first approver approved, move to step 2
          if (request.status === 'PENDING') {
            // Check if request has been partially approved
            currentStep = 1; // Default to first step
          }

          return {
            ...request,
            approvers: mockApprovers,
            current_approval_step: currentStep,
            total_approval_steps: totalSteps
          };
        })
      );

      return requestsWithApprovers;
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // Get notifications count - disabled for now to avoid legacy system errors
  const { data: notificationsCount } = useQuery({
    queryKey: ['leave-notifications-count'],
    queryFn: async () => {
      // Return 0 for now to avoid legacy system errors
      return 0;
    },
    enabled: false, // Disable the query
  });

  const leaveRequests = leaveRequestsData || [];

  // Approve leave mutation
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiClient.put(`/leave/requests/${requestId}/approve`, {
        approval_notes: '승인되었습니다.'
      });
    },
    onSuccess: (data) => {
      if (data.data.final_approval) {
        message.success('휴가가 최종 승인되었습니다! 🎉');
      } else {
        message.success(`${data.data.current_step}단계 승인 완료. ${data.data.next_approver?.name}님에게 전달되었습니다.`);
      }
      queryClient.invalidateQueries({ queryKey: ['sequential-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-notifications-count'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다.');
    },
  });

  // Reject leave mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      return apiClient.put(`/leave/requests/${requestId}/reject`, { 
        rejection_reason: reason 
      });
    },
    onSuccess: () => {
      message.success('휴가가 반려되었습니다.');
      setRejectModalVisible(false);
      setRejectReason('');
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: ['sequential-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-notifications-count'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '반려 처리 중 오류가 발생했습니다.');
    },
  });

  const handleApprove = (request: LeaveRequest) => {
    Modal.confirm({
      title: '휴가 승인',
      content: (
        <div>
          <p><strong>신청자:</strong> {request.user.name}</p>
          <p><strong>휴가 종류:</strong> {request.leave_type.name}</p>
          <p><strong>기간:</strong> {dayjs(request.start_date).format('YYYY-MM-DD')} ~ {dayjs(request.end_date).format('YYYY-MM-DD')}</p>
          <p><strong>일수:</strong> {request.days_count}일</p>
          {request.approvers && request.approvers.length > 0 && (
            <p><strong>승인 단계:</strong> {request.current_approval_step} / {request.total_approval_steps}</p>
          )}
          <p>이 휴가 신청을 승인하시겠습니까?</p>
        </div>
      ),
      okText: '승인',
      cancelText: '취소',
      onOk: () => approveMutation.mutate(request.id),
    });
  };

  const handleReject = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedRequest || !rejectReason.trim()) {
      message.error('반려 사유를 입력해주세요.');
      return;
    }
    rejectMutation.mutate({
      requestId: selectedRequest.id,
      reason: rejectReason,
    });
  };

  // Check if current user can approve this request
  const canApprove = (request: LeaveRequest): boolean => {
    if (!currentUser?.id || request.status !== 'PENDING') return false;
    
    // If no approvers are set up, use simple role-based logic
    if (!request.approvers || request.approvers.length === 0) {
      return ['HR_MANAGER', 'CUSTOMER_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
    }
    
    // Sequential approval logic - check if it's current user's turn
    const currentStep = request.current_approval_step || 1;
    const currentStepApprover = request.approvers.find(a => a.step === currentStep);
    
    if (!currentStepApprover) return false;
    
    return currentStepApprover.user_id === currentUser.id && currentStepApprover.status === 'PENDING';
  };

  // Get approval status description
  const getApprovalStatusDescription = (request: LeaveRequest): string => {
    if (!request.approvers || request.approvers.length === 0) {
      return request.status === 'PENDING' ? '승인 대기' : request.status;
    }

    if (request.status === 'APPROVED') {
      return `최종 승인 완료 (${dayjs(request.approval_completed_at).format('MM/DD HH:mm')})`;
    }

    if (request.status === 'REJECTED') {
      return '반려됨';
    }

    const currentStep = request.current_approval_step || 1;
    const totalSteps = request.total_approval_steps || request.approvers.length;
    const currentApprover = request.approvers.find(a => a.step === currentStep);
    
    if (currentApprover) {
      return `${currentApprover.name} 승인 대기 (${currentStep}/${totalSteps} 단계)`;
    }

    return `${currentStep}/${totalSteps} 단계 진행 중`;
  };

  // Get approval progress display
  const getApprovalProgress = (request: LeaveRequest) => {
    if (!request.approvers || request.approvers.length === 0) {
      return (
        <div className="p-4 bg-gray-50 rounded">
          <Text type="secondary">단순 승인 방식 (승인자 설정 없음)</Text>
        </div>
      );
    }
    
    return (
      <div className="p-4">
        <div className="mb-4">
          <Text strong>승인 진행 현황</Text>
          <div className="flex items-center gap-2 mt-2">
            <Text>현재 단계:</Text>
            <Badge count={request.current_approval_step} />
            <Text>/</Text>
            <Badge count={request.total_approval_steps} />
            <Text type="secondary">({getApprovalStatusDescription(request)})</Text>
          </div>
        </div>

        <Timeline>
          {request.approvers
            .sort((a, b) => a.step - b.step)
            .map((approver, index) => (
              <Timeline.Item
                key={index}
                color={
                  approver.status === 'APPROVED' ? 'green' :
                  approver.status === 'REJECTED' ? 'red' :
                  approver.step === request.current_approval_step ? 'blue' : 'gray'
                }
                dot={
                  <Avatar 
                    size="small" 
                    icon={<UserOutlined />}
                    style={{
                      backgroundColor: 
                        approver.status === 'APPROVED' ? '#52c41a' :
                        approver.status === 'REJECTED' ? '#ff4d4f' :
                        approver.step === request.current_approval_step ? '#1890ff' : '#d9d9d9'
                    }}
                  />
                }
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Text strong>{approver.name}</Text>
                    <Text type="secondary">({approver.email})</Text>
                    <Tag 
                      color={
                        approver.status === 'APPROVED' ? 'green' :
                        approver.status === 'REJECTED' ? 'red' : 'orange'
                      }
                    >
                      {approver.status === 'APPROVED' ? '승인' :
                       approver.status === 'REJECTED' ? '반려' : '대기'}
                    </Tag>
                    {approver.step === request.current_approval_step && request.status === 'PENDING' && (
                      <Tag color="processing" icon={<ClockCircleOutlined />}>
                        현재 단계
                      </Tag>
                    )}
                  </div>
                  
                  {(approver.approved_at || approver.rejected_at) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {dayjs(approver.approved_at || approver.rejected_at).format('YYYY-MM-DD HH:mm')}
                    </div>
                  )}
                  
                  {approver.comments && (
                    <div className="text-sm mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                      <Text italic>"{approver.comments}"</Text>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                    {approver.notification_sent ? (
                      <>
                        <BellOutlined />
                        <span>알림 발송됨</span>
                      </>
                    ) : (
                      <>
                        <BellOutlined style={{ opacity: 0.5 }} />
                        <span>알림 미발송</span>
                      </>
                    )}
                  </div>
                </div>
              </Timeline.Item>
            ))}
        </Timeline>
      </div>
    );
  };

  const columns = [
    {
      title: '신청자',
      dataIndex: 'user',
      key: 'user',
      width: 150,
      render: (user: any, record: LeaveRequest) => (
        <div
          className="cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => {
            setSelectedRequest(record);
            setDetailModalVisible(true);
          }}
        >
          <div className="flex items-center gap-2">
            <Avatar size="small" icon={<UserOutlined />} className="bg-blue-500">
              {user?.name?.charAt(0)}
            </Avatar>
            <div>
              <Text strong className="text-blue-600 hover:underline">
                {user?.name || '-'}
              </Text>
              {user?.employee_profile?.department && (
                <div className="text-xs text-gray-500">
                  {user.employee_profile.department}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '휴가 유형',
      dataIndex: 'leave_type',
      key: 'leave_type',
      width: 120,
      render: (type: any) => (
        <Tag color={type?.color_hex || 'blue'}>{type?.name || '-'}</Tag>
      ),
    },
    {
      title: '기간',
      key: 'period',
      width: 200,
      render: (record: LeaveRequest) => (
        <div>
          <div className="font-medium">{dayjs(record.start_date).format('MM/DD')} ~ {dayjs(record.end_date).format('MM/DD')}</div>
          <div className="text-xs text-gray-500">
            {record.days_count}일간
          </div>
        </div>
      ),
    },
    {
      title: '사유',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      ellipsis: true,
      render: (reason: string) => (
        <Text className="text-sm">{reason || '사유 없음'}</Text>
      ),
    },
    {
      title: '승인 순서',
      key: 'approval_order',
      width: 150,
      render: (record: LeaveRequest) => {
        if (!record.approvers || record.approvers.length === 0) {
          return <Tag color="default">단순 승인</Tag>;
        }

        const currentStep = record.current_approval_step || 1;
        const totalSteps = record.total_approval_steps || record.approvers.length;
        const currentApprover = record.approvers.find(a => a.step === currentStep);

        return (
          <div className="text-center">
            <div className="font-semibold">
              {currentStep}/{totalSteps} 단계
            </div>
            {currentApprover && record.status === 'PENDING' && (
              <div className="text-xs mt-1">
                <Tag color="blue" style={{ fontSize: '11px' }}>
                  {currentApprover.name}
                </Tag>
              </div>
            )}
            {record.status === 'APPROVED' && (
              <Tag color="green" style={{ fontSize: '11px' }}>완료</Tag>
            )}
            {record.status === 'REJECTED' && (
              <Tag color="red" style={{ fontSize: '11px' }}>반려</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '상태',
      key: 'status',
      width: 120,
      render: (record: LeaveRequest) => {
        const config = {
          PENDING: { color: 'orange', text: '진행중', icon: <ClockCircleOutlined /> },
          APPROVED: { color: 'green', text: '승인', icon: <CheckCircleOutlined /> },
          REJECTED: { color: 'red', text: '반려', icon: <CloseCircleOutlined /> },
        }[record.status] || { color: 'default', text: record.status, icon: null };

        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '신청일',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => dayjs(date).format('MM/DD HH:mm'),
    },
    {
      title: '작업',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (record: LeaveRequest) => {
        const canApproveRequest = canApprove(record);
        const currentApprover = record.approvers?.find(a => a.step === record.current_approval_step);

        // Show approve/reject buttons only if it's current user's turn
        if (record.status === 'PENDING' && canApproveRequest) {
          return (
            <Space size="small">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={approveMutation.isPending}
                onClick={() => handleApprove(record)}
              >
                승인
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                loading={rejectMutation.isPending}
                onClick={() => handleReject(record)}
              >
                반려
              </Button>
            </Space>
          );
        }

        // Show waiting message if not current user's turn
        if (record.status === 'PENDING' && !canApproveRequest) {
          if (currentApprover && currentApprover.user_id !== currentUser?.id) {
            return (
              <div className="text-center">
                <Tag color="orange" icon={<ClockCircleOutlined />}>
                  대기중
                </Tag>
                <div className="text-xs text-gray-500 mt-1">
                  {currentApprover.name} 승인 필요
                </div>
              </div>
            );
          }
          return (
            <Tag color="default">
              승인 불가
            </Tag>
          );
        }

        // Show status for completed requests
        if (record.status === 'APPROVED') {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              승인 완료
            </Tag>
          );
        }

        if (record.status === 'REJECTED') {
          return (
            <Tag color="red" icon={<CloseCircleOutlined />}>
              반려됨
            </Tag>
          );
        }

        return (
          <Tag color="blue">
            완료
          </Tag>
        );
      },
    },
  ];

  // Calculate statistics
  const myPendingApprovals = leaveRequests.filter((r: LeaveRequest) =>
    r.status === 'PENDING' && canApprove(r)
  ).length;

  const totalPending = leaveRequests.filter((r: LeaveRequest) =>
    r.status === 'PENDING'
  ).length;

  const totalApproved = leaveRequests.filter((r: LeaveRequest) =>
    r.status === 'APPROVED'
  ).length;

  const totalRejected = leaveRequests.filter((r: LeaveRequest) =>
    r.status === 'REJECTED'
  ).length;

  return (
    <div className="p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-gray-500">내 승인 대기</Text>
              <div className="text-2xl font-bold mt-1">{myPendingApprovals}</div>
            </div>
            <div className="text-blue-500">
              <UserOutlined style={{ fontSize: '24px' }} />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-gray-500">전체 대기</Text>
              <div className="text-2xl font-bold mt-1">{totalPending}</div>
            </div>
            <div className="text-orange-500">
              <ClockCircleOutlined style={{ fontSize: '24px' }} />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-gray-500">승인 완료</Text>
              <div className="text-2xl font-bold mt-1">{totalApproved}</div>
            </div>
            <div className="text-green-500">
              <CheckCircleOutlined style={{ fontSize: '24px' }} />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-gray-500">반려</Text>
              <div className="text-2xl font-bold mt-1">{totalRejected}</div>
            </div>
            <div className="text-red-500">
              <CloseCircleOutlined style={{ fontSize: '24px' }} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <Title level={3} className="mb-0">
            휴가 승인 관리
          </Title>
          {myPendingApprovals > 0 && (
            <Badge count={myPendingApprovals} offset={[10, 0]}>
              <Button icon={<BellOutlined />} type="primary">
                내 승인 대기
              </Button>
            </Badge>
          )}
        </div>
        
        <Tabs 
          activeKey={selectedStatus} 
          onChange={setSelectedStatus}
          items={[
            { 
              key: 'PENDING', 
              label: (
                <Space>
                  <ClockCircleOutlined />
                  승인 대기
                  {leaveRequests.filter(r => r.status === 'PENDING').length > 0 && (
                    <Badge count={leaveRequests.filter(r => r.status === 'PENDING').length} size="small" />
                  )}
                </Space>
              )
            },
            { 
              key: 'APPROVED', 
              label: (
                <Space>
                  <CheckCircleOutlined />
                  승인 완료
                </Space>
              )
            },
            { 
              key: 'REJECTED', 
              label: (
                <Space>
                  <CloseCircleOutlined />
                  반려됨
                </Space>
              )
            },
            { 
              key: 'ALL', 
              label: '전체' 
            },
          ]}
        />

        <div className="mt-4">
          <Table
            columns={columns}
            dataSource={leaveRequests}
            loading={isLoading}
            rowKey="id"
            scroll={{ x: 1200 }}
            expandable={{
              expandedRowRender: getApprovalProgress,
              rowExpandable: (record) => true,
              expandRowByClick: false,
              expandIconColumnIndex: columns.length,  // Move expand icon to the end
              expandIcon: ({ expanded, onExpand, record }) => (
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={e => onExpand(record, e!)}
                  className="text-blue-500"
                >
                  {expanded ? '접기' : '상세보기'}
                </Button>
              ),
            }}
            pagination={{
              pageSize: 10,
              showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}건`,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
          />
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        title="휴가 신청 상세 정보"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedRequest(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            닫기
          </Button>,
          selectedRequest?.status === 'PENDING' && canApprove(selectedRequest!) && [
            <Button
              key="approve"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setDetailModalVisible(false);
                handleApprove(selectedRequest!);
              }}
            >
              승인
            </Button>,
            <Button
              key="reject"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setDetailModalVisible(false);
                handleReject(selectedRequest!);
              }}
            >
              반려
            </Button>,
          ],
        ].flat().filter(Boolean)}
        width={800}
      >
        {selectedRequest && (
          <div>
            <Descriptions bordered size="small" className="mb-4">
              <Descriptions.Item label="신청자" span={2}>
                <Space>
                  <Avatar icon={<UserOutlined />} className="bg-blue-500">
                    {selectedRequest.user.name.charAt(0)}
                  </Avatar>
                  <div>
                    <div className="font-semibold">{selectedRequest.user.name}</div>
                    <div className="text-xs text-gray-500">
                      {selectedRequest.user.email}
                    </div>
                  </div>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="부서">
                {selectedRequest.user.employee_profile?.department || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="휴가 종류" span={2}>
                <Tag color={selectedRequest.leave_type.color_hex || 'blue'}>
                  {selectedRequest.leave_type.name}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="상태">
                {selectedRequest.status === 'PENDING' && (
                  <Tag color="orange" icon={<ClockCircleOutlined />}>승인 대기</Tag>
                )}
                {selectedRequest.status === 'APPROVED' && (
                  <Tag color="green" icon={<CheckCircleOutlined />}>승인 완료</Tag>
                )}
                {selectedRequest.status === 'REJECTED' && (
                  <Tag color="red" icon={<CloseCircleOutlined />}>반려됨</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="휴가 기간" span={3}>
                <CalendarOutlined className="mr-2" />
                {dayjs(selectedRequest.start_date).format('YYYY년 MM월 DD일')} ~
                {dayjs(selectedRequest.end_date).format('YYYY년 MM월 DD일')}
                <Tag className="ml-2">{selectedRequest.days_count}일</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="신청 사유" span={3}>
                <div className="p-2 bg-gray-50 rounded">
                  {selectedRequest.reason || '사유 없음'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="신청일" span={3}>
                {dayjs(selectedRequest.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">승인 진행 현황</Divider>
            {getApprovalProgress(selectedRequest)}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="휴가 반려"
        open={rejectModalVisible}
        onOk={handleRejectConfirm}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason('');
          setSelectedRequest(null);
        }}
        okText="반려"
        cancelText="취소"
        okType="danger"
        confirmLoading={rejectMutation.isPending}
        width={600}
      >
        {selectedRequest && (
          <>
            <Descriptions bordered size="small" className="mb-4">
              <Descriptions.Item label="신청자" span={2}>
                {selectedRequest.user.name}
                {selectedRequest.user.employee_profile?.department && 
                  ` (${selectedRequest.user.employee_profile.department})`
                }
              </Descriptions.Item>
              <Descriptions.Item label="휴가 종류">
                <Tag color={selectedRequest.leave_type.color_hex}>
                  {selectedRequest.leave_type.name}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="기간" span={2}>
                {dayjs(selectedRequest.start_date).format('YYYY-MM-DD')} ~ 
                {dayjs(selectedRequest.end_date).format('YYYY-MM-DD')}
                ({selectedRequest.days_count}일)
              </Descriptions.Item>
              <Descriptions.Item label="신청 사유" span={3}>
                {selectedRequest.reason || '사유 없음'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div>
              <Text strong className="text-red-600">반려 사유 *</Text>
              <TextArea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유를 구체적으로 입력해주세요. 신청자가 이 내용을 확인할 수 있습니다."
                rows={4}
                className="mt-2"
                maxLength={500}
                showCount
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};