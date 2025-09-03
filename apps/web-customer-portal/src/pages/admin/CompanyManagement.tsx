import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Tabs, 
  Modal, 
  Form, 
  Input,
  message,
  Popconfirm,
  Badge,
  Descriptions,
  Row,
  Col
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BankOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { apiClient } from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Company {
  id: string;
  name: string;
  biz_no: string;
  ceo_name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  created_at: string;
  tenant: {
    name: string;
    domain: string;
    status: string;
    plan: string;
    max_users: number;
  };
  _count: {
    users: number;
    locations: number;
  };
}

interface CompanyRegistrationRequest {
  id: string;
  company_name: string;
  business_number: string;
  ceo_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by: string;
  created_at: string;
  requester: {
    name: string;
    email: string;
  };
}

export default function CompanyManagement() {
  const [activeTab, setActiveTab] = useState('companies');
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CompanyRegistrationRequest | null>(null);
  const [approvalForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Get all companies
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: () => apiClient.get('/company/all').then(res => res.data),
    enabled: activeTab === 'companies',
  });

  // Get company registration requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['company-registration-requests'],
    queryFn: () => apiClient.get('/company/registration-requests').then(res => res.data),
    enabled: activeTab === 'requests',
  });

  // Approve company registration
  const approveCompanyMutation = useMutation({
    mutationFn: (data: { id: string; notes?: string }) =>
      apiClient.post(`/company/registration-requests/${data.id}/approve`, { notes: data.notes }),
    onSuccess: () => {
      message.success('회사 등록이 승인되었습니다');
      queryClient.invalidateQueries({ queryKey: ['company-registration-requests'] });
      setApprovalModalVisible(false);
      setSelectedRequest(null);
      approvalForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다');
    },
  });

  // Reject company registration
  const rejectCompanyMutation = useMutation({
    mutationFn: (data: { id: string; notes?: string }) =>
      apiClient.post(`/company/registration-requests/${data.id}/reject`, { notes: data.notes }),
    onSuccess: () => {
      message.success('회사 등록이 거부되었습니다');
      queryClient.invalidateQueries({ queryKey: ['company-registration-requests'] });
      setApprovalModalVisible(false);
      setSelectedRequest(null);
      approvalForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '거부 처리 중 오류가 발생했습니다');
    },
  });

  const handleApprove = (request: CompanyRegistrationRequest) => {
    setSelectedRequest(request);
    setApprovalModalVisible(true);
    approvalForm.setFieldValue('action', 'approve');
  };

  const handleReject = (request: CompanyRegistrationRequest) => {
    setSelectedRequest(request);
    setApprovalModalVisible(true);
    approvalForm.setFieldValue('action', 'reject');
  };

  const handleApprovalSubmit = () => {
    approvalForm.validateFields().then(values => {
      if (!selectedRequest) return;

      const data = {
        id: selectedRequest.id,
        notes: values.notes
      };

      if (values.action === 'approve') {
        approveCompanyMutation.mutate(data);
      } else {
        rejectCompanyMutation.mutate(data);
      }
    });
  };

  const companyColumns = [
    {
      title: '회사명',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Company) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" className="text-xs">{record.tenant.domain}</Text>
        </div>
      ),
    },
    {
      title: 'CEO',
      dataIndex: 'ceo_name',
      key: 'ceo_name',
    },
    {
      title: '연락처',
      key: 'contact',
      render: (record: Company) => (
        <div>
          <div>{record.email}</div>
          <div className="text-xs text-gray-500">{record.phone}</div>
        </div>
      ),
    },
    {
      title: '사용자 수',
      key: 'users',
      render: (record: Company) => (
        <Badge count={record._count.users} color="blue" />
      ),
    },
    {
      title: '플랜',
      key: 'plan',
      render: (record: Company) => (
        <Tag color={record.tenant.plan === 'PREMIUM' ? 'gold' : 'blue'}>
          {record.tenant.plan}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      render: (record: Company) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => {
              // TODO: View company details
            }}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => {
              // TODO: Edit company
            }}
          />
        </Space>
      ),
    },
  ];

  const requestColumns = [
    {
      title: '회사명',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (text: string, record: CompanyRegistrationRequest) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" className="text-xs">CEO: {record.ceo_name}</Text>
        </div>
      ),
    },
    {
      title: '요청자',
      key: 'requester',
      render: (record: CompanyRegistrationRequest) => (
        <div>
          <div>{record.requester.name}</div>
          <div className="text-xs text-gray-500">{record.requester.email}</div>
        </div>
      ),
    },
    {
      title: '연락처',
      key: 'contact',
      render: (record: CompanyRegistrationRequest) => (
        <div>
          <div>{record.contact_email}</div>
          <div className="text-xs text-gray-500">{record.contact_phone}</div>
        </div>
      ),
    },
    {
      title: '요청일',
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
          PENDING: '대기',
          APPROVED: '승인',
          REJECTED: '거부',
        };
        return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>;
      },
    },
    {
      title: '작업',
      key: 'actions',
      render: (record: CompanyRegistrationRequest) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedRequest(record);
              setViewModalVisible(true);
            }}
          />
          {record.status === 'PENDING' && (
            <>
              <Button 
                type="text" 
                icon={<CheckOutlined />}
                className="text-green-600"
                onClick={() => handleApprove(record)}
              />
              <Button 
                type="text" 
                icon={<CloseOutlined />}
                className="text-red-600" 
                onClick={() => handleReject(record)}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  const pendingRequestsCount = requests?.filter((r: CompanyRegistrationRequest) => r.status === 'PENDING').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>
          <BankOutlined className="mr-3" />
          회사 관리
        </Title>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'companies',
            label: '등록된 회사',
            children: (
              <Card>
                <div className="mb-4">
                  <Row gutter={16}>
                    <Col span={6}>
                      <Card size="small">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{companies?.length || 0}</div>
                          <div className="text-gray-500">전체 회사</div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {companies?.filter((c: Company) => c.status === 'ACTIVE').length || 0}
                          </div>
                          <div className="text-gray-500">활성 회사</div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {companies?.reduce((sum: number, c: Company) => sum + c._count.users, 0) || 0}
                          </div>
                          <div className="text-gray-500">전체 사용자</div>
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </div>
                <Table
                  columns={companyColumns}
                  dataSource={companies}
                  loading={companiesLoading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            )
          },
          {
            key: 'requests',
            label: (
              <span>
                등록 요청
                {pendingRequestsCount > 0 && (
                  <Badge count={pendingRequestsCount} offset={[10, -5]} />
                )}
              </span>
            ),
            children: (
              <Card>
                <Table
                  columns={requestColumns}
                  dataSource={requests}
                  loading={requestsLoading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            )
          }
        ]}
      />

      {/* View Request Modal */}
      <Modal
        title="회사 등록 요청 상세"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRequest && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="회사명" span={2}>
              {selectedRequest.company_name}
            </Descriptions.Item>
            <Descriptions.Item label="사업자번호">
              {selectedRequest.business_number || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="CEO">
              {selectedRequest.ceo_name}
            </Descriptions.Item>
            <Descriptions.Item label="연락처 이메일">
              {selectedRequest.contact_email}
            </Descriptions.Item>
            <Descriptions.Item label="연락처 전화">
              {selectedRequest.contact_phone}
            </Descriptions.Item>
            <Descriptions.Item label="주소" span={2}>
              {selectedRequest.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="요청자">
              {selectedRequest.requester.name} ({selectedRequest.requester.email})
            </Descriptions.Item>
            <Descriptions.Item label="요청일">
              {new Date(selectedRequest.created_at).toLocaleString('ko-KR')}
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              <Tag color={selectedRequest.status === 'PENDING' ? 'processing' : selectedRequest.status === 'APPROVED' ? 'success' : 'error'}>
                {selectedRequest.status === 'PENDING' ? '대기' : selectedRequest.status === 'APPROVED' ? '승인' : '거부'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="설명" span={2}>
              {selectedRequest.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal
        title={approvalForm.getFieldValue('action') === 'approve' ? '회사 등록 승인' : '회사 등록 거부'}
        open={approvalModalVisible}
        onOk={handleApprovalSubmit}
        onCancel={() => {
          setApprovalModalVisible(false);
          setSelectedRequest(null);
          approvalForm.resetFields();
        }}
        confirmLoading={approveCompanyMutation.isPending || rejectCompanyMutation.isPending}
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item name="action" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="notes"
            label="처리 의견"
            help={approvalForm.getFieldValue('action') === 'approve' ? "승인 사유를 입력해주세요" : "거부 사유를 입력해주세요"}
          >
            <TextArea rows={4} placeholder="처리 의견을 입력하세요..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}