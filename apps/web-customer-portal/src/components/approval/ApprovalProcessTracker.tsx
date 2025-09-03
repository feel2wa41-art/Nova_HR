import { useState, useEffect } from 'react';
import { Card, Steps, Avatar, Tag, Tooltip, Typography, Space, Timeline, Spin } from 'antd';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  CommentOutlined,
  SendOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ApprovalStep {
  id: string;
  order: number;
  approverId: string;
  approverName: string;
  approverTitle: string;
  organizationName: string;
  type: 'COOPERATION' | 'APPROVAL' | 'REFERENCE' | 'RECEPTION' | 'CIRCULATION';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  actedAt?: string;
  comments?: string;
  isRequired: boolean;
}

interface ApprovalAction {
  id: string;
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'COMMENT';
  userId: string;
  userName: string;
  comments?: string;
  createdAt: string;
}

interface ApprovalProcessTrackerProps {
  draftId: string;
  steps: ApprovalStep[];
  actions: ApprovalAction[];
  currentStatus: 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  completedAt?: string;
}

export const ApprovalProcessTracker = ({
  draftId,
  steps,
  actions,
  currentStatus,
  submittedAt,
  completedAt
}: ApprovalProcessTrackerProps) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Calculate current active step
    const approvalSteps = steps.filter(step => step.type === 'COOPERATION' || step.type === 'APPROVAL');
    const currentIndex = approvalSteps.findIndex(step => step.status === 'PENDING');
    setActiveStep(currentIndex >= 0 ? currentIndex : approvalSteps.length);
  }, [steps]);

  const getStepStatus = (step: ApprovalStep) => {
    switch (step.status) {
      case 'APPROVED':
        return 'finish';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'process';
      default:
        return 'wait';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'COOPERATION':
        return 'orange';
      case 'APPROVAL':
        return 'green';
      case 'REFERENCE':
        return 'blue';
      case 'RECEPTION':
        return 'purple';
      case 'CIRCULATION':
        return 'cyan';
      default:
        return 'default';
    }
  };

  const getTypeTitle = (type: string) => {
    switch (type) {
      case 'COOPERATION':
        return '협조';
      case 'APPROVAL':
        return '결재';
      case 'REFERENCE':
        return '참조';
      case 'RECEPTION':
        return '수신';
      case 'CIRCULATION':
        return '공람';
      default:
        return type;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'SUBMIT':
        return <SendOutlined className="text-blue-500" />;
      case 'APPROVE':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'REJECT':
        return <CloseCircleOutlined className="text-red-500" />;
      case 'COMMENT':
        return <CommentOutlined className="text-gray-500" />;
      default:
        return <ClockCircleOutlined className="text-gray-400" />;
    }
  };

  const getActionTitle = (action: string) => {
    switch (action) {
      case 'SUBMIT':
        return '제출';
      case 'APPROVE':
        return '승인';
      case 'REJECT':
        return '반려';
      case 'COMMENT':
        return '의견';
      default:
        return action;
    }
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

  // Filter steps by type for display
  const approvalSteps = steps.filter(step => step.type === 'COOPERATION' || step.type === 'APPROVAL');
  const notificationSteps = steps.filter(step => ['REFERENCE', 'RECEPTION', 'CIRCULATION'].includes(step.type));

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card size="small" className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <Title level={5} className="mb-1">결재 진행 상황</Title>
            <Text type="secondary">
              {currentStatus === 'DRAFT' && '임시저장'}
              {currentStatus === 'SUBMITTED' && '제출됨'}
              {currentStatus === 'IN_PROGRESS' && '결재 진행중'}
              {currentStatus === 'APPROVED' && '승인완료'}
              {currentStatus === 'REJECTED' && '반려됨'}
            </Text>
          </div>
          <div className="text-right">
            {submittedAt && (
              <div className="text-sm text-gray-500">
                제출일: {formatDate(submittedAt)}
              </div>
            )}
            {completedAt && (
              <div className="text-sm text-gray-500">
                완료일: {formatDate(completedAt)}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Approval Flow */}
      {approvalSteps.length > 0 && (
        <Card title="결재 흐름" size="small">
          <Steps
            current={activeStep}
            status={currentStatus === 'REJECTED' ? 'error' : 'process'}
            direction="horizontal"
            items={approvalSteps.map((step, index) => ({
              title: (
                <div className="text-center">
                  <div className="font-medium">{step.approverName}</div>
                  <div className="text-xs text-gray-500">{step.approverTitle}</div>
                  <Tag color={getTypeColor(step.type)} className="mt-1">
                    {getTypeTitle(step.type)}
                  </Tag>
                </div>
              ),
              description: step.actedAt ? (
                <div className="text-center">
                  <div className="text-xs text-gray-500">
                    {formatDate(step.actedAt)}
                  </div>
                  {step.comments && (
                    <Tooltip title={step.comments}>
                      <CommentOutlined className="text-blue-500 ml-1" />
                    </Tooltip>
                  )}
                </div>
              ) : (
                step.status === 'PENDING' && (
                  <div className="text-center text-xs text-orange-500">
                    결재 대기중
                  </div>
                )
              ),
              icon: step.status === 'APPROVED' ? (
                <CheckCircleOutlined className="text-green-500" />
              ) : step.status === 'REJECTED' ? (
                <CloseCircleOutlined className="text-red-500" />
              ) : step.status === 'PENDING' ? (
                <ClockCircleOutlined className="text-orange-500" />
              ) : (
                <Avatar size="small" icon={<UserOutlined />} />
              ),
              status: getStepStatus(step)
            }))}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action History */}
        <Card title="진행 이력" size="small">
          <Timeline
            items={actions.map(action => ({
              dot: getActionIcon(action.action),
              children: (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {action.userName} - {getActionTitle(action.action)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(action.createdAt)}
                    </span>
                  </div>
                  {action.comments && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                      {action.comments}
                    </div>
                  )}
                </div>
              )
            }))}
          />
        </Card>

        {/* Notification Recipients */}
        {notificationSteps.length > 0 && (
          <Card title="알림 대상자" size="small">
            <div className="space-y-3">
              {['REFERENCE', 'RECEPTION', 'CIRCULATION'].map(type => {
                const typeSteps = notificationSteps.filter(step => step.type === type);
                if (typeSteps.length === 0) return null;

                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag color={getTypeColor(type)}>
                        {getTypeTitle(type)}
                      </Tag>
                      <Text strong className="text-sm">
                        ({typeSteps.length}명)
                      </Text>
                    </div>
                    <div className="ml-4 space-y-1">
                      {typeSteps.map(step => (
                        <div key={step.id} className="flex items-center gap-2">
                          <Avatar size="small" icon={<UserOutlined />} />
                          <div>
                            <span className="text-sm font-medium">{step.approverName}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {step.approverTitle} • {step.organizationName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Progress Summary */}
      <Card size="small" className="bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircleOutlined className="text-green-500" />
              <span>승인: {steps.filter(s => s.status === 'APPROVED').length}명</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockCircleOutlined className="text-orange-500" />
              <span>대기: {steps.filter(s => s.status === 'PENDING').length}명</span>
            </div>
            {steps.some(s => s.status === 'REJECTED') && (
              <div className="flex items-center gap-1">
                <CloseCircleOutlined className="text-red-500" />
                <span>반려: {steps.filter(s => s.status === 'REJECTED').length}명</span>
              </div>
            )}
          </div>
          <div>
            <Text type="secondary">
              전체 {steps.length}명 중 {steps.filter(s => s.status !== 'PENDING').length}명 처리완료
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};