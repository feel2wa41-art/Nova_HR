import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Timeline,
  Avatar,
  Input,
  message,
  Spin,
  Alert,
  Modal,
  Form,
  Divider,
  Empty,
  Tooltip,
  App,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { approvalApi, ApprovalDraft, ApprovalAction } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { ApprovalRouteModal } from '../../components/approval/ApprovalRouteModal';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const DraftDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { modal } = App.useApp();
  const [commentForm] = Form.useForm();
  
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'comment'>('comment');
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [approvalRoute, setApprovalRoute] = useState<any>(null);

  // 결재 문서 상세 조회
  const { data: draft, isLoading } = useQuery({
    queryKey: ['approval-draft', id],
    queryFn: () => approvalApi.getDraft(id!),
    enabled: !!id,
  });

  // 승인 뮤테이션
  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) =>
      approvalApi.approveDraft(id, { comments }),
    onSuccess: () => {
      message.success('결재가 승인되었습니다');
      queryClient.invalidateQueries({ queryKey: ['approval-draft', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      setShowCommentModal(false);
      commentForm.resetFields();
    },
    onError: () => {
      message.error('승인 처리에 실패했습니다');
    },
  });

  // 반려 뮤테이션
  const rejectMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) =>
      approvalApi.rejectDraft(id, { comments }),
    onSuccess: () => {
      message.success('결재가 반려되었습니다');
      queryClient.invalidateQueries({ queryKey: ['approval-draft', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      setShowCommentModal(false);
      commentForm.resetFields();
    },
    onError: () => {
      message.error('반려 처리에 실패했습니다');
    },
  });

  // 댓글 뮤테이션
  const commentMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) =>
      approvalApi.addComment(id, { comments }),
    onSuccess: () => {
      message.success('댓글이 추가되었습니다');
      queryClient.invalidateQueries({ queryKey: ['approval-draft', id] });
      setShowCommentModal(false);
      commentForm.resetFields();
    },
    onError: () => {
      message.error('댓글 추가에 실패했습니다');
    },
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: approvalApi.deleteDraft,
    onSuccess: () => {
      message.success('문서가 삭제되었습니다');
      navigate('/approval/drafts');
    },
    onError: () => {
      message.error('문서 삭제에 실패했습니다');
    },
  });

  // 제출 뮤테이션
  const submitMutation = useMutation({
    mutationFn: ({ draftId, routeData }: { draftId: string; routeData: any }) => {
      if (!routeData || !routeData.steps || routeData.steps.length === 0) {
        throw new Error('결재선을 설정해주세요');
      }

      // approvalRoute.steps를 API에서 요구하는 형태로 변환
      const customRoute = routeData.steps.map((step: any) => ({
        type: step.type,
        mode: step.type === 'APPROVAL' ? 'SEQUENTIAL' : 'PARALLEL',
        rule: 'ALL',
        name: step.type === 'COOPERATION' ? '협조' : 
              step.type === 'APPROVAL' ? '결재' :
              step.type === 'REFERENCE' ? '참조' :
              step.type === 'RECEPTION' ? '수신' :
              step.type === 'CIRCULATION' ? '공람' : step.type,
        approvers: [{
          userId: step.approverId,
          isRequired: step.isRequired || step.type === 'APPROVAL'
        }]
      }));

      return approvalApi.submitDraft(draftId, {
        customRoute,
        comments: '결재 요청드립니다.',
      });
    },
    onSuccess: () => {
      message.success('결재가 제출되었습니다');
      queryClient.invalidateQueries({ queryKey: ['approval-draft', id] });
      queryClient.invalidateQueries({ queryKey: ['my-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      setShowRouteModal(false);
      setApprovalRoute(null);
    },
    onError: (error: any) => {
      message.error(error?.message || '결재 제출에 실패했습니다');
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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'SUBMIT':
        return <SendOutlined className="text-blue-500" />;
      case 'APPROVE':
        return <CheckOutlined className="text-green-500" />;
      case 'REJECT':
        return <CloseOutlined className="text-red-500" />;
      case 'COMMENT':
        return <MessageOutlined className="text-gray-500" />;
      default:
        return <ClockCircleOutlined className="text-gray-500" />;
    }
  };

  const handleAction = (type: 'approve' | 'reject' | 'comment') => {
    setActionType(type);
    setShowCommentModal(true);
  };

  const handleCommentSubmit = async () => {
    try {
      const values = await commentForm.validateFields();
      const comments = values.comments || '';

      if (!id) return;

      switch (actionType) {
        case 'approve':
          await approveMutation.mutateAsync({ id, comments });
          break;
        case 'reject':
          if (!comments.trim()) {
            message.error('반려 사유를 입력해주세요');
            return;
          }
          await rejectMutation.mutateAsync({ id, comments });
          break;
        case 'comment':
          if (!comments.trim()) {
            message.error('댓글을 입력해주세요');
            return;
          }
          await commentMutation.mutateAsync({ id, comments });
          break;
      }
    } catch (error) {
      // Form validation errors handled by Ant Design
    }
  };

  const handleDelete = () => {
    modal.confirm({
      title: '문서 삭제',
      content: '정말 이 문서를 삭제하시겠습니까? 삭제된 문서는 복구할 수 없습니다.',
      icon: <ExclamationCircleOutlined />,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => {
        if (id) {
          deleteMutation.mutate(id);
        }
      },
    });
  };

  const handleSubmit = () => {
    // content에 저장된 결재선 정보 확인
    const savedRoute = draft?.content?.__approvalRoute;
    
    // 결재선이 설정되어 있는지 확인 (우선순위: content.__approvalRoute > route.stages)
    if (savedRoute?.steps && savedRoute.steps.length > 0) {
      // content에 저장된 결재선이 있으면 바로 제출
      modal.confirm({
        title: '결재 제출',
        content: '이 문서를 결재 요청하시겠습니까? 제출 후에는 수정할 수 없습니다.',
        icon: <ExclamationCircleOutlined />,
        okText: '제출',
        cancelText: '취소',
        onOk: () => {
          if (id) {
            submitMutation.mutate({ draftId: id, routeData: savedRoute });
          }
        },
      });
    } else if (draft?.route?.stages && draft.route.stages.length > 0) {
      // 이미 결재선이 있으면 바로 제출
      modal.confirm({
        title: '결재 제출',
        content: '이 문서를 결재 요청하시겠습니까? 제출 후에는 수정할 수 없습니다.',
        icon: <ExclamationCircleOutlined />,
        okText: '제출',
        cancelText: '취소',
        onOk: () => {
          if (id && draft.route) {
            const routeData = {
              steps: draft.route.stages.map((stage: any) => {
                const approver = stage.approvers?.[0];
                return approver ? {
                  type: stage.type,
                  approverId: approver.user_id,
                  approverName: approver.user?.name || approver.user_id,
                  isRequired: stage.type === 'APPROVAL'
                } : null;
              }).filter(Boolean)
            };
            submitMutation.mutate({ draftId: id, routeData });
          }
        },
      });
    } else {
      // 결재선이 없으면 설정 모달 열기
      setShowRouteModal(true);
    }
  };

  const handleRouteComplete = (route: any) => {
    setApprovalRoute(route);
    setShowRouteModal(false);
    
    // 결재선 설정 후 제출
    if (id && route) {
      submitMutation.mutate({ draftId: id, routeData: route });
    }
  };

  // 현재 사용자의 결재 권한 확인
  const getCurrentUserApprovalStatus = () => {
    if (!draft?.route?.stages || !user?.id) return null;

    for (const stage of draft.route.stages) {
      const approver = stage.approvers?.find(a => a.user_id === user.id);
      if (approver) {
        return {
          stage,
          approver,
          canAct: (stage.status === 'PENDING' || stage.status === 'IN_PROGRESS') && approver.status === 'PENDING'
        };
      }
    }
    return null;
  };

  const userApprovalInfo = getCurrentUserApprovalStatus();
  const isDocumentOwner = draft?.user_id === user?.id;
  
  const canApprove = userApprovalInfo?.canAct && (draft?.status === 'SUBMITTED' || draft?.status === 'IN_PROGRESS');
  const canEdit = draft?.status === 'DRAFT' && isDocumentOwner;
  const canSubmit = draft?.status === 'DRAFT' && isDocumentOwner;
  const canComment = canApprove || isDocumentOwner;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex justify-center items-center h-64">
        <Empty description="문서를 찾을 수 없습니다" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            돌아가기
          </Button>
          <Title level={2} className="!mb-0">
            결재 문서 상세
          </Title>
        </div>
        
        <Space>
          {canEdit && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => navigate(`/approval/create?edit=${draft.id}`)}
              >
                수정
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                loading={deleteMutation.isPending}
              >
                삭제
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={submitMutation.isPending}
              >
                제출
              </Button>
            </>
          )}
          
          {canApprove && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleAction('approve')}
                loading={approveMutation.isPending}
              >
                승인
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => handleAction('reject')}
                loading={rejectMutation.isPending}
              >
                반려
              </Button>
            </>
          )}
          
          {canComment && (
            <Button
              icon={<MessageOutlined />}
              onClick={() => handleAction('comment')}
              loading={commentMutation.isPending}
            >
              댓글
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          {/* 문서 정보 */}
          <Card title="문서 정보">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="제목">
                <Text strong className="text-lg">{draft.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="결재 양식">
                <div className="flex items-center space-x-2">
                  <span>{draft.category?.icon || '📋'}</span>
                  <Text>{draft.category?.name}</Text>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="상태">
                {getStatusTag(draft.status)}
              </Descriptions.Item>
              <Descriptions.Item label="작성일">
                {dayjs(draft.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              {draft.submitted_at && (
                <Descriptions.Item label="제출일">
                  {dayjs(draft.submitted_at).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {draft.completed_at && (
                <Descriptions.Item label="완료일">
                  {dayjs(draft.completed_at).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* 문서 내용 */}
          <Card title="문서 내용" className="mt-6">
            {draft.content && Object.keys(draft.content).length > 0 ? (
              <Descriptions column={1} bordered>
                {Object.entries(draft.content)
                  .filter(([key]) => key !== '__approvalRoute') // 결재선 정보 제외
                  .map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {typeof value === 'string' && value.length > 100 ? (
                      <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                        {value}
                      </Paragraph>
                    ) : (
                      <Text>{String(value)}</Text>
                    )}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            ) : (
              <Empty description="문서 내용이 없습니다" />
            )}
          </Card>

          {/* 첨부파일 */}
          {draft.attachments && draft.attachments.length > 0 && (
            <Card title="첨부파일" className="mt-6">
              <div className="space-y-2">
                {draft.attachments.map((file: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <Text>{file.name}</Text>
                    <Button type="link" size="small">
                      다운로드
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          {/* 결재선 */}
          {(draft.route || draft.content?.__approvalRoute) && (
            <Card title="결재선">
              {(() => {
                // content에 저장된 결재선 정보 우선 표시
                const savedRoute = draft.content?.__approvalRoute;
                if (savedRoute?.steps && savedRoute.steps.length > 0) {
                  return (
                    <div className="space-y-4">
                      {savedRoute.steps.map((step: any, index: number) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex justify-between items-center mb-2">
                            <Text strong>{step.type === 'COOPERATION' ? '협조' : 
                                            step.type === 'APPROVAL' ? '결재' :
                                            step.type === 'REFERENCE' ? '참조' :
                                            step.type === 'RECEPTION' ? '수신' :
                                            step.type === 'CIRCULATION' ? '공람' : step.type}</Text>
                            <Tag color="default">대기</Tag>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar size="small" icon={<UserOutlined />} />
                                <div>
                                  <div className="font-medium">
                                    {step.approverName || step.approverId}
                                  </div>
                                </div>
                              </div>
                              <Tag color="processing">대기</Tag>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
                
                // 기존 결재선 표시
                return draft.route?.stages?.length > 0 ? (
                <div className="space-y-4">
                  {draft.route.stages.map((stage, index) => (
                    <div key={stage.id} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <Text strong>{stage.name || `${index + 1}단계`}</Text>
                        <Tag color={stage.status === 'COMPLETED' ? 'success' : 
                                  stage.status === 'IN_PROGRESS' ? 'processing' : 'default'}>
                          {stage.status === 'COMPLETED' ? '완료' :
                           stage.status === 'IN_PROGRESS' ? '진행중' : '대기'}
                        </Tag>
                      </div>
                      
                      <div className="space-y-3">
                        {stage.approvers?.map((approver, approverIndex) => (
                          <div key={approver.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar size="small" icon={<UserOutlined />} />
                              <div>
                                <div className="font-medium">
                                  {approver.user?.name || approver.user_id}
                                </div>
                                {approver.user?.employee_profile?.department && (
                                  <div className="text-xs text-gray-500">
                                    {approver.user.employee_profile.department}
                                    {approver.user.title && ` • ${approver.user.title}`}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Tag color={
                              approver.status === 'APPROVED' ? 'success' :
                              approver.status === 'REJECTED' ? 'error' :
                              approver.status === 'PENDING' ? 'processing' : 'default'
                            }>
                              {approver.status === 'APPROVED' ? '승인' :
                               approver.status === 'REJECTED' ? '반려' :
                               approver.status === 'PENDING' ? '대기' : '미처리'}
                            </Tag>
                            {approver.acted_at && (
                              <div className="text-xs text-gray-400 ml-2">
                                {dayjs(approver.acted_at).format('MM-DD HH:mm')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <Empty description="결재선이 설정되지 않았습니다" />
                );
              })()}
            </Card>
          )}

          {/* 진행 이력 */}
          <Card title="진행 이력" className="mt-6">
            {draft.actions && draft.actions.length > 0 ? (
              <Timeline>
                {draft.actions.map((action: ApprovalAction) => (
                  <Timeline.Item
                    key={action.id}
                    dot={getActionIcon(action.action)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Text strong>{action.action}</Text>
                        <Text type="secondary" className="text-xs">
                          {dayjs(action.created_at).format('MM-DD HH:mm')}
                        </Text>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Avatar size="small" icon={<UserOutlined />} />
                        <div>
                          <Text className="text-sm font-medium">
                            {action.user?.name || action.user_id}
                          </Text>
                          {action.user?.employee_profile?.department && (
                            <Text className="text-xs text-gray-500 ml-1">
                              ({action.user.employee_profile.department})
                            </Text>
                          )}
                        </div>
                      </div>
                      {action.comments && (
                        <div className="bg-gray-50 p-2 rounded text-sm">
                          {action.comments}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="진행 이력이 없습니다" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 댓글/액션 모달 */}
      <Modal
        title={
          actionType === 'approve' ? '승인 처리' :
          actionType === 'reject' ? '반려 처리' : '댓글 추가'
        }
        open={showCommentModal}
        onCancel={() => {
          setShowCommentModal(false);
          commentForm.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => setShowCommentModal(false)}>
            취소
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={approveMutation.isPending || rejectMutation.isPending || commentMutation.isPending}
            onClick={handleCommentSubmit}
          >
            {actionType === 'approve' ? '승인' :
             actionType === 'reject' ? '반려' : '댓글 추가'}
          </Button>,
        ]}
      >
        <Form form={commentForm} layout="vertical">
          <Form.Item
            name="comments"
            label={actionType === 'reject' ? '반려 사유' : '의견'}
            rules={actionType === 'reject' ? [
              { required: true, message: '반려 사유를 입력해주세요' }
            ] : actionType === 'comment' ? [
              { required: true, message: '댓글을 입력해주세요' }
            ] : []}
          >
            <TextArea
              rows={4}
              placeholder={
                actionType === 'approve' ? '승인 의견을 입력하세요 (선택사항)' :
                actionType === 'reject' ? '반려 사유를 입력하세요' :
                '댓글을 입력하세요'
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 결재선 설정 모달 */}
      <ApprovalRouteModal
        open={showRouteModal}
        onCancel={() => setShowRouteModal(false)}
        onSave={handleRouteComplete}
        userId={user?.id || ''}
      />
    </div>
  );
};