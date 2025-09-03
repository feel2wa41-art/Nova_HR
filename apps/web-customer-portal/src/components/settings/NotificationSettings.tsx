import React, { useState } from 'react';
import {
  Form,
  Switch,
  Button,
  Card,
  Divider,
  Select,
  TimePicker,
  Row,
  Col,
  Typography,
  Space,
  message,
  Alert,
} from 'antd';
import {
  BellOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  MailOutlined,
  MobileOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface NotificationPreferences {
  attendance: {
    checkInReminder: boolean;
    checkOutReminder: boolean;
    lateArrivalAlert: boolean;
    overtimeAlert: boolean;
  };
  approval: {
    newRequest: boolean;
    approvalRequired: boolean;
    statusUpdate: boolean;
    deadline: boolean;
  };
  attitude: {
    productivityAlert: boolean;
    sessionReminder: boolean;
    weeklyReport: boolean;
  };
  channels: {
    email: boolean;
    browser: boolean;
    mobile: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  frequency: 'immediate' | 'hourly' | 'daily';
}

export const NotificationSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const push = usePushNotifications();

  // Default settings
  const defaultSettings: NotificationPreferences = {
    attendance: {
      checkInReminder: true,
      checkOutReminder: true,
      lateArrivalAlert: true,
      overtimeAlert: false,
    },
    approval: {
      newRequest: true,
      approvalRequired: true,
      statusUpdate: true,
      deadline: true,
    },
    attitude: {
      productivityAlert: false,
      sessionReminder: true,
      weeklyReport: true,
    },
    channels: {
      email: true,
      browser: true,
      mobile: false,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    frequency: 'immediate',
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async (values: NotificationPreferences) => {
      // This would call the API to save notification preferences
      // await apiClient.put('/user/notification-preferences', values);
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      message.success('알림 설정이 저장되었습니다.');
    },
    onError: () => {
      message.error('설정 저장에 실패했습니다.');
    },
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await saveSettingsMutation.mutateAsync(values);
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    const permission = await push.requestPermission();
    if (permission === 'granted') {
      message.success('브라우저 알림 권한이 승인되었습니다.');
    } else {
      message.warning('브라우저 알림 권한이 거부되었습니다.');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={defaultSettings}
      onFinish={handleSubmit}
    >
      <div style={{ maxWidth: 800 }}>
        {/* 알림 권한 및 푸시 구독 상태 */}
        {push.isSupported && (
          <>
            {push.permission !== 'granted' && (
              <Alert
                message="브라우저 알림 권한 필요"
                description="실시간 알림을 받으려면 브라우저 알림 권한을 허용해주세요."
                type="warning"
                action={
                  <Button size="small" onClick={requestNotificationPermission}>
                    권한 요청
                  </Button>
                }
                style={{ marginBottom: 16 }}
              />
            )}
            
            {push.permission === 'granted' && !push.isSubscribed && (
              <Alert
                message="푸시 알림 구독"
                description="실시간 푸시 알림을 받으려면 구독을 활성화해주세요."
                type="info"
                action={
                  <Space>
                    <Button 
                      size="small" 
                      type="primary"
                      loading={push.isLoading}
                      onClick={push.subscribe}
                    >
                      구독하기
                    </Button>
                  </Space>
                }
                style={{ marginBottom: 16 }}
              />
            )}

            {push.isSubscribed && (
              <Alert
                message="푸시 알림 활성화됨"
                description={`현재 ${push.subscriptions.length}개의 기기에서 푸시 알림을 수신하고 있습니다.`}
                type="success"
                action={
                  <Space>
                    <Button 
                      size="small" 
                      onClick={push.sendTestNotification}
                      disabled={push.isLoading}
                    >
                      테스트 알림
                    </Button>
                    <Button 
                      size="small" 
                      danger
                      loading={push.isLoading}
                      onClick={() => push.unsubscribe()}
                    >
                      구독 해제
                    </Button>
                  </Space>
                }
                style={{ marginBottom: 16 }}
              />
            )}
          </>
        )}

        {!push.isSupported && (
          <Alert
            message="푸시 알림 미지원"
            description="현재 브라우저에서는 푸시 알림을 지원하지 않습니다."
            type="warning"
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 근태 관리 알림 */}
        <Card title={
          <Space>
            <ClockCircleOutlined />
            <span>근태 관리 알림</span>
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['attendance', 'checkInReminder']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>출근 알림</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['attendance', 'checkOutReminder']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>퇴근 알림</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['attendance', 'lateArrivalAlert']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>지각 경고</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['attendance', 'overtimeAlert']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>초과 근무 알림</Text>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 전자결재 알림 */}
        <Card title={
          <Space>
            <FileTextOutlined />
            <span>전자결재 알림</span>
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['approval', 'newRequest']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>새 결재 요청</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['approval', 'approvalRequired']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>결재 대기</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['approval', 'statusUpdate']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>상태 변경</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['approval', 'deadline']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>마감일 임박</Text>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 태도 관리 알림 */}
        <Card title={
          <Space>
            <UserOutlined />
            <span>태도 관리 알림</span>
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item name={['attitude', 'productivityAlert']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>생산성 경고</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['attitude', 'sessionReminder']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>세션 시작 알림</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name={['attitude', 'weeklyReport']} valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>주간 리포트</Text>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 알림 채널 */}
        <Card title={
          <Space>
            <BellOutlined />
            <span>알림 채널</span>
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item name={['channels', 'email']} valuePropName="checked">
                <div>
                  <Switch />
                  <Space style={{ marginLeft: 8 }}>
                    <MailOutlined />
                    <Text>이메일</Text>
                  </Space>
                </div>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['channels', 'browser']} valuePropName="checked">
                <div>
                  <Switch disabled={!push.isSupported || !push.isSubscribed} />
                  <Space style={{ marginLeft: 8 }}>
                    <DesktopOutlined />
                    <Text>브라우저 {push.isSubscribed ? '(활성)' : '(비활성)'}</Text>
                  </Space>
                </div>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['channels', 'mobile']} valuePropName="checked">
                <div>
                  <Switch />
                  <Space style={{ marginLeft: 8 }}>
                    <MobileOutlined />
                    <Text>모바일 (준비중)</Text>
                  </Space>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 알림 빈도 및 방해 금지 시간 */}
        <Card title="고급 설정" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item 
                label="알림 빈도"
                name="frequency"
              >
                <Select>
                  <Option value="immediate">즉시</Option>
                  <Option value="hourly">1시간마다</Option>
                  <Option value="daily">하루 1회</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name={['quietHours', 'enabled']} 
                valuePropName="checked"
              >
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>방해 금지 시간</Text>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item shouldUpdate={(prevValues, curValues) => 
            prevValues.quietHours?.enabled !== curValues.quietHours?.enabled
          }>
            {({ getFieldValue }) =>
              getFieldValue(['quietHours', 'enabled']) && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      label="시작 시간"
                      name={['quietHours', 'start']}
                    >
                      <TimePicker 
                        format="HH:mm"
                        style={{ width: '100%' }}
                        placeholder="시작 시간"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      label="종료 시간"
                      name={['quietHours', 'end']}
                    >
                      <TimePicker 
                        format="HH:mm"
                        style={{ width: '100%' }}
                        placeholder="종료 시간"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )
            }
          </Form.Item>
        </Card>

        {/* 저장 버튼 */}
        <div style={{ textAlign: 'center' }}>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            size="large"
            style={{ minWidth: 120 }}
          >
            설정 저장
          </Button>
        </div>
      </div>
    </Form>
  );
};