import { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button,
  Row,
  Col,
  message,
  Typography,
  Divider,
  Select,
  Upload,
  Avatar,
  Space
} from 'antd';
import { 
  BankOutlined,
  SaveOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';

const { Text, Title } = Typography;

// Helper function to get the correct logo URL
const getLogoUrl = (logoUrl?: string): string | null => {
  if (!logoUrl) return null;
  
  // If it's already a full URL, return as is
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl;
  }
  
  // If it's a relative path, prepend the API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const baseUrl = API_BASE_URL.replace('/api/v1', ''); // Remove /api/v1 if present
  return `${baseUrl}${logoUrl}`;
};

interface CompanyInfo {
  id: string;
  name: string;
  biz_no?: string;
  ceo_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  settings?: any;
}



export const CompanyInfoSettings = () => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleTokenExpired = () => {
    message.error('로그인이 만료되었습니다. 다시 로그인해주세요.');
    logout();
    navigate('/login');
  };


  useEffect(() => {
    if (companyInfo) {
      form.setFieldsValue(companyInfo);
    }
  }, [companyInfo, form]);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    if (!user) {
      message.error('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    setIsLoading(true);
    try {
      // Use apiClient to benefit from automatic token refresh
      const response = await apiClient.get('/company/my-company');
      setCompanyInfo(response.data);
    } catch (error: any) {
      console.error('Error fetching company info:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleTokenExpired();
        return;
      }
      message.error('회사 정보를 불러오는데 실패했습니다. 관리자에게 문의하세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (companyInfo) {
      form.setFieldsValue(companyInfo);
    }
  };

  if (!companyInfo) {
    return (
      <div className="flex justify-center items-center h-64">
        <div>회사 정보를 불러오는 중...</div>
      </div>
    );
  }

  const handleSubmit = async (values: any) => {
    if (!companyInfo) {
      message.error('회사 정보가 로드되지 않았습니다.');
      return;
    }

    setIsLoading(true);
    try {
      // Clean up the values - only send fields that exist in the form
      const cleanedValues = {
        name: values.name,
        biz_no: values.biz_no || null,
        ceo_name: values.ceo_name || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
      };

      // Use apiClient to benefit from automatic token refresh
      const response = await apiClient.patch(`/company/${companyInfo.id}`, cleanedValues);
      setCompanyInfo(response.data);
      setIsEditing(false);
      
      // Invalidate React Query cache to update MainLayout immediately
      queryClient.invalidateQueries({ queryKey: ['company-info'] });
      
      message.success('회사 정보가 성공적으로 저장되었습니다');
    } catch (error: any) {
      console.error('Error updating company info:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleTokenExpired();
        return;
      }
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다';
      message.error(`회사 정보 저장에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!companyInfo) {
      message.error('회사 정보가 로드되지 않았습니다.');
      return false;
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('JPG, PNG, GIF, WebP 형식의 이미지만 업로드 가능합니다.');
      return false;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      message.error('파일 크기는 5MB 이하여야 합니다.');
      return false;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      // Use apiClient to benefit from automatic token refresh
      const response = await apiClient.post(`/company/${companyInfo.id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setCompanyInfo(response.data);
      
      // Invalidate React Query cache to update MainLayout immediately
      queryClient.invalidateQueries({ queryKey: ['company-info'] });
      
      message.success('로고가 성공적으로 업로드되었습니다');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleTokenExpired();
        return false;
      }
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다';
      message.error(`로고 업로드에 실패했습니다: ${errorMessage}`);
    }

    return false; // Prevent default upload behavior
  };

  const handleLogoDelete = async () => {
    if (!companyInfo) {
      message.error('회사 정보가 로드되지 않았습니다.');
      return;
    }

    try {
      // Use apiClient to benefit from automatic token refresh
      const response = await apiClient.delete(`/company/${companyInfo.id}/logo`);
      setCompanyInfo(response.data);
      
      // Invalidate React Query cache to update MainLayout immediately
      queryClient.invalidateQueries({ queryKey: ['company-info'] });
      
      message.success('로고가 삭제되었습니다');
    } catch (error: any) {
      console.error('Error deleting logo:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleTokenExpired();
        return;
      }
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다';
      message.error(`로고 삭제에 실패했습니다: ${errorMessage}`);
    }
  };

  const uploadProps: UploadProps = {
    name: 'logo',
    beforeUpload: handleLogoUpload,
    showUploadList: false,
    accept: 'image/*',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Text strong className="text-lg">회사 기본 정보</Text>
          <div className="text-gray-500 text-sm mt-1">
            회사의 기본 정보를 관리하세요
          </div>
        </div>
        {!isEditing && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            정보 수정
          </Button>
        )}
      </div>

      <Card className="bg-blue-50">
        <div className="flex items-start gap-3">
          <BankOutlined className="text-blue-600 mt-1" />
          <div>
            <Text strong className="text-blue-800">회사 정보 관리</Text>
            <div className="text-blue-700 text-sm mt-1">
              회사의 기본 정보는 시스템 전반에서 사용됩니다. 
              정확한 정보를 입력해주세요.
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={!isEditing}
          autoComplete="off"
        >
          {/* 회사 로고 */}
          <div className="text-center mb-6">
            <Avatar 
              size={80} 
              icon={<BankOutlined />} 
              src={getLogoUrl(companyInfo.logo_url)}
              className="mb-4"
            />
            {isEditing && (
              <div>
                <Space>
                  <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />} size="small">
                      로고 변경
                    </Button>
                  </Upload>
                  {companyInfo.logo_url && (
                    <Button 
                      icon={<DeleteOutlined />} 
                      size="small" 
                      danger
                      onClick={handleLogoDelete}
                    >
                      삭제
                    </Button>
                  )}
                </Space>
              </div>
            )}
          </div>

          <Title level={5}>기본 정보</Title>
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                label="회사명"
                name="name"
                rules={[
                  { required: true, message: '회사명을 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="회사명을 입력하세요" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="사업자등록번호"
                name="biz_no"
                rules={[
                  { pattern: /^\d{3}-\d{2}-\d{5}$/, message: '올바른 형식으로 입력해주세요 (000-00-00000)' },
                ]}
              >
                <Input size="large" placeholder="000-00-00000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                label="대표자명"
                name="ceo_name"
              >
                <Input size="large" placeholder="대표자명을 입력하세요" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>연락처 정보</Title>
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                label="전화번호"
                name="phone"
              >
                <Input size="large" placeholder="02-0000-0000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col span={24}>
              <Form.Item
                label="이메일"
                name="email"
                rules={[
                  { type: 'email', message: '올바른 이메일 형식으로 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="contact@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>주소 정보</Title>
          <Form.Item
            label="주소"
            name="address"
          >
            <Input size="large" placeholder="주소를 입력하세요" />
          </Form.Item>

          {isEditing && (
            <Form.Item className="mb-0 text-right">
              <Button 
                size="large" 
                onClick={handleCancel}
                className="mr-2"
              >
                취소
              </Button>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={isLoading}
                icon={<SaveOutlined />}
              >
                저장
              </Button>
            </Form.Item>
          )}
        </Form>
      </Card>
    </div>
  );
};