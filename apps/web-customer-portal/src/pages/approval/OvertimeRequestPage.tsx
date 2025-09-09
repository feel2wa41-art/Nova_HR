import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, 
  Card, 
  message, 
  Breadcrumb, 
  Space,
  Spin 
} from 'antd';
import { 
  HomeOutlined, 
  ClockCircleOutlined 
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OvertimeRequestForm, OvertimeFormData } from '../../components/approval/OvertimeRequestForm';
import { approvalApi, CreateDraftRequest } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;

export const OvertimeRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Get overtime approval category
  const { data: categories, isLoading } = useQuery({
    queryKey: ['approval-categories'],
    queryFn: () => approvalApi.getCategories(),
    select: (data) => data?.find(cat => cat.code === 'OVERTIME_REQUEST')
  });

  // Create approval draft mutation
  const createDraftMutation = useMutation({
    mutationFn: async (data: CreateDraftRequest) => {
      console.log('📋 추가근무 신청 데이터:', data);
      return await approvalApi.createDraft(data);
    },
    onSuccess: (result) => {
      console.log('✅ 추가근무 신청 성공:', result);
      message.success({
        content: `추가근무 신청이 승인요청되었습니다! (ID: ${result.id.slice(-8)})`,
        duration: 5
      });
      queryClient.invalidateQueries({ queryKey: ['approval-drafts'] });
      
      // 3초 후 자동으로 승인 페이지로 이동
      setTimeout(() => {
        navigate('/approval');
      }, 3000);
    },
    onError: (error: any) => {
      console.error('❌ 추가근무 신청 오류:', error);
      message.error({
        content: error?.message || '신청 중 오류가 발생했습니다. 다시 시도해주세요.',
        duration: 5
      });
    }
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: CreateDraftRequest) => {
      console.log('💾 임시저장 데이터:', data);
      return await approvalApi.createDraft(data);
    },
    onSuccess: (result) => {
      console.log('✅ 임시저장 성공:', result);
      message.success({
        content: `임시저장되었습니다! (ID: ${result.id.slice(-8)})`,
        duration: 3
      });
      queryClient.invalidateQueries({ queryKey: ['approval-drafts'] });
      
      // 2초 후 임시보관함으로 이동
      setTimeout(() => {
        navigate('/approval/drafts');
      }, 2000);
    },
    onError: (error: any) => {
      console.error('❌ 임시저장 오류:', error);
      message.error({
        content: error?.message || '임시저장 중 오류가 발생했습니다. 다시 시도해주세요.',
        duration: 5
      });
    }
  });

  const handleSubmit = async (formData: OvertimeFormData) => {
    if (!categories?.id) {
      message.error('추가근무 승인 카테고리를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    
    try {
      const createData: CreateDraftRequest = {
        category_id: categories.id,
        title: `${getOvertimeTypeLabel(formData.overtime_type)} - ${formData.work_date}`,
        form_data: {
          ...formData,
          requester_name: user?.name || '사용자',
          requester_department: user?.employee_profile?.department || '부서미지정',
          request_date: new Date().toISOString().split('T')[0],
          attachments: formData.attachments?.map(att => att.name) || []
        },
        attachments: formData.attachments?.map(att => att.name) || [],
        comments: `긴급도: ${getEmergencyLevelLabel(formData.emergency_level)}`
      };

      await createDraftMutation.mutateAsync(createData);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async (formData: OvertimeFormData) => {
    if (!categories?.id) {
      message.error('추가근무 승인 카테고리를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);
    
    try {
      const draftData: CreateDraftRequest = {
        category_id: categories.id,
        title: `[임시저장] ${getOvertimeTypeLabel(formData.overtime_type)} - ${formData.work_date || '미정'}`,
        form_data: {
          ...formData,
          requester_name: user?.name || '사용자',
          requester_department: user?.employee_profile?.department || '부서미지정',
          request_date: new Date().toISOString().split('T')[0],
          status: 'DRAFT',
          attachments: formData.attachments?.map(att => att.name) || []
        },
        attachments: formData.attachments?.map(att => att.name) || [],
        comments: '임시저장된 추가근무 신청서'
      };

      await saveDraftMutation.mutateAsync(draftData);
    } finally {
      setLoading(false);
    }
  };

  const getOvertimeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'EVENING': '야근',
      'WEEKEND': '주말근무', 
      'HOLIDAY': '특근(공휴일)',
      'EARLY': '조기출근'
    };
    return labels[type] || type;
  };

  const getEmergencyLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      'LOW': '낮음',
      'NORMAL': '보통',
      'HIGH': '높음', 
      'URGENT': '긴급'
    };
    return labels[level] || level;
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!categories) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Title level={4}>추가근무 승인 카테고리를 찾을 수 없습니다.</Title>
          <p>관리자에게 문의하세요.</p>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <HomeOutlined />
          홈
        </Breadcrumb.Item>
        <Breadcrumb.Item>전자결재</Breadcrumb.Item>
        <Breadcrumb.Item>
          <ClockCircleOutlined />
          추가근무 신청
        </Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <OvertimeRequestForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          loading={loading || createDraftMutation.isPending || saveDraftMutation.isPending}
          mode="create"
        />
      </div>
    </div>
  );
};

export default OvertimeRequestPage;