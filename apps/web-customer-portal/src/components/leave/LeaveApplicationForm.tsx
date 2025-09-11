import { Modal, Form, Select, DatePicker, Input, Switch, Button, Space, Card, Alert, Tag, Radio, App } from 'antd';
import { CalendarOutlined, ExclamationCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useLeave } from '../../hooks/useLeave';
import { useAuth } from '../../hooks/useAuth';
import { ApprovalSettingsModal } from '../approval/ApprovalSettingsModal';
import { validateLeaveRequest, calculateWorkingDays } from '../../utils/workingDays';
import { apiClient } from '../../lib/api';
import dayjs, { Dayjs } from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

// 반차/종일에 따른 날짜 선택 컴포넌트
const HalfDayDatePicker = ({ form, value, onChange }: { form: any, value?: any, onChange?: any }) => {
  const halfDayType = Form.useWatch('halfDayType', form);
  
  if (halfDayType === 'FULL_DAY') {
    return (
      <RangePicker
        value={value}
        onChange={onChange}
        size="large"
        style={{ width: '100%' }}
        format="YYYY-MM-DD"
        disabledDate={(current) => {
          return current && current < dayjs().startOf('day');
        }}
        placeholder={['시작일', '종료일']}
      />
    );
  } else {
    // 반차일 때는 단일 날짜를 선택하지만 내부적으로는 같은 날짜로 range 처리
    const singleDate = value && Array.isArray(value) ? value[0] : value;
    
    return (
      <DatePicker
        value={singleDate}
        size="large"
        style={{ width: '100%' }}
        format="YYYY-MM-DD"
        disabledDate={(current) => {
          return current && current < dayjs().startOf('day');
        }}
        placeholder="반차 날짜"
        onChange={(date) => {
          // 반차일 때는 같은 날짜로 range 설정
          if (date) {
            onChange?.([date, date]);
          } else {
            onChange?.(undefined);
          }
        }}
      />
    );
  }
};

interface LeaveApplicationFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

