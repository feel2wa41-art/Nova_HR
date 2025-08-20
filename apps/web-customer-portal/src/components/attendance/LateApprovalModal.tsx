import { Modal, Form, Input, Button, Alert, Typography, Space, Card } from 'antd';
import { ClockCircleOutlined, ExclamationCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ApprovalSettingsModal } from '../approval/ApprovalSettingsModal';

const { TextArea } = Input;
const { Text } = Typography;

interface LateApprovalModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
  lateMinutes: number;
  isLoading?: boolean;
}

interface LateApprovalFormData {
  reason: string;
}

export const LateApprovalModal = ({
  open,
  onCancel,
  onSubmit,
  lateMinutes,
  isLoading = false
}: LateApprovalModalProps) => {
  const [form] = Form.useForm<LateApprovalFormData>();
  const { user } = useAuth();
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false);
  const [approvalSettings, setApprovalSettings] = useState<any>(null);

  useEffect(() => {
    if (open && user?.id) {
      // Load existing approval settings
      const stored = localStorage.getItem(`nova_hr_approval_settings_${user.id}_LATE_ATTENDANCE`);
      if (stored) {
        setApprovalSettings(JSON.parse(stored));
      }
    }
  }, [open, user?.id]);

  const handleSubmit = (values: LateApprovalFormData) => {
    if (!approvalSettings || approvalSettings.steps.length === 0) {
      alert('승인자를 먼저 설정해주세요.');
      return;
    }
    onSubmit(values.reason);
    form.resetFields();
  };

  const handleApprovalSettingsSave = (settings: any) => {
    setApprovalSettings(settings);
    localStorage.setItem(`nova_hr_approval_settings_${user?.id}_LATE_ATTENDANCE`, JSON.stringify(settings));
    setApprovalSettingsOpen(false);
  };

  const formatLateTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined className="text-orange-500" />
          지각 사유 작성
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={500}
      destroyOnHidden
    >
      <div className="space-y-4">
        {/* Late Time Alert */}
        <Alert
          message="지각이 감지되었습니다"
          description={
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ClockCircleOutlined />
                <Text>지각 시간: <strong className="text-orange-600">{formatLateTime(lateMinutes)}</strong></Text>
              </div>
              <Text className="text-gray-600 block">
                관리자 승인을 위해 지각 사유를 작성해주세요.
              </Text>
            </div>
          }
          type="warning"
          showIcon
          className="mb-4"
        />

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="지각 사유"
            name="reason"
            rules={[
              { required: true, message: '지각 사유를 입력해주세요' },
              { min: 10, message: '지각 사유는 10자 이상 입력해주세요' },
              { max: 200, message: '지각 사유는 200자 이하로 입력해주세요' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="지각 사유를 자세히 설명해주세요. (예: 교통체증, 응급상황, 의료진료 등)"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <Text className="text-blue-800 text-sm">
              <strong>안내사항:</strong>
              <ul className="mt-1 ml-4 space-y-1">
                <li>• 지각 사유는 관리자가 검토 후 승인/반려 결정됩니다</li>
                <li>• 허위 사유 작성 시 인사규정에 따라 제재받을 수 있습니다</li>
                <li>• 정당한 사유의 경우 지각 처리가 취소될 수 있습니다</li>
              </ul>
            </Text>
          </div>

          {/* Approval Settings */}
          <Card size="small" className="mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">승인자 설정</div>
                <div className="text-sm text-gray-500">
                  {approvalSettings ? 
                    `${approvalSettings.steps.length}단계 승인 설정됨` : 
                    '승인자가 설정되지 않았습니다'
                  }
                </div>
              </div>
              <Button
                type="primary"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setApprovalSettingsOpen(true)}
              >
                설정
              </Button>
            </div>
            {approvalSettings && approvalSettings.steps.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm text-gray-600">
                  승인 순서: {approvalSettings.steps.map((step: any) => step.approverName).join(' → ')}
                </div>
              </div>
            )}
          </Card>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={onCancel} disabled={isLoading}>
                취소
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                icon={<ClockCircleOutlined />}
                disabled={!approvalSettings || approvalSettings.steps.length === 0}
              >
                승인 요청 제출
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>

      {/* Approval Settings Modal */}
      <ApprovalSettingsModal
        open={approvalSettingsOpen}
        onCancel={() => setApprovalSettingsOpen(false)}
        onSave={handleApprovalSettingsSave}
        type="LATE_ATTENDANCE"
        userId={user?.id || ''}
        existingSettings={approvalSettings}
      />
    </Modal>
  );
};