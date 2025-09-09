import { Form, Input, Button, Card, Typography, App, Modal } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PasswordResetModal } from './PasswordResetModal';

const { Title, Text } = Typography;

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { login, isLoading, isAuthenticated, logout } = useAuth();
  const { message } = App.useApp();
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [loginMessage, setLoginMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clear any existing authentication state on login page
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear state when component mounts (only once)
  useEffect(() => {
    if (!isAuthenticated) {
      logout();
    }
  }, []);

  // Handle message display in effect to avoid React 18 concurrent mode issues
  useEffect(() => {
    if (loginMessage) {
      if (loginMessage.type === 'success') {
        message.success(loginMessage.text);
      } else {
        message.error(loginMessage.text);
      }
      setLoginMessage(null);
    }
  }, [loginMessage, message]);

  const handleSubmit = async (values: LoginFormData) => {
    try {
      await login(values.email, values.password);
      setLoginMessage({ type: 'success', text: '로그인 성공!' });
      navigate('/', { replace: true });
    } catch (error: any) {
      setLoginMessage({ type: 'error', text: error.message || '로그인에 실패했습니다' });
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <Title level={2} className='text-primary-600'>
            Reko HR
          </Title>
          <Text className='text-gray-600'>임직원 포털에 로그인하세요</Text>
        </div>
        
        <Card className='shadow-lg'>
          <div className='mb-4 p-4 bg-blue-50 rounded-lg'>
            <Text className='text-xs text-blue-600 font-medium block mb-2'>테스트 계정</Text>
            <div className='text-xs space-y-1'>
              <div><strong>직원:</strong> employee@reko-hr.com / admin123</div>
              <div><strong>HR매니저:</strong> hr@reko-hr.com / admin123</div>
              <div><strong>관리자:</strong> admin@reko-hr.com / admin123</div>
            </div>
          </div>
          
          <Form
            form={form}
            name='login'
            layout='vertical'
            onFinish={handleSubmit}
            autoComplete='off'
            initialValues={{
              email: 'employee@reko-hr.com',
              password: 'admin123'
            }}
          >
            <Form.Item
              label='이메일'
              name='email'
              rules={[
                { required: true, message: '이메일을 입력해주세요' },
                { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder='이메일 주소'
                size='large'
                autoComplete='email'
              />
            </Form.Item>

            <Form.Item
              label='비밀번호'
              name='password'
              rules={[
                { required: true, message: '비밀번호를 입력해주세요' },
                { min: 6, message: '비밀번호는 6자 이상이어야 합니다' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder='비밀번호'
                size='large'
                autoComplete='current-password'
              />
            </Form.Item>

            <Form.Item>
              <Button
                type='primary'
                htmlType='submit'
                size='large'
                block
                loading={isLoading}
                className='mt-4'
              >
                로그인
              </Button>
            </Form.Item>

            <div className='text-center mt-4'>
              <Button
                type='link'
                onClick={() => setResetModalVisible(true)}
                className='p-0'
              >
                비밀번호를 잊으셨나요?
              </Button>
            </div>
          </Form>
        </Card>

        <PasswordResetModal
          visible={resetModalVisible}
          onClose={() => setResetModalVisible(false)}
        />
      </div>
    </div>
  );
};