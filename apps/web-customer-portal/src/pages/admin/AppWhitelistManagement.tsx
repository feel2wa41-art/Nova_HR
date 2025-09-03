import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Tag, 
  Space, 
  Button,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Spin,
  Empty,
  message,
  Tabs,
  Popconfirm,
} from 'antd';
import {
  AppstoreOutlined,
  GlobalOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface AppWhitelist {
  id: string;
  app_name: string;
  category: 'PRODUCTIVITY' | 'COMMUNICATION' | 'ENTERTAINMENT' | 'SOCIAL_MEDIA' | 'DEVELOPMENT' | 'DESIGN' | 'OTHER';
  description?: string;
  created_at: string;
}

interface WebWhitelist {
  id: string;
  domain: string;
  category: 'WORK' | 'EDUCATION' | 'SOCIAL_MEDIA' | 'ENTERTAINMENT' | 'NEWS' | 'SHOPPING' | 'OTHER';
  description?: string;
  created_at: string;
}

const AppWhitelistManagement: React.FC = () => {
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [webModalVisible, setWebModalVisible] = useState(false);
  const [editingApp, setEditingApp] = useState<AppWhitelist | null>(null);
  const [editingWeb, setEditingWeb] = useState<WebWhitelist | null>(null);
  const [appForm] = Form.useForm();
  const [webForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Get app whitelist
  const { data: appWhitelist = [], isLoading: appLoading } = useQuery({
    queryKey: ['app-whitelist'],
    queryFn: () => apiClient.get('/attitude/admin/whitelist/app').then(res => res.data),
    staleTime: 30000,
  });

  // Get web whitelist
  const { data: webWhitelist = [], isLoading: webLoading } = useQuery({
    queryKey: ['web-whitelist'],
    queryFn: () => apiClient.get('/attitude/admin/whitelist/web').then(res => res.data),
    staleTime: 30000,
  });

  // Add app to whitelist
  const addAppMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/attitude/admin/whitelist/app', data),
    onSuccess: () => {
      message.success('앱이 화이트리스트에 추가되었습니다');
      queryClient.invalidateQueries({ queryKey: ['app-whitelist'] });
      setAppModalVisible(false);
      appForm.resetFields();
      setEditingApp(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '앱 추가에 실패했습니다');
    },
  });

  // Add web to whitelist
  const addWebMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/attitude/admin/whitelist/web', data),
    onSuccess: () => {
      message.success('웹사이트가 화이트리스트에 추가되었습니다');
      queryClient.invalidateQueries({ queryKey: ['web-whitelist'] });
      setWebModalVisible(false);
      webForm.resetFields();
      setEditingWeb(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '웹사이트 추가에 실패했습니다');
    },
  });

  // Delete app from whitelist
  const deleteAppMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/attitude/admin/whitelist/app/${id}`),
    onSuccess: () => {
      message.success('앱이 화이트리스트에서 제거되었습니다');
      queryClient.invalidateQueries({ queryKey: ['app-whitelist'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '앱 제거에 실패했습니다');
    },
  });

  // Delete web from whitelist
  const deleteWebMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/attitude/admin/whitelist/web/${id}`),
    onSuccess: () => {
      message.success('웹사이트가 화이트리스트에서 제거되었습니다');
      queryClient.invalidateQueries({ queryKey: ['web-whitelist'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '웹사이트 제거에 실패했습니다');
    },
  });

  const handleAddApp = () => {
    setEditingApp(null);
    appForm.resetFields();
    setAppModalVisible(true);
  };

  const handleEditApp = (app: AppWhitelist) => {
    setEditingApp(app);
    appForm.setFieldsValue(app);
    setAppModalVisible(true);
  };

  const handleAddWeb = () => {
    setEditingWeb(null);
    webForm.resetFields();
    setWebModalVisible(true);
  };

  const handleEditWeb = (web: WebWhitelist) => {
    setEditingWeb(web);
    webForm.setFieldsValue(web);
    setWebModalVisible(true);
  };

  const handleAppSubmit = (values: any) => {
    addAppMutation.mutate(values);
  };

  const handleWebSubmit = (values: any) => {
    addWebMutation.mutate(values);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PRODUCTIVITY':
      case 'DEVELOPMENT':
      case 'WORK':
      case 'EDUCATION':
        return 'green';
      case 'COMMUNICATION':
      case 'NEWS':
      case 'OTHER':
        return 'blue';
      case 'ENTERTAINMENT':
      case 'SOCIAL_MEDIA':
      case 'SHOPPING':
      case 'DESIGN':
        return 'orange';
      default:
        return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: any = {
      'PRODUCTIVITY': '생산성',
      'COMMUNICATION': '커뮤니케이션',
      'ENTERTAINMENT': '엔터테인먼트',
      'SOCIAL_MEDIA': '소셜미디어',
      'DEVELOPMENT': '개발',
      'DESIGN': '디자인',
      'WORK': '업무',
      'EDUCATION': '교육',
      'NEWS': '뉴스',
      'SHOPPING': '쇼핑',
      'OTHER': '기타'
    };
    return labels[category] || category;
  };

  const appColumns = [
    {
      title: '앱 이름',
      dataIndex: 'app_name',
      key: 'app_name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryLabel(category)}
        </Tag>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || '-',
    },
    {
      title: '등록일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '액션',
      key: 'actions',
      render: (_: any, record: AppWhitelist) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditApp(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => deleteAppMutation.mutate(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const webColumns = [
    {
      title: '도메인',
      dataIndex: 'domain',
      key: 'domain',
      render: (domain: string) => <Text strong>{domain}</Text>,
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryLabel(category)}
        </Tag>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || '-',
    },
    {
      title: '등록일',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '액션',
      key: 'actions',
      render: (_: any, record: WebWhitelist) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditWeb(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => deleteWebMutation.mutate(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>⚙️ 생산성 화이트리스트 관리</Title>
        <Text type="secondary">
          생산적인 앱과 웹사이트를 등록하여 사용자의 생산성 점수를 정확하게 계산합니다.
        </Text>
      </div>

      <Tabs 
        defaultActiveKey="apps" 
        type="card"
        items={[
          {
            key: 'apps',
            label: (
              <span>
                <AppstoreOutlined />
                앱 화이트리스트
              </span>
            ),
            children: (
              <Card 
                title="생산적인 앱 목록" 
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddApp}>
                    앱 추가
                  </Button>
                }
              >
                <Spin spinning={appLoading}>
                  {appWhitelist.length === 0 ? (
                    <Empty description="등록된 앱이 없습니다" />
                  ) : (
                    <Table
                      dataSource={appWhitelist}
                      columns={appColumns}
                      rowKey="id"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `총 ${total}개 앱`,
                      }}
                    />
                  )}
                </Spin>
              </Card>
            ),
          },
          {
            key: 'websites',
            label: (
              <span>
                <GlobalOutlined />
                웹사이트 화이트리스트
              </span>
            ),
            children: (
              <Card 
                title="생산적인 웹사이트 목록" 
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddWeb}>
                    웹사이트 추가
                  </Button>
                }
              >
                <Spin spinning={webLoading}>
                  {webWhitelist.length === 0 ? (
                    <Empty description="등록된 웹사이트가 없습니다" />
                  ) : (
                    <Table
                      dataSource={webWhitelist}
                      columns={webColumns}
                      rowKey="id"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `총 ${total}개 웹사이트`,
                      }}
                    />
                  )}
                </Spin>
              </Card>
            ),
          },
        ]}
      />

      {/* App Modal */}
      <Modal
        title={editingApp ? '앱 수정' : '앱 추가'}
        open={appModalVisible}
        onCancel={() => {
          setAppModalVisible(false);
          setEditingApp(null);
          appForm.resetFields();
        }}
        onOk={() => appForm.submit()}
        confirmLoading={addAppMutation.isPending}
      >
        <Form
          form={appForm}
          layout="vertical"
          onFinish={handleAppSubmit}
        >
          <Form.Item
            label="앱 이름"
            name="app_name"
            rules={[{ required: true, message: '앱 이름을 입력하세요' }]}
          >
            <Input placeholder="예: Microsoft Excel, Visual Studio Code" />
          </Form.Item>
          <Form.Item
            label="카테고리"
            name="category"
            rules={[{ required: true, message: '카테고리를 선택하세요' }]}
          >
            <Select placeholder="앱 카테고리 선택">
              <Option value="PRODUCTIVITY">생산성</Option>
              <Option value="COMMUNICATION">커뮤니케이션</Option>
              <Option value="DEVELOPMENT">개발</Option>
              <Option value="DESIGN">디자인</Option>
              <Option value="ENTERTAINMENT">엔터테인먼트</Option>
              <Option value="SOCIAL_MEDIA">소셜미디어</Option>
              <Option value="OTHER">기타</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="설명"
            name="description"
          >
            <Input.TextArea 
              placeholder="앱에 대한 간단한 설명을 입력하세요"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Web Modal */}
      <Modal
        title={editingWeb ? '웹사이트 수정' : '웹사이트 추가'}
        open={webModalVisible}
        onCancel={() => {
          setWebModalVisible(false);
          setEditingWeb(null);
          webForm.resetFields();
        }}
        onOk={() => webForm.submit()}
        confirmLoading={addWebMutation.isPending}
      >
        <Form
          form={webForm}
          layout="vertical"
          onFinish={handleWebSubmit}
        >
          <Form.Item
            label="도메인"
            name="domain"
            rules={[{ required: true, message: '도메인을 입력하세요' }]}
          >
            <Input placeholder="예: github.com, stackoverflow.com" />
          </Form.Item>
          <Form.Item
            label="카테고리"
            name="category"
            rules={[{ required: true, message: '카테고리를 선택하세요' }]}
          >
            <Select placeholder="웹사이트 카테고리 선택">
              <Option value="WORK">업무</Option>
              <Option value="EDUCATION">교육</Option>
              <Option value="NEWS">뉴스</Option>
              <Option value="SOCIAL_MEDIA">소셜미디어</Option>
              <Option value="ENTERTAINMENT">엔터테인먼트</Option>
              <Option value="SHOPPING">쇼핑</Option>
              <Option value="OTHER">기타</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="설명"
            name="description"
          >
            <Input.TextArea 
              placeholder="웹사이트에 대한 간단한 설명을 입력하세요"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AppWhitelistManagement;