import React, { useState } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  List, 
  Input, 
  Select, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Modal, 
  Form, 
  message,
  Tabs,
  Badge,
  Avatar,
  Tooltip,
  Pagination,
  Empty
} from 'antd';
import { 
  FileTextOutlined, 
  EyeOutlined, 
  SearchOutlined, 
  PlusOutlined,
  FilterOutlined,
  UserOutlined,
  TagOutlined,
  CalendarOutlined,
  HeartOutlined,
  FireOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { DynamicFormRenderer } from '../../components/forms/DynamicFormRenderer';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

interface ReferenceDocument {
  id: string;
  title: string;
  description?: string;
  content: any;
  tags: string[];
  view_count: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  category?: {
    id: string;
    name: string;
    code: string;
    icon?: string;
    form_schema?: any;
  };
  attachments: any[];
  _count: {
    views: number;
  };
}

interface Category {
  id: string;
  name: string;
  code: string;
  icon?: string;
  form_schema?: any;
}

export const ReferenceDocumentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ReferenceDocument | null>(null);
  const [form] = Form.useForm();

  // Fetch reference documents
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['reference-documents', { 
      search: searchQuery, 
      category_id: selectedCategory,
      tag: selectedTag,
      page,
      templates_only: activeTab === 'templates'
    }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category_id', selectedCategory);
      if (selectedTag) params.set('tag', selectedTag);
      if (activeTab === 'templates') params.set('templates_only', 'true');
      params.set('page', page.toString());
      params.set('limit', '20');
      
      return apiClient.get(`/reference-documents?${params.toString()}`).then(res => res.data);
    },
  });

  // Fetch my documents
  const { data: myDocuments } = useQuery({
    queryKey: ['my-reference-documents'],
    queryFn: () => apiClient.get('/reference-documents/my').then(res => res.data),
    enabled: activeTab === 'my',
  });

  // Fetch popular documents
  const { data: popularDocuments } = useQuery({
    queryKey: ['popular-reference-documents'],
    queryFn: () => apiClient.get('/reference-documents/popular?limit=10').then(res => res.data),
    enabled: activeTab === 'popular',
  });

  // Fetch recent documents
  const { data: recentDocuments } = useQuery({
    queryKey: ['recent-reference-documents'],
    queryFn: () => apiClient.get('/reference-documents/recent?limit=10').then(res => res.data),
    enabled: activeTab === 'recent',
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['approval-categories'],
    queryFn: () => apiClient.get('/approval/categories').then(res => res.data),
  });

  // Fetch tags
  const { data: tags = [] } = useQuery<string[]>({
    queryKey: ['reference-document-tags'],
    queryFn: () => apiClient.get('/reference-documents/tags').then(res => res.data),
  });

  // Create document mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/reference-documents', data),
    onSuccess: () => {
      message.success('참고문서가 생성되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['reference-documents'] });
      queryClient.invalidateQueries({ queryKey: ['my-reference-documents'] });
      setCreateModalVisible(false);
      form.resetFields();
    },
    onError: () => {
      message.error('참고문서 생성에 실패했습니다.');
    },
  });

  // Record view mutation
  const recordViewMutation = useMutation({
    mutationFn: (documentId: string) => apiClient.post(`/reference-documents/${documentId}/view`),
  });

  const handleCreate = (values: any) => {
    const { category_id, tags: tagString, ...rest } = values;
    const tagsArray = tagString ? tagString.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];
    
    createMutation.mutate({
      ...rest,
      category_id: category_id || undefined,
      tags: tagsArray,
    });
  };

  const handleView = (document: ReferenceDocument) => {
    setSelectedDocument(document);
    setViewModalVisible(true);
    recordViewMutation.mutate(document.id);
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'my':
        return { data: myDocuments || [], total: myDocuments?.length || 0 };
      case 'popular':
        return { data: popularDocuments || [], total: popularDocuments?.length || 0 };
      case 'recent':
        return { data: recentDocuments || [], total: recentDocuments?.length || 0 };
      default:
        return { 
          data: documentsData?.data || [], 
          total: documentsData?.meta?.total || 0,
          pages: documentsData?.meta?.pages || 1
        };
    }
  };

  const tabData = getTabData();
  const showPagination = activeTab === 'all' || activeTab === 'templates';

  const renderDocumentCard = (document: ReferenceDocument) => (
    <Card 
      key={document.id}
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => handleView(document)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Title level={5} className="!mb-0">{document.title}</Title>
            {document.is_template && <Tag color="blue">템플릿</Tag>}
            {document.category && (
              <Tag color="green" icon={document.category.icon ? undefined : <FileTextOutlined />}>
                {document.category.name}
              </Tag>
            )}
          </div>
          
          {document.description && (
            <Paragraph className="text-gray-600" ellipsis={{ rows: 2 }}>
              {document.description}
            </Paragraph>
          )}
          
          {document.tags.length > 0 && (
            <div className="mb-3">
              {document.tags.map(tag => (
                <Tag key={tag} size="small" icon={<TagOutlined />}>{tag}</Tag>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{document.author.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarOutlined />
                <span>{new Date(document.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <EyeOutlined />
              <span>{document.view_count}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <Title level={2}>참고결재문서</Title>
            <Text type="secondary">다른 사용자들이 참고할 수 있는 결재문서를 작성하고 조회합니다.</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            문서 작성
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'all',
            label: '전체 문서',
            children: null,
          },
          {
            key: 'templates',
            label: '템플릿',
            children: null,
          },
          {
            key: 'popular',
            label: (
              <span>
                <FireOutlined /> 인기 문서
              </span>
            ),
            children: null,
          },
          {
            key: 'recent',
            label: '최근 문서',
            children: null,
          },
          {
            key: 'my',
            label: '내 문서',
            children: null,
          },
        ]}
      />

      {/* Search and Filter */}
      {(activeTab === 'all' || activeTab === 'templates') && (
        <Card className="mb-4">
          <Row gutter={16}>
            <Col span={8}>
              <Search
                placeholder="문서 제목, 내용, 태그 검색"
                allowClear
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={() => setPage(1)}
                enterButton={<SearchOutlined />}
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="카테고리 선택"
                allowClear
                value={selectedCategory}
                onChange={(value) => {
                  setSelectedCategory(value);
                  setPage(1);
                }}
                className="w-full"
              >
                {categories.map(category => (
                  <Option key={category.id} value={category.id}>
                    {category.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="태그 선택"
                allowClear
                value={selectedTag}
                onChange={(value) => {
                  setSelectedTag(value);
                  setPage(1);
                }}
                className="w-full"
              >
                {tags.map(tag => (
                  <Option key={tag} value={tag}>{tag}</Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>
      )}

      {/* Document List */}
      <div className="mb-6">
        {tabData.data.length > 0 ? (
          tabData.data.map(renderDocumentCard)
        ) : (
          <Empty description="문서가 없습니다." />
        )}
      </div>

      {/* Pagination */}
      {showPagination && tabData.total > 20 && (
        <div className="text-center">
          <Pagination
            current={page}
            total={tabData.total}
            pageSize={20}
            onChange={(newPage) => setPage(newPage)}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total, range) => `${range[0]}-${range[1]} / ${total}개`}
          />
        </div>
      )}

      {/* Create Modal */}
      <Modal
        title="참고문서 작성"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          onFinish={handleCreate}
          layout="vertical"
        >
          <Form.Item
            label="제목"
            name="title"
            rules={[{ required: true, message: '제목을 입력해주세요.' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="카테고리"
            name="category_id"
          >
            <Select placeholder="카테고리를 선택하세요" allowClear>
              {categories.map(category => (
                <Option key={category.id} value={category.id}>
                  {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
          >
            <TextArea rows={3} placeholder="문서에 대한 간단한 설명을 입력하세요" />
          </Form.Item>

          <Form.Item
            label="태그"
            name="tags"
          >
            <Input placeholder="쉼표(,)로 구분하여 입력하세요 (예: 휴가신청, 출장, 비용정산)" />
          </Form.Item>

          <Form.Item
            label="내용"
            name="content"
            rules={[{ required: true, message: '내용을 입력해주세요.' }]}
          >
            <TextArea rows={10} placeholder="참고할 수 있는 내용을 자유롭게 작성하세요" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button onClick={() => setCreateModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                작성
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={selectedDocument?.title}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedDocument && (
          <div>
            <div className="mb-4 pb-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <span>{selectedDocument.author.name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-500">
                    {new Date(selectedDocument.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 text-gray-500">
                    <EyeOutlined />
                    <span>{selectedDocument.view_count}</span>
                  </div>
                </div>
                <div>
                  {selectedDocument.is_template && <Tag color="blue">템플릿</Tag>}
                  {selectedDocument.category && (
                    <Tag color="green">{selectedDocument.category.name}</Tag>
                  )}
                </div>
              </div>

              {selectedDocument.tags.length > 0 && (
                <div>
                  {selectedDocument.tags.map(tag => (
                    <Tag key={tag} size="small" icon={<TagOutlined />}>{tag}</Tag>
                  ))}
                </div>
              )}
            </div>

            {selectedDocument.description && (
              <div className="mb-4">
                <Text strong>설명:</Text>
                <Paragraph className="mt-2">{selectedDocument.description}</Paragraph>
              </div>
            )}

            <div className="mb-4">
              <Text strong>내용:</Text>
              <div className="mt-2 p-4 bg-gray-50 rounded border">
                {selectedDocument.category?.form_schema ? (
                  <DynamicFormRenderer
                    schema={selectedDocument.category.form_schema}
                    data={selectedDocument.content}
                    readOnly={true}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">
                    {typeof selectedDocument.content === 'string' 
                      ? selectedDocument.content 
                      : JSON.stringify(selectedDocument.content, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {selectedDocument.attachments.length > 0 && (
              <div>
                <Text strong>첨부파일:</Text>
                <List
                  size="small"
                  className="mt-2"
                  dataSource={selectedDocument.attachments}
                  renderItem={(attachment: any) => (
                    <List.Item>
                      <Button type="link" icon={<FileTextOutlined />}>
                        {attachment.file_name}
                      </Button>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};