interface LeaveFormData {
  leaveTypeId: string;
  dateRange: [Dayjs, Dayjs];
  halfDayType: 'FULL_DAY' | 'MORNING' | 'AFTERNOON';
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
  const { message } = App.useApp();
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false);
  const [approvalSettings, setApprovalSettings] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
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
      // Load company settings first
      setLoadingSettings(true);
      apiClient.get('/company/my-company')
        .then(res => {
          setCompanySettings(res.data);
          console.log('Company settings loaded:', res.data);
          
          // Check for company-level approval settings
          if (res.data.settings?.leave_approval_settings) {
            setApprovalSettings(res.data.settings.leave_approval_settings);
            console.log('Using company leave approval settings');
          } else {
            // Fallback to user's stored settings
            const stored = localStorage.getItem(`nova_hr_approval_settings_${user.id}_LEAVE`);
            if (stored) {
              setApprovalSettings(JSON.parse(stored));
              console.log('Using user stored approval settings');
            }
          }
        })
        .catch(err => {
          console.error('Failed to load company settings:', err);
          // Fallback to localStorage
          const stored = localStorage.getItem(`nova_hr_approval_settings_${user.id}_LEAVE`);
          if (stored) {
            setApprovalSettings(JSON.parse(stored));
          }
        })
        .finally(() => {
          setLoadingSettings(false);
        });
    }
  }, [open, leaveTypes.length, leaveBalances.length, fetchLeaveTypes, fetchLeaveBalances, user?.id]);

  const handleSubmit = async (values: LeaveFormData) => {
    try {
      const { leaveTypeId, dateRange, halfDayType, reason, emergency } = values;
      
      // Validate based on leave type settings
      const selectedType = leaveTypes.find(type => type.id === leaveTypeId);
      if (!selectedType) {
        message.error('선택한 휴가 종류를 찾을 수 없습니다.');
        return;
      }

      // Check if approval is required
      if (selectedType.requiresApproval && (!approvalSettings || approvalSettings.steps?.length === 0)) {
        message.warning('이 휴가 종류는 승인이 필요합니다. 승인자를 설정해주세요.');
        return;
      }

      // Log for debugging
      console.log('Submitting leave request with:', {
        leaveType: selectedType,
        companySettings: companySettings,
        approvalSettings: approvalSettings,
        dateRange: [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
        emergency: emergency
      });
      
      const result = await submitLeaveRequest({
        leaveTypeId,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        halfDayType: halfDayType, // 반차 정보 추가
        reason,
        emergency,
        approvalSettings: approvalSettings, // Include approval settings
      });
      
      // Check if approval draft was created (requires approval)
      if (result.approval_draft) {
        message.success(
          '휴가 신청이 완료되었습니다! 전자결재 시스템을 통해 승인 진행됩니다.',
          6
        );
        // Optional: Show link to approval system
        Modal.info({
          title: '전자결재 연동 안내',
          content: (
            <div>
              <p>휴가 신청이 전자결재 시스템에 등록되었습니다.</p>
              <p>승인 진행 상황은 <strong>전자결재 &gt; 발신함</strong>에서 확인하실 수 있습니다.</p>
            </div>
          ),
        });
      } else {
        message.success('휴가 신청이 완료되었습니다!');
      }
      
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      message.error(error.message || '휴가 신청에 실패했습니다');
    }
  };

  const getLeaveTypeBalance = (leaveTypeCode: string) => {
    return leaveBalances.find(balance => balance.leaveType === leaveTypeCode);
  };

  const calculateLeaveDays = (dateRange: [Dayjs, Dayjs] | undefined, halfDayType: string = 'FULL_DAY') => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return { totalDays: 0, workingDays: 0 };
    
    const startDate = dateRange[0].toDate();
    const endDate = dateRange[1].toDate();
    
    const validation = validateLeaveRequest(startDate, endDate);
    
    // 반차인 경우 0.5일로 계산
    if (halfDayType === 'MORNING' || halfDayType === 'AFTERNOON') {
      return {
        totalDays: 0.5,
        workingDays: 0.5,
        weekendDays: 0,
        holidayDays: 0,
        isHalfDay: true,
        halfDayType: halfDayType,
      };
    }
    
    return {
      totalDays: validation.totalDays,
      workingDays: validation.workingDays,
      weekendDays: validation.weekendDays,
      holidayDays: validation.holidayDays,
      isHalfDay: false,
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
  const selectedHalfDayType = Form.useWatch('halfDayType', form);
  const selectedLeaveTypeData = leaveTypes.find(type => type.id === selectedLeaveType);
  const leaveTypeBalance = selectedLeaveTypeData 
    ? getLeaveTypeBalance(selectedLeaveTypeData.code)
    : null;
  const calculatedDays = calculateLeaveDays(selectedDateRange, selectedHalfDayType);

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
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={{
          emergency: false,
          halfDayType: 'FULL_DAY',
        }}
      >
        {/* Company Info and Settings Display */}
        {companySettings && (
          <Card size="small" className="mb-4 bg-blue-50">
            <div className="text-sm">
              <div className="font-medium mb-2 text-blue-700">회사 정보</div>
              <div className="space-y-1 text-gray-600">
                <div>회사명: <span className="font-medium text-gray-800">{companySettings.name}</span></div>
                {companySettings.settings?.leave_policy && (
                  <div>휴가 정책: <span className="text-gray-800">{companySettings.settings.leave_policy}</span></div>
                )}
                {companySettings.settings?.approval_required && (
                  <div>승인 필수: <span className="text-gray-800">활성화</span></div>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="bg-blue-50 border-l-4 border-blue-400 p-2 mb-4 text-sm">
          <span className="text-blue-700">💼 휴가 신청은 전자결재 시스템을 통해 승인 처리됩니다</span>
        </div>
        
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

        {selectedLeaveTypeData && (
          <Card size="small" className="mb-4">
            <div className="space-y-3">
              {/* Leave Type Details */}
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">선택된 휴가 종류 정보</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span 
                      className="inline-block w-3 h-3 rounded-full" 
                      style={{ backgroundColor: selectedLeaveTypeData.colorHex }}
                    />
                    <span className="font-medium">{selectedLeaveTypeData.name}</span>
                  </div>
                  <div>
                    {selectedLeaveTypeData.isPaid ? 
                      <Tag color="green">유급</Tag> : 
                      <Tag color="orange">무급</Tag>
                    }
                    {selectedLeaveTypeData.requiresApproval ? 
                      <Tag color="blue">승인필요</Tag> : 
                      <Tag color="gray">자동승인</Tag>
                    }
                  </div>
                </div>
              </div>

              {/* Leave Balance */}
              {leaveTypeBalance && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">휴가 잔여 현황</div>
                  <div className="bg-blue-50 p-3 rounded">
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
                </div>
              )}
            </div>
          </Card>
        )}

        <Form.Item
          label="휴가 유형"
          name="halfDayType"
          rules={[{ required: true, message: '휴가 유형을 선택해주세요' }]}
        >
          <Radio.Group size="large">
            <Radio.Button value="FULL_DAY">종일</Radio.Button>
            <Radio.Button value="MORNING">오전반차</Radio.Button>
            <Radio.Button value="AFTERNOON">오후반차</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="휴가 기간"
          name="dateRange" 
          rules={[
            { required: true, message: '휴가 기간을 선택해주세요' },
          ]}
        >
          <HalfDayDatePicker form={form} />
        </Form.Item>

        {calculatedDays.workingDays > 0 && (
          <Alert
            message={
              calculatedDays.isHalfDay 
                ? `반차 신청 (${calculatedDays.halfDayType === 'MORNING' ? '오전' : '오후'})`
                : "휴가 일수 계산"
            }
            description={
              <div className="space-y-2">
                {calculatedDays.isHalfDay ? (
                  <div className="text-sm">
                    <div className="flex justify-between items-center">
                      <span>신청 일수:</span>
                      <span className="font-bold text-green-600">0.5일 (반차)</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>신청 날짜:</span>
                      <span className="font-medium">
                        {selectedDateRange?.[0]?.format('YYYY년 MM월 DD일')}
                      </span>
                    </div>
                  </div>
                ) : (
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
                )}
                {leaveTypeBalance && calculatedDays.workingDays > leaveTypeBalance.remaining && (
                  <div className="mt-2 text-red-600 text-sm flex items-center">
                    <ExclamationCircleOutlined className="mr-1" />
                    잔여 휴가일수를 초과합니다 (잔여: {leaveTypeBalance.remaining}일)
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
              loading={loadingSettings}
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