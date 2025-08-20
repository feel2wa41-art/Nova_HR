import { Form, Input, Button, Avatar, Upload, message, Row, Col, Card } from 'antd';
import { UserOutlined, CameraOutlined, SaveOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface PersonalInfoFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  npwp: string; // Indonesian tax ID
  emergencyContact: string;
  emergencyPhone: string;
}

export const PersonalInfoSettings = () => {
  const [form] = Form.useForm<PersonalInfoFormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const { user } = useAuth();

  useEffect(() => {
    // Initialize form with user data
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        phone: '',
        address: '',
        npwp: '',
        emergencyContact: '',
        emergencyPhone: '',
      });
    }
  }, [user, form]);

  const handleSubmit = async (values: PersonalInfoFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Call actual API to update user profile
      console.log('Updated profile:', values);
      
      message.success('개인정보가 성공적으로 업데이트되었습니다');
    } catch (error) {
      message.error('개인정보 업데이트에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = (info: any) => {
    if (info.file.status === 'done') {
      // Get this url from response in real world.
      setAvatarUrl(info.file.response?.url);
      message.success('프로필 사진이 업데이트되었습니다');
    } else if (info.file.status === 'error') {
      message.error('프로필 사진 업로드에 실패했습니다');
    }
  };

  const uploadButton = (
    <div className="flex flex-col items-center justify-center">
      <CameraOutlined className="text-lg mb-1" />
      <div className="text-xs">사진 변경</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <Card title="프로필 사진" size="small">
        <div className="flex items-center gap-4">
          <Avatar
            size={80}
            src={avatarUrl}
            icon={<UserOutlined />}
            className="border-2 border-gray-200"
          />
          <div>
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              action="/api/upload" // Placeholder endpoint
              beforeUpload={(file) => {
                const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                if (!isJpgOrPng) {
                  message.error('JPG/PNG 파일만 업로드 가능합니다!');
                }
                const isLt2M = file.size / 1024 / 1024 < 2;
                if (!isLt2M) {
                  message.error('이미지는 2MB보다 작아야 합니다!');
                }
                return isJpgOrPng && isLt2M;
              }}
              onChange={handleAvatarUpload}
            >
              {uploadButton}
            </Upload>
            <p className="text-sm text-gray-500 mt-2">
              JPG, PNG 파일 (최대 2MB)
            </p>
          </div>
        </div>
      </Card>

      {/* Personal Information Form */}
      <Card title="개인 정보" size="small">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="이름"
                name="name"
                rules={[
                  { required: true, message: '이름을 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="이름을 입력하세요" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="이메일"
                name="email"
                rules={[
                  { required: true, message: '이메일을 입력해주세요' },
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
                ]}
              >
                <Input size="large" placeholder="이메일을 입력하세요" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="연락처"
                name="phone"
                rules={[
                  { required: true, message: '연락처를 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="예: +62 812-3456-7890" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="NPWP (세금 번호)"
                name="npwp"
              >
                <Input size="large" placeholder="NPWP 번호를 입력하세요" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="주소"
            name="address"
            rules={[
              { required: true, message: '주소를 입력해주세요' },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="주소를 입력하세요"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="비상 연락처 (이름)"
                name="emergencyContact"
                rules={[
                  { required: true, message: '비상 연락처 이름을 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="비상시 연락할 사람의 이름" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="비상 연락처 (전화번호)"
                name="emergencyPhone"
                rules={[
                  { required: true, message: '비상 연락처 전화번호를 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="예: +62 812-3456-7890" />
              </Form.Item>
            </Col>
          </Row>

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
    </div>
  );
};