import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = async (values: LoginFormData) => {
    try {
      // TODO: Implement actual login
      console.log('Login attempt:', values);
      message.success('로그인 성공');
      navigate('/');
    } catch (error) {
      message.error('로그인에 실패했습니다');
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <Title level={2} className='text-primary-600'>
            Nova HR
          </Title>
          <Text className='text-gray-600'>HR 관리자 로그인</Text>
        </div>
        
        <Card className='shadow-lg'>
          <Form
            form={form}
            name='login'
            layout='vertical'
            onFinish={handleSubmit}
            autoComplete='off'
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
              />
            </Form.Item>

            <Form.Item>
              <Button
                type='primary'
                htmlType='submit'
                size='large'
                block
                className='mt-4'
              >
                로그인
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};