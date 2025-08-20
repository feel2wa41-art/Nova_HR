import { Modal, Form, Select, DatePicker, Input, Switch, Button, message, Space, Card, Alert } from 'antd';
import { CalendarOutlined, ExclamationCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useLeave } from '../../hooks/useLeave';
import { useAuth } from '../../hooks/useAuth';
import { ApprovalSettingsModal } from '../approval/ApprovalSettingsModal';
import { validateLeaveRequest, calculateWorkingDays } from '../../utils/workingDays';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface LeaveApplicationFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

interface LeaveFormData {
  leaveTypeId: string;
  dateRange: [Dayjs, Dayjs];
  reason?: string;
  emergency: boolean;
}

export const LeaveApplicationForm = ({
  open,
  onCancel,
  onSuccess,
}: LeaveApplicationFormProps) => {
  const [form] = Form.useForm<LeaveFormData>();
  const { user } = useAuth();
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false);
  const [approvalSettings, setApprovalSettings] = useState<any>(null);
  const {
    leaveTypes,
    leaveBalances,
    isSubmitting,
    fetchLeaveTypes,
    fetchLeaveBalances,
    submitLeaveRequest,
  } = useLeave();

  useEffect(() => {
    if (open && leaveTypes.length === 0) {
      fetchLeaveTypes().catch(console.error);
    }
    if (open && leaveBalances.length === 0) {
      fetchLeaveBalances().catch(console.error);
    }
    if (open && user?.id) {
      // Load existing approval settings
      const stored = localStorage.getItem(`nova_hr_approval_settings_${user.id}_LEAVE`);
      if (stored) {
        setApprovalSettings(JSON.parse(stored));
      }
    }
  }, [open, leaveTypes.length, leaveBalances.length, fetchLeaveTypes, fetchLeaveBalances, user?.id]);

  const handleSubmit = async (values: LeaveFormData) => {
    try {
      const { leaveTypeId, dateRange, reason, emergency } = values;
      
      await submitLeaveRequest({
        leaveTypeId,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        reason,
        emergency,
      });
      
      message.success('휴가 신청이 완료되었습니다!');
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '휴가 신청에 실패했습니다');
    }
  };

  const getLeaveTypeBalance = (leaveTypeCode: string) => {
    return leaveBalances.find(balance => balance.leaveType === leaveTypeCode);
  };

  const calculateLeaveDays = (dateRange: [Dayjs, Dayjs] | undefined) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return { totalDays: 0, workingDays: 0 };
    
    const startDate = dateRange[0].toDate();
    const endDate = dateRange[1].toDate();
    
    const validation = validateLeaveRequest(startDate, endDate);
    
    return {
      totalDays: validation.totalDays,
      workingDays: validation.workingDays,
      weekendDays: validation.weekendDays,
      holidayDays: validation.holidayDays,
    };
  };

  const handleApprovalSettingsSave = (settings: any) => {
    setApprovalSettings(settings);
    localStorage.setItem(`nova_hr_approval_settings_${user?.id}_LEAVE`, JSON.stringify(settings));
    setApprovalSettingsOpen(false);
    message.success('승인자 설정이 저장되었습니다.');
  };

  const selectedLeaveType = Form.useWatch('leaveTypeId', form);
  const selectedDateRange = Form.useWatch('dateRange', form);
  const selectedLeaveTypeData = leaveTypes.find(type => type.id === selectedLeaveType);
  const leaveTypeBalance = selectedLeaveTypeData 
    ? getLeaveTypeBalance(selectedLeaveTypeData.code)
    : null;
  const calculatedDays = calculateLeaveDays(selectedDateRange);

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined />
          휴가 신청
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={{
          emergency: false,
        }}
      >
        <Form.Item
          label="휴가 종류"
          name="leaveTypeId"
          rules={[
            { required: true, message: '휴가 종류를 선택해주세요' },
          ]}
        >
          <Select
            placeholder="휴가 종류를 선택하세요"
            size="large"
            options={leaveTypes.map(type => ({
              value: type.id,
              label: (
                <div className="flex justify-between items-center">
                  <span>
                    <span 
                      className="inline-block w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: type.colorHex }}
                    />
                    {type.name}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {type.maxDaysYear ? `연간 ${type.maxDaysYear}일` : '제한없음'}
                  </span>
                </div>
              ),
            }))}
          />
        </Form.Item>

        {leaveTypeBalance && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>배정:</span>
                <span className="font-medium">{leaveTypeBalance.allocated}일</span>
              </div>
              <div className="flex justify-between">
                <span>사용:</span>
                <span className="font-medium text-red-600">{leaveTypeBalance.used}일</span>
              </div>
              <div className="flex justify-between">
                <span>대기:</span>
                <span className="font-medium text-orange-600">{leaveTypeBalance.pending}일</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span>잔여:</span>
                <span className="font-bold text-green-600">{leaveTypeBalance.remaining}일</span>
              </div>
            </div>
          </div>
        )}

        <Form.Item
          label="휴가 기간"
          name="dateRange"
          rules={[
            { required: true, message: '휴가 기간을 선택해주세요' },
          ]}
        >
          <RangePicker
            size="large"
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            disabledDate={(current) => {
              // Disable past dates
              return current && current < dayjs().startOf('day');
            }}
          />
        </Form.Item>

        {calculatedDays.workingDays > 0 && (
          <Alert
            message="휴가 일수 계산"
            description={
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between">
                      <span>전체 기간:</span>
                      <span className="font-medium">{calculatedDays.totalDays}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">근무일:</span>
                      <span className="font-bold text-green-600">{calculatedDays.workingDays}일</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">주말:</span>
                      <span className="text-gray-500">{calculatedDays.weekendDays || 0}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">공휴일:</span>
                      <span className="text-gray-500">{calculatedDays.holidayDays || 0}일</span>
                    </div>
                  </div>
                </div>
                {leaveTypeBalance && calculatedDays.workingDays > leaveTypeBalance.remaining && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <ExclamationCircleOutlined className="mr-1" />
                    근무일 기준으로 잔여 휴가일수를 초과합니다
                  </div>
                )}
              </div>
            }
            type="info"
            showIcon
            className="mb-4"
          />
        )}

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

        <Form.Item
          label="신청 사유"
          name="reason"
        >
          <TextArea
            rows={3}
            placeholder="휴가 신청 사유를 입력하세요 (선택사항)"
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="긴급 신청"
          name="emergency"
          valuePropName="checked"
        >
          <Switch 
            checkedChildren="긴급"
            unCheckedChildren="일반"
            size="default"
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Space className="w-full justify-end">
            <Button size="large" onClick={onCancel}>
              취소
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={isSubmitting}
              disabled={
                (leaveTypeBalance && 
                calculatedDays.workingDays > 0 && 
                calculatedDays.workingDays > leaveTypeBalance.remaining) ||
                !approvalSettings ||
                approvalSettings.steps.length === 0
              }
            >
              신청하기
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* Approval Settings Modal */}
      <ApprovalSettingsModal
        open={approvalSettingsOpen}
        onCancel={() => setApprovalSettingsOpen(false)}
        onSave={handleApprovalSettingsSave}
        type="LEAVE"
        userId={user?.id || ''}
        existingSettings={approvalSettings}
      />
    </Modal>
  );
};