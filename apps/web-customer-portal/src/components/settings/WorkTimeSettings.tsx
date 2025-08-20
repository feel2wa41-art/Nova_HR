import { Form, TimePicker, Button, message, Card, Row, Col, Select, Switch, Divider, Typography } from 'antd';
import { ClockCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';

const { Text } = Typography;

interface WorkTimeFormData {
  startTime: any;
  endTime: any;
  lunchStartTime: any;
  lunchEndTime: any;
  workDays: number[];
  flexibleTime: boolean;
  remoteWork: boolean;
}

const workDayOptions = [
  { label: '월요일', value: 1 },
  { label: '화요일', value: 2 },
  { label: '수요일', value: 3 },
  { label: '목요일', value: 4 },
  { label: '금요일', value: 5 },
  { label: '토요일', value: 6 },
  { label: '일요일', value: 0 },
];

export const WorkTimeSettings = () => {
  const [form] = Form.useForm<WorkTimeFormData>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize form with default work schedule
    form.setFieldsValue({
      startTime: dayjs('07:00', 'HH:mm'),
      endTime: dayjs('16:00', 'HH:mm'),
      lunchStartTime: dayjs('12:00', 'HH:mm'),
      lunchEndTime: dayjs('13:00', 'HH:mm'),
      workDays: [1, 2, 3, 4, 5], // Monday to Friday
      flexibleTime: false,
      remoteWork: false,
    });
  }, [form]);

  const handleSubmit = async (values: WorkTimeFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Format time values
      const formattedValues = {
        ...values,
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
        lunchStartTime: values.lunchStartTime.format('HH:mm'),
        lunchEndTime: values.lunchEndTime.format('HH:mm'),
      };
      
      // TODO: Call actual API to update work schedule
      console.log('Updated work schedule:', formattedValues);
      
      message.success('근무시간 설정이 성공적으로 업데이트되었습니다');
    } catch (error) {
      message.error('근무시간 설정 업데이트에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWorkHours = (startTime: any, endTime: any, lunchStart: any, lunchEnd: any) => {
    if (!startTime || !endTime || !lunchStart || !lunchEnd) return '0시간';
    
    const start = dayjs(startTime);
    const end = dayjs(endTime);
    const lunchDuration = dayjs(lunchEnd).diff(dayjs(lunchStart), 'minute');
    
    const totalMinutes = end.diff(start, 'minute') - lunchDuration;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
  };

  const watchedValues = Form.useWatch([], form);

  return (
    <div className="space-y-6">
      <Card title="근무시간 설정" size="small">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="출근 시간"
                name="startTime"
                rules={[
                  { required: true, message: '출근 시간을 선택해주세요' },
                ]}
              >
                <TimePicker
                  size="large"
                  format="HH:mm"
                  placeholder="출근 시간"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="퇴근 시간"
                name="endTime"
                rules={[
                  { required: true, message: '퇴근 시간을 선택해주세요' },
                ]}
              >
                <TimePicker
                  size="large"
                  format="HH:mm"
                  placeholder="퇴근 시간"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="점심시간 시작"
                name="lunchStartTime"
                rules={[
                  { required: true, message: '점심시간 시작 시간을 선택해주세요' },
                ]}
              >
                <TimePicker
                  size="large"
                  format="HH:mm"
                  placeholder="점심시간 시작"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="점심시간 종료"
                name="lunchEndTime"
                rules={[
                  { required: true, message: '점심시간 종료 시간을 선택해주세요' },
                ]}
              >
                <TimePicker
                  size="large"
                  format="HH:mm"
                  placeholder="점심시간 종료"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Work Hours Summary */}
          <Card size="small" className="bg-blue-50 mb-4">
            <div className="flex justify-between items-center">
              <Text strong>총 근무시간:</Text>
              <Text strong className="text-blue-600">
                {calculateWorkHours(
                  watchedValues?.startTime,
                  watchedValues?.endTime,
                  watchedValues?.lunchStartTime,
                  watchedValues?.lunchEndTime
                )}
              </Text>
            </div>
          </Card>

          <Form.Item
            label="근무 요일"
            name="workDays"
            rules={[
              { required: true, message: '근무 요일을 선택해주세요' },
            ]}
          >
            <Select
              mode="multiple"
              size="large"
              placeholder="근무 요일을 선택하세요"
              options={workDayOptions}
            />
          </Form.Item>

          <Divider />

          <div className="space-y-4">
            <Form.Item
              name="flexibleTime"
              valuePropName="checked"
              className="mb-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>유연근무제</Text>
                  <div className="text-gray-500 text-sm">
                    출퇴근 시간을 ±2시간 내에서 조정 가능
                  </div>
                </div>
                <Switch />
              </div>
            </Form.Item>

            <Form.Item
              name="remoteWork"
              valuePropName="checked"
              className="mb-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Text strong>재택근무 허용</Text>
                  <div className="text-gray-500 text-sm">
                    위치 제한 없이 근무 가능
                  </div>
                </div>
                <Switch />
              </div>
            </Form.Item>
          </div>

          <Divider />

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isLoading}
              icon={<SaveOutlined />}
            >
              저장하기
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Work Schedule Preview */}
      <Card title="현재 근무 스케줄" size="small">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Text>근무시간:</Text>
            <Text strong>
              {watchedValues?.startTime?.format('HH:mm')} - {watchedValues?.endTime?.format('HH:mm')}
            </Text>
          </div>
          <div className="flex justify-between">
            <Text>점심시간:</Text>
            <Text strong>
              {watchedValues?.lunchStartTime?.format('HH:mm')} - {watchedValues?.lunchEndTime?.format('HH:mm')}
            </Text>
          </div>
          <div className="flex justify-between">
            <Text>근무 요일:</Text>
            <Text strong>
              {watchedValues?.workDays?.map(day => 
                workDayOptions.find(opt => opt.value === day)?.label
              ).join(', ')}
            </Text>
          </div>
          <div className="flex justify-between">
            <Text>총 근무시간:</Text>
            <Text strong className="text-blue-600">
              {calculateWorkHours(
                watchedValues?.startTime,
                watchedValues?.endTime,
                watchedValues?.lunchStartTime,
                watchedValues?.lunchEndTime
              )}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};