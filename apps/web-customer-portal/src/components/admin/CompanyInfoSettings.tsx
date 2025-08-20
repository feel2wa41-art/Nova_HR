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
  Avatar
} from 'antd';
import { 
  BankOutlined,
  SaveOutlined,
  UploadOutlined,
  EditOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CompanyInfo {
  id: string;
  name: string;
  businessNumber: string;
  representativeName: string;
  phoneNumber: string;
  faxNumber?: string;
  email: string;
  website?: string;
  address: string;
  detailAddress?: string;
  postalCode: string;
  industry: string;
  employeeCount: string;
  establishedDate: string;
  logo?: string;
  description?: string;
}

const mockCompanyInfo: CompanyInfo = {
  id: '1',
  name: 'TANK Development',
  businessNumber: '123-45-67890',
  representativeName: '김대표',
  phoneNumber: '02-1234-5678',
  faxNumber: '02-1234-5679',
  email: 'contact@tank-dev.com',
  website: 'https://tank-dev.com',
  address: '서울특별시 강남구 테헤란로 123',
  detailAddress: '456빌딩 7층',
  postalCode: '06234',
  industry: 'IT서비스업',
  employeeCount: '50-99명',
  establishedDate: '2020-01-15',
  description: '혁신적인 HR 솔루션을 제공하는 IT 전문 기업입니다.',
};

const industryOptions = [
  'IT서비스업',
  '제조업',
  '금융업',
  '교육업',
  '의료업',
  '건설업',
  '유통업',
  '서비스업',
  '기타',
];

const employeeCountOptions = [
  '1-9명',
  '10-49명',
  '50-99명',
  '100-299명',
  '300-999명',
  '1000명 이상',
];

export const CompanyInfoSettings = () => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(mockCompanyInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(companyInfo);
  }, [companyInfo, form]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.setFieldsValue(companyInfo);
  };

  const handleSubmit = async (values: CompanyInfo) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCompanyInfo({ ...companyInfo, ...values });
      setIsEditing(false);
      message.success('회사 정보가 성공적으로 저장되었습니다');
    } catch (error) {
      message.error('회사 정보 저장에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'logo',
    action: '/api/v1/upload',
    headers: {
      authorization: 'authorization-text',
    },
    beforeUpload: (file) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        message.error('JPG/PNG 파일만 업로드 가능합니다!');
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('이미지는 2MB보다 작아야 합니다!');
      }
      return isJpgOrPng && isLt2M;
    },
    onChange: (info) => {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 파일이 성공적으로 업로드되었습니다`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 파일 업로드에 실패했습니다.`);
      }
    },
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
              src={companyInfo.logo}
              className="mb-4"
            />
            {isEditing && (
              <div>
                <Upload {...uploadProps} showUploadList={false}>
                  <Button icon={<UploadOutlined />} size="small">
                    로고 변경
                  </Button>
                </Upload>
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
                name="businessNumber"
                rules={[
                  { required: true, message: '사업자등록번호를 입력해주세요' },
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
                name="representativeName"
                rules={[
                  { required: true, message: '대표자명을 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="대표자명을 입력하세요" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="설립일"
                name="establishedDate"
                rules={[
                  { required: true, message: '설립일을 입력해주세요' },
                ]}
              >
                <Input size="large" type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>연락처 정보</Title>
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                label="전화번호"
                name="phoneNumber"
                rules={[
                  { required: true, message: '전화번호를 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="02-0000-0000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="팩스번호"
                name="faxNumber"
              >
                <Input size="large" placeholder="02-0000-0000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                label="이메일"
                name="email"
                rules={[
                  { required: true, message: '이메일을 입력해주세요' },
                  { type: 'email', message: '올바른 이메일 형식으로 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="contact@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="웹사이트"
                name="website"
              >
                <Input size="large" placeholder="https://company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>주소 정보</Title>
          <Row gutter={[16, 0]}>
            <Col span={8}>
              <Form.Item
                label="우편번호"
                name="postalCode"
                rules={[
                  { required: true, message: '우편번호를 입력해주세요' },
                ]}
              >
                <Input size="large" placeholder="12345" />
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
            <Input size="large" placeholder="기본 주소를 입력하세요" />
          </Form.Item>

          <Form.Item
            label="상세주소"
            name="detailAddress"
          >
            <Input size="large" placeholder="상세주소를 입력하세요" />
          </Form.Item>

          <Divider />

          <Title level={5}>사업 정보</Title>
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item
                label="업종"
                name="industry"
                rules={[
                  { required: true, message: '업종을 선택해주세요' },
                ]}
              >
                <Select size="large" placeholder="업종을 선택하세요">
                  {industryOptions.map(industry => (
                    <Option key={industry} value={industry}>
                      {industry}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="직원 수"
                name="employeeCount"
                rules={[
                  { required: true, message: '직원 수를 선택해주세요' },
                ]}
              >
                <Select size="large" placeholder="직원 수를 선택하세요">
                  {employeeCountOptions.map(count => (
                    <Option key={count} value={count}>
                      {count}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="회사 소개"
            name="description"
          >
            <TextArea 
              rows={4} 
              placeholder="회사에 대한 간단한 소개를 입력하세요" 
            />
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