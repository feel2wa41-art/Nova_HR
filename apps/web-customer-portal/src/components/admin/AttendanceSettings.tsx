import { Form, Switch, InputNumber, Select, Button, Card, message, Typography, Divider } from 'antd';
import { ClockCircleOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';

const { Text } = Typography;

interface AttendanceSettingsData {
  // Location-based settings
  requireLocation: boolean;
  strictLocationCheck: boolean;
  maxDistanceFromOffice: number;
  
  // Time-based settings
  lateThreshold: number; // minutes
  earlyLeaveThreshold: number; // minutes
  
  // Work schedule settings
  allowFlexibleTime: boolean;
  flexibleTimeRange: number; // hours
  
  // Break time settings
  autoBreakDeduction: boolean;
  breakDuration: number; // minutes
  
  // Overtime settings
  autoOvertimeCalculation: boolean;
  overtimeThreshold: number; // minutes after normal work hours
  
  // Rounding settings
  timeRounding: 'NONE' | 'UP_5' | 'UP_10' | 'UP_15';
  
  // Notification settings
  sendLateWarning: boolean;
  sendAbsentNotification: boolean;
}

export const AttendanceSettings = () => {
  const [form] = Form.useForm<AttendanceSettingsData>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize with default settings
    form.setFieldsValue({
      requireLocation: true,
      strictLocationCheck: true,
      maxDistanceFromOffice: 200,
      lateThreshold: 15,
      earlyLeaveThreshold: 15,
      allowFlexibleTime: false,
      flexibleTimeRange: 2,
      autoBreakDeduction: true,
      breakDuration: 60,
      autoOvertimeCalculation: true,
      overtimeThreshold: 30,
      timeRounding: 'UP_5',
      sendLateWarning: true,
      sendAbsentNotification: true,
    });
  }, [form]);

  const handleSubmit = async (values: AttendanceSettingsData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Updated attendance settings:', values);
      message.success('출석 설정이 성공적으로 업데이트되었습니다');
    } catch (error) {
      message.error('출석 설정 업데이트에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const timeRoundingOptions = [
    { value: 'NONE', label: '반올림 없음' },
    { value: 'UP_5', label: '5분 단위 올림' },
    { value: 'UP_10', label: '10분 단위 올림' },
    { value: 'UP_15', label: '15분 단위 올림' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Text strong className="text-lg">출석 체크 설정</Text>
        <div className="text-gray-500 text-sm mt-1">
          직원들의 출석 체크 방식과 규칙을 설정하세요
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {/* Location Settings */}
        <Card title="위치 기반 설정" size="small" className="mb-4">
          <Form.Item
            name="requireLocation"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>위치 확인 필수</Text>
                <div className="text-gray-500 text-sm">
                  출석 체크 시 GPS 위치 확인을 필수로 합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            name="strictLocationCheck"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>엄격한 위치 확인</Text>
                <div className="text-gray-500 text-sm">
                  허용 반경을 벗어나면 출석 체크를 차단합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            label="최대 허용 거리 (미터)"
            name="maxDistanceFromOffice"
            rules={[
              { required: true, message: '최대 허용 거리를 입력해주세요' },
            ]}
          >
            <InputNumber
              min={50}
              max={1000}
              style={{ width: '200px' }}
              addonAfter="미터"
            />
          </Form.Item>
        </Card>

        {/* Time Settings */}
        <Card title="시간 기반 설정" size="small" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="지각 기준 시간 (분)"
              name="lateThreshold"
              rules={[
                { required: true, message: '지각 기준 시간을 입력해주세요' },
              ]}
            >
              <InputNumber
                min={1}
                max={60}
                style={{ width: '100%' }}
                addonAfter="분"
              />
            </Form.Item>

            <Form.Item
              label="조퇴 기준 시간 (분)"
              name="earlyLeaveThreshold"
              rules={[
                { required: true, message: '조퇴 기준 시간을 입력해주세요' },
              ]}
            >
              <InputNumber
                min={1}
                max={60}
                style={{ width: '100%' }}
                addonAfter="분"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="allowFlexibleTime"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>유연근무제 허용</Text>
                <div className="text-gray-500 text-sm">
                  설정된 시간 범위 내에서 출퇴근 시간 조정을 허용합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            label="유연근무 시간 범위 (시간)"
            name="flexibleTimeRange"
            rules={[
              { required: true, message: '유연근무 시간 범위를 입력해주세요' },
            ]}
          >
            <InputNumber
              min={1}
              max={4}
              style={{ width: '200px' }}
              addonAfter="시간"
            />
          </Form.Item>
        </Card>

        {/* Break Time Settings */}
        <Card title="휴게시간 설정" size="small" className="mb-4">
          <Form.Item
            name="autoBreakDeduction"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>자동 휴게시간 차감</Text>
                <div className="text-gray-500 text-sm">
                  근무시간에서 휴게시간을 자동으로 차감합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            label="휴게시간 (분)"
            name="breakDuration"
            rules={[
              { required: true, message: '휴게시간을 입력해주세요' },
            ]}
          >
            <InputNumber
              min={30}
              max={120}
              style={{ width: '200px' }}
              addonAfter="분"
            />
          </Form.Item>
        </Card>

        {/* Overtime Settings */}
        <Card title="초과근무 설정" size="small" className="mb-4">
          <Form.Item
            name="autoOvertimeCalculation"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>자동 초과근무 계산</Text>
                <div className="text-gray-500 text-sm">
                  정규 근무시간을 초과한 시간을 자동으로 계산합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            label="초과근무 인정 기준 (분)"
            name="overtimeThreshold"
            rules={[
              { required: true, message: '초과근무 인정 기준을 입력해주세요' },
            ]}
          >
            <InputNumber
              min={15}
              max={120}
              style={{ width: '200px' }}
              addonAfter="분"
            />
          </Form.Item>
        </Card>

        {/* Time Rounding Settings */}
        <Card title="시간 계산 설정" size="small" className="mb-4">
          <Form.Item
            label="시간 반올림 방식"
            name="timeRounding"
            rules={[
              { required: true, message: '시간 반올림 방식을 선택해주세요' },
            ]}
          >
            <Select
              style={{ width: '200px' }}
              options={timeRoundingOptions}
            />
          </Form.Item>
        </Card>

        {/* Notification Settings */}
        <Card title="알림 설정" size="small" className="mb-4">
          <Form.Item
            name="sendLateWarning"
            valuePropName="checked"
            className="mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>지각 경고 알림</Text>
                <div className="text-gray-500 text-sm">
                  지각 시 직원과 관리자에게 알림을 전송합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            name="sendAbsentNotification"
            valuePropName="checked"
            className="mb-0"
          >
            <div className="flex items-center justify-between">
              <div>
                <Text strong>결석 알림</Text>
                <div className="text-gray-500 text-sm">
                  무단 결석 시 관리자에게 알림을 전송합니다
                </div>
              </div>
              <Switch />
            </div>
          </Form.Item>
        </Card>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={isLoading}
            icon={<SaveOutlined />}
          >
            설정 저장
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};