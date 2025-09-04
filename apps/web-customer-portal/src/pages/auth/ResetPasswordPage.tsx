import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Typography, App, Alert, Spin } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/api';

const { Title, Text } = Typography;

interface ResetFormData {
  newPassword: string;
  confirmPassword: string;
}

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email?: string; name?: string } | null>(null);
  const [resetComplete, setResetComplete] = useState(false);

  const token = searchParams.get('token');

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setValidating(false);
        return;
      }

      try {
        const response = await apiClient.get(`/auth/password-reset/validate?token=${token}`);
        if (response.data.valid) {
          setTokenValid(true);
          setUserInfo(response.data.user);
        } else {
          setTokenValid(false);
        }
      } catch (error) {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (values: ResetFormData) => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/password-reset/reset', {
        token,
        newPassword: values.newPassword,
      });

      message.success(response.data.message);
      setResetComplete(true);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 
        '비밀번호 재설정에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  if (validating) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <Spin size="large" />
          <div className='mt-4'>
            <Text className='text-gray-600'>토큰 검증 중...</Text>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <div className='text-center'>
            <Title level={2} className='text-primary-600'>
              Nova HR
            </Title>
          </div>
          
          <Card className='shadow-lg'>
            <div className='text-center py-8'>
              <Alert
                message="유효하지 않은 링크"
                description="비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요."
                type="error"
                showIcon
                className='mb-6'
              />
              
              <Button
                type="primary"
                size="large"
                onClick={handleLoginRedirect}
              >
                로그인 페이지로 이동
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <div className='text-center'>
            <Title level={2} className='text-primary-600'>
              Nova HR
            </Title>
          </div>
          
          <Card className='shadow-lg'>
            <div className='text-center py-8'>
              <div className='mb-6'>
                <CheckCircleOutlined 
                  style={{ fontSize: 48, color: '#52c41a' }} 
                />
              </div>
              
              <h3 className='text-lg font-semibold mb-4'>
                비밀번호 변경 완료
              </h3>
              
              <div className='mb-6'>
                <Text className='text-gray-600'>
                  비밀번호가 성공적으로 변경되었습니다.
                  <br />
                  새 비밀번호로 로그인해주세요.
                </Text>
              </div>

              <Button
                type="primary"
                size="large"
                block
                onClick={handleLoginRedirect}
              >
                로그인하러 가기
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <Title level={2} className='text-primary-600'>
            Nova HR
          </Title>
          <Text className='text-gray-600'>새로운 비밀번호를 설정하세요</Text>
        </div>
        
        <Card className='shadow-lg'>
          {userInfo && (
            <div className='mb-4 p-4 bg-blue-50 rounded-lg'>
              <Text className='text-sm text-blue-600'>
                <strong>{userInfo.name}</strong> ({userInfo.email})
              </Text>
            </div>
          )}
          
          <Form
            form={form}
            name='reset-password'
            layout='vertical'
            onFinish={handleSubmit}
            autoComplete='off'
          >
            <Form.Item
              label='새 비밀번호'
              name='newPassword'
              rules={[
                { required: true, message: '새 비밀번호를 입력해주세요' },
                { min: 8, message: '비밀번호는 8자 이상이어야 합니다' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
                  message: '영문 대소문자, 숫자, 특수문자를 포함해야 합니다',
                },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder='새 비밀번호'
                size='large'
                autoComplete='new-password'
              />
            </Form.Item>

            <Form.Item
              label='비밀번호 확인'
              name='confirmPassword'
              dependencies={['newPassword']}
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
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder='비밀번호 확인'
                size='large'
                autoComplete='new-password'
              />
            </Form.Item>

            <div className='mb-4 p-3 bg-yellow-50 rounded-lg'>
              <Text className='text-xs text-yellow-800'>
                <strong>비밀번호 요구사항:</strong>
                <br />• 8자 이상
                <br />• 영문 대문자와 소문자 포함
                <br />• 숫자 포함
                <br />• 특수문자 포함
              </Text>
            </div>

            <Form.Item>
              <Button
                type='primary'
                htmlType='submit'
                size='large'
                block
                loading={loading}
                className='mt-4'
              >
                비밀번호 변경하기
              </Button>
            </Form.Item>
          </Form>

          <div className='text-center mt-4'>
            <Button
              type='link'
              onClick={handleLoginRedirect}
              className='p-0'
            >
              로그인 페이지로 돌아가기
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};