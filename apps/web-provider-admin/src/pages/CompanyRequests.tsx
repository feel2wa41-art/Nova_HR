import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Typography,
  Descriptions,
  Row,
  Col,
  Badge,
  Tooltip,
  Alert,
  App,
  Select
} from 'antd';
import { 
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { companyAPI, type CompanyRequest } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;
const { TextArea } = Input;


const CompanyRequests: React.FC = () => {
  const [selectedRequest, setSelectedRequest] = useState<CompanyRequest | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [addCompanyModalVisible, setAddCompanyModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [form] = Form.useForm();
  const [addCompanyForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { message } = App.useApp();

  // Debug information
  useEffect(() => {
    console.log('CompanyRequests component mounted');
    console.log('User:', user);
    console.log('Is Authenticated:', isAuthenticated);
    console.log('Auth token:', localStorage.getItem('provider_admin_token'));
  }, [user, isAuthenticated]);

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['company-requests'],
    queryFn: companyAPI.getRegistrationRequests,
    enabled: !!user && isAuthenticated, // Only run query if user is authenticated
  });

  // Debug query state
  useEffect(() => {
    console.log('Query state - loading:', isLoading, 'error:', error, 'requests:', requests);
  }, [isLoading, error, requests]);

  const handleApprove = (request: CompanyRequest) => {
    setSelectedRequest(request);
    setActionType('approve');
    setActionModalVisible(true);
    form.setFieldValue('action', 'approve');
  };

  const handleReject = (request: CompanyRequest) => {
    setSelectedRequest(request);
    setActionType('reject');
    setActionModalVisible(true);
    form.setFieldValue('action', 'reject');
  };

  const handleView = (request: CompanyRequest) => {
    setSelectedRequest(request);
    setViewModalVisible(true);
  };

  const processRequestMutation = useMutation({
    mutationFn: async (data: { id: string; action: string; notes?: string }) => {
      if (data.action === 'approve') {
        return companyAPI.approveRegistration(data.id, data.notes);
      } else {
        return companyAPI.rejectRegistration(data.id, data.notes);
      }
    },
    onSuccess: () => {
      message.success(actionType === 'approve' ? '기업 등록이 승인되었습니다' : '기업 등록이 거부되었습니다');
      queryClient.invalidateQueries({ queryKey: ['company-requests'] });
      setActionModalVisible(false);
      setSelectedRequest(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '처리 중 오류가 발생했습니다');
    },
  });

  const handleSubmitAction = () => {
    form.validateFields().then(values => {
      if (!selectedRequest) return;

      processRequestMutation.mutate({
        id: selectedRequest.id,
        action: actionType,
        notes: values.notes
      });
    });
  };

  // 기업 직접 추가 뮤테이션
  const addCompanyMutation = useMutation({
    mutationFn: companyAPI.createCompany,
    onSuccess: () => {
      message.success('기업이 성공적으로 추가되었습니다');
      queryClient.invalidateQueries({ queryKey: ['company-requests'] });
      setAddCompanyModalVisible(false);
      addCompanyForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '기업 추가 중 오류가 발생했습니다');
    },
  });

  const handleAddCompany = () => {
    addCompanyForm.validateFields().then(values => {
      addCompanyMutation.mutate({
        name: values.name,
        business_number: values.business_number,
        ceo_name: values.ceo_name,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone,
        address: values.address,
        address_detail: values.address_detail,
        industry: values.industry,
        plan: values.plan || 'BASIC',
        description: values.description,
      });
    });
  };

  const columns: ColumnsType<CompanyRequest> = [
    {
      title: '회사명',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (text: string, record: CompanyRequest) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            CEO: {record.ceo_name}
          </Text>
        </div>
      ),
    },
    {
      title: '연락처',
      key: 'contact',
      render: (record: CompanyRequest) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <MailOutlined style={{ marginRight: '4px', color: '#666' }} />
            <Text style={{ fontSize: '12px' }}>{record.contact_email}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <PhoneOutlined style={{ marginRight: '4px', color: '#666' }} />
            <Text style={{ fontSize: '12px' }}>{record.contact_phone}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '신청일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          PENDING: 'processing',
          APPROVED: 'success',
          REJECTED: 'error',
        };
        const labels = {
          PENDING: '대기중',
          APPROVED: '승인됨',
          REJECTED: '거부됨',
        };
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'actions',
      width: 200,
      render: (record: CompanyRequest) => (
        <Space>
          <Tooltip title="상세보기">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleView(record)}
              size="small"
            />
          </Tooltip>
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="승인">
                <Button 
                  type="text" 
                  icon={<CheckOutlined />}
                  onClick={() => handleApprove(record)}
                  style={{ color: '#52c41a' }}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="거부">
                <Button 
                  type="text" 
                  icon={<CloseOutlined />}
                  onClick={() => handleReject(record)}
                  style={{ color: '#ff4d4f' }}
                  size="small"
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const pendingCount = requests.filter(req => req.status === 'PENDING').length;

  return (
    <div>
      {/* Debug information */}
      {error && (
        <Alert
          message="API Error"
          description={error?.message || 'Failed to load company requests'}
          type="error"
          style={{ marginBottom: 16 }}
        />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          🏢 기업 가입 신청 관리
        </Title>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setAddCompanyModalVisible(true)}
          >
            기업 직접 추가
          </Button>
          <Badge count={pendingCount} offset={[10, 0]}>
            <BankOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          </Badge>
        </Space>
      </div>

      {/* 통계 요약 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                {pendingCount}
              </div>
              <div style={{ color: '#666' }}>대기중 신청</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {requests.filter(req => req.status === 'APPROVED').length}
              </div>
              <div style={{ color: '#666' }}>승인됨</div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {requests.length}
              </div>
              <div style={{ color: '#666' }}>전체 신청</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `총 ${total}개 신청`
          }}
        />
      </Card>

      {/* 상세보기 모달 */}
      <Modal
        title="기업 가입 신청 상세정보"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRequest && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="회사명" span={2}>
              <Text strong>{selectedRequest.company_name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="사업자번호">
              {selectedRequest.business_number || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="대표자">
              {selectedRequest.ceo_name}
            </Descriptions.Item>
            <Descriptions.Item label="이메일">
              {selectedRequest.contact_email}
            </Descriptions.Item>
            <Descriptions.Item label="연락처">
              {selectedRequest.contact_phone}
            </Descriptions.Item>
            <Descriptions.Item label="주소" span={2}>
              {selectedRequest.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="회사소개" span={2}>
              {selectedRequest.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="요청사항" span={2}>
              {selectedRequest.notes || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="신청일">
              {new Date(selectedRequest.created_at).toLocaleString('ko-KR')}
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              <Tag color={
                selectedRequest.status === 'PENDING' ? 'processing' : 
                selectedRequest.status === 'APPROVED' ? 'success' : 'error'
              }>
                {selectedRequest.status === 'PENDING' ? '대기중' :
                 selectedRequest.status === 'APPROVED' ? '승인됨' : '거부됨'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 승인/거부 모달 */}
      <Modal
        title={actionType === 'approve' ? '기업 등록 승인' : '기업 등록 거부'}
        open={actionModalVisible}
        onOk={handleSubmitAction}
        onCancel={() => {
          setActionModalVisible(false);
          setSelectedRequest(null);
          form.resetFields();
        }}
        confirmLoading={processRequestMutation.isPending}
        okButtonProps={{
          style: { 
            backgroundColor: actionType === 'approve' ? '#52c41a' : '#ff4d4f',
            borderColor: actionType === 'approve' ? '#52c41a' : '#ff4d4f'
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="action" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="notes"
            label={actionType === 'approve' ? '승인 사유' : '거부 사유'}
            help={actionType === 'approve' ? '승인 사유를 입력해주세요' : '거부 사유를 입력해주세요 (필수)'}
            rules={actionType === 'reject' ? [{ required: true, message: '거부 사유를 입력해주세요' }] : []}
          >
            <TextArea 
              rows={4} 
              placeholder={
                actionType === 'approve' 
                  ? '승인 사유나 추가 안내사항을 입력하세요...' 
                  : '거부 사유를 구체적으로 입력해주세요...'
              } 
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 기업 직접 추가 모달 */}
      <Modal
        title="기업 직접 추가"
        open={addCompanyModalVisible}
        onOk={handleAddCompany}
        onCancel={() => {
          setAddCompanyModalVisible(false);
          addCompanyForm.resetFields();
        }}
        confirmLoading={addCompanyMutation.isPending}
        width={800}
        okText="추가"
        cancelText="취소"
      >
        <Form form={addCompanyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="회사명"
                rules={[{ required: true, message: '회사명을 입력해주세요' }]}
              >
                <Input placeholder="회사명을 입력하세요" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="business_number"
                label="사업자번호"
              >
                <Input placeholder="사업자번호를 입력하세요" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="ceo_name"
                label="대표자"
                rules={[{ required: true, message: '대표자명을 입력해주세요' }]}
              >
                <Input placeholder="대표자명을 입력하세요" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="plan"
                label="요금제"
                initialValue="BASIC"
              >
                <Select placeholder="요금제를 선택하세요">
                  <Select.Option value="BASIC">BASIC</Select.Option>
                  <Select.Option value="PROFESSIONAL">PROFESSIONAL</Select.Option>
                  <Select.Option value="ENTERPRISE">ENTERPRISE</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contact_email"
                label="이메일"
                rules={[
                  { required: true, message: '이메일을 입력해주세요' },
                  { type: 'email', message: '올바른 이메일 형식을 입력해주세요' }
                ]}
              >
                <Input placeholder="이메일을 입력하세요" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact_phone"
                label="연락처"
                rules={[{ required: true, message: '연락처를 입력해주세요' }]}
              >
                <Input placeholder="연락처를 입력하세요" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="주소"
          >
            <Input placeholder="주소를 입력하세요" />
          </Form.Item>

          <Form.Item
            name="address_detail"
            label="상세주소"
          >
            <Input placeholder="상세주소를 입력하세요" />
          </Form.Item>

          <Form.Item
            name="industry"
            label="업종"
          >
            <Input placeholder="업종을 입력하세요" />
          </Form.Item>

          <Form.Item
            name="description"
            label="회사소개"
          >
            <TextArea rows={4} placeholder="회사소개를 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompanyRequests;