import React, { useState } from 'react';
import { Modal, Form, Input, Button, Typography, App, Steps } from 'antd';
import { MailOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { apiClient } from '../../lib/api';

const { Text } = Typography;

interface PasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  visible,
  onClose,
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: 이메일 입력, 1: 이메일 발송 완료
  const [email, setEmail] = useState('');

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/password-reset/request', {
        email: values.email,
      });

      setEmail(values.email);
      setStep(1);
      message.success(response.data.message);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 
        '비밀번호 초기화 요청에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setEmail('');
    form.resetFields();
    onClose();
  };

  const steps = [
    {
      title: '이메일 입력',
      icon: <MailOutlined />,
    },
    {
      title: '이메일 발송 완료',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <Modal
      title="비밀번호 찾기"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={500}
      destroyOnHidden
    >
      <div className="py-4">
        <Steps current={step} items={steps} className="mb-8" />

        {step === 0 && (
          <>
            <div className="mb-6">
              <Text className="text-gray-600">
                가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
            >
              <Form.Item
                label="이메일 주소"
                name="email"
                rules={[
                  { required: true, message: '이메일을 입력해주세요' },
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="이메일 주소 입력"
                  size="large"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item className="mb-0">
                <div className="flex gap-3">
                  <Button onClick={handleClose} size="large">
                    취소
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    className="flex-1"
                  >
                    비밀번호 재설정 링크 발송
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </>
        )}

        {step === 1 && (
          <>
            <div className="text-center py-8">
              <div className="mb-6">
                <CheckCircleOutlined 
                  style={{ fontSize: 48, color: '#52c41a' }} 
                />
              </div>
              
              <h3 className="text-lg font-semibold mb-4">
                이메일이 발송되었습니다
              </h3>
              
              <div className="mb-6 space-y-2">
                <Text className="block text-gray-600">
                  <strong>{email}</strong>로 비밀번호 재설정 링크를 보내드렸습니다.
                </Text>
                <Text className="block text-gray-600">
                  이메일을 확인하여 비밀번호를 재설정해주세요.
                </Text>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-2">📧 확인 사항</div>
                  <ul className="text-left space-y-1 pl-4">
                    <li>• 이메일이 스팸함에 있는지 확인해주세요</li>
                    <li>• 링크는 1시간 후 만료됩니다</li>
                    <li>• 이메일이 오지 않으면 다시 요청해주세요</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setStep(0)} 
                  size="large"
                >
                  다시 요청하기
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleClose}
                  size="large"
                  className="flex-1"
                >
                  확인
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};