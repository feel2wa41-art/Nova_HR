import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, App, Space, Row, Col } from 'antd';
import { LockOutlined, EyeOutlined, EyeInvisibleOutlined, KeyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

const { Title, Text } = Typography;

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      return await apiClient.post('/users/change-password', data);
    },
    onSuccess: () => {
      message.success('비밀번호가 성공적으로 변경되었습니다');
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '비밀번호 변경에 실패했습니다');
    },
  });

  const handleSubmit = (values: ChangePasswordFormData) => {
    changePasswordMutation.mutate(values);
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Password strength validation
  const validatePasswordStrength = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
    };
  };

  const newPassword = Form.useWatch('newPassword', form);
  const passwordStrength = newPassword ? validatePasswordStrength(newPassword) : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <Title level={2} className="flex items-center gap-3">
            <KeyOutlined />
            비밀번호 변경
          </Title>
          <Text type="secondary">
            보안을 위해 정기적으로 비밀번호를 변경해주세요.
          </Text>
        </div>

        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
          >
            {/* Current Password */}
            <Form.Item
              label="현재 비밀번호"
              name="currentPassword"
              rules={[
                { required: true, message: '현재 비밀번호를 입력해주세요' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="현재 비밀번호 입력"
                visibilityToggle={{
                  visible: showPasswords.current,
                  onVisibleChange: () => togglePasswordVisibility('current'),
                }}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            {/* New Password */}
            <Form.Item
              label="새 비밀번호"
              name="newPassword"
              rules={[
                { required: true, message: '새 비밀번호를 입력해주세요' },
                { min: 8, message: '비밀번호는 최소 8자 이상이어야 합니다' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const validation = validatePasswordStrength(value);
                    if (validation.isValid) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('비밀번호 강도 요구사항을 만족하지 않습니다'));
                  },
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="새 비밀번호 입력"
                visibilityToggle={{
                  visible: showPasswords.new,
                  onVisibleChange: () => togglePasswordVisibility('new'),
                }}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            {/* Password Strength Indicator */}
            {passwordStrength && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="mb-2">
                  <Text strong>비밀번호 강도:</Text>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {passwordStrength.minLength ? (
                      <CheckCircleOutlined className="text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <Text type={passwordStrength.minLength ? 'success' : 'secondary'}>
                      최소 8자 이상
                    </Text>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasUpper ? (
                      <CheckCircleOutlined className="text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <Text type={passwordStrength.hasUpper ? 'success' : 'secondary'}>
                      대문자 포함
                    </Text>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasLower ? (
                      <CheckCircleOutlined className="text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <Text type={passwordStrength.hasLower ? 'success' : 'secondary'}>
                      소문자 포함
                    </Text>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasNumber ? (
                      <CheckCircleOutlined className="text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <Text type={passwordStrength.hasNumber ? 'success' : 'secondary'}>
                      숫자 포함
                    </Text>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordStrength.hasSpecial ? (
                      <CheckCircleOutlined className="text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <Text type={passwordStrength.hasSpecial ? 'success' : 'secondary'}>
                      특수문자 포함
                    </Text>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <Form.Item
              label="새 비밀번호 확인"
              name="confirmPassword"
              rules={[
                { required: true, message: '비밀번호 확인을 입력해주세요' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('비밀번호가 일치하지 않습니다'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="새 비밀번호 다시 입력"
                visibilityToggle={{
                  visible: showPasswords.confirm,
                  onVisibleChange: () => togglePasswordVisibility('confirm'),
                }}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            {/* Security Tips */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="mb-2">
                <Text strong className="text-blue-800">🔒 보안 안내</Text>
              </div>
              <ul className="text-sm text-blue-700 space-y-1 pl-4">
                <li>• 다른 사이트와 동일한 비밀번호를 사용하지 마세요</li>
                <li>• 개인정보(생년월일, 이름 등)를 포함하지 마세요</li>
                <li>• 정기적으로 비밀번호를 변경해주세요</li>
                <li>• 안전한 곳에 비밀번호를 보관하세요</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Form.Item>
              <Row gutter={16}>
                <Col flex="auto">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={changePasswordMutation.isPending}
                    className="w-full"
                    size="large"
                  >
                    비밀번호 변경
                  </Button>
                </Col>
                <Col>
                  <Button
                    onClick={() => form.resetFields()}
                    size="large"
                  >
                    초기화
                  </Button>
                </Col>
              </Row>
            </Form.Item>
          </Form>
        </Card>

        {/* Additional Information */}
        <Card className="mt-6">
          <Title level={4}>계정 보안 강화</Title>
          <div className="space-y-3">
            <div className="p-3 border border-gray-200 rounded-lg">
              <Text strong>2단계 인증</Text>
              <br />
              <Text type="secondary">
                계정 보안을 강화하기 위해 2단계 인증을 활성화하는 것을 권장합니다.
              </Text>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <Text strong>로그인 기록 확인</Text>
              <br />
              <Text type="secondary">
                정기적으로 로그인 기록을 확인하여 의심스러운 접근이 없는지 점검하세요.
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};