import { Card, Row, Col, Button, Badge, Typography, List, Avatar, Divider, Space, message, Modal, Select } from 'antd';
import { 
  FileTextOutlined, 
  InboxOutlined, 
  SendOutlined, 
  ClockCircleOutlined,
  PlusOutlined,
  SettingOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;
const { Option } = Select;

interface QuickApprovalMenu {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  order: number;
}

interface ApprovalCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export const ApprovalDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quickMenuModalVisible, setQuickMenuModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Get approval counts
  const { data: counts } = useQuery({
    queryKey: ['approval-counts'],
    queryFn: async () => {
      const [inbox, pending, drafts, outbox, reference] = await Promise.all([
        apiClient.get('/approval/inbox/count').then(res => res.data),
        apiClient.get('/approval/pending/count').then(res => res.data),
        apiClient.get('/approval/drafts/count').then(res => res.data),
        apiClient.get('/approval/outbox/count').then(res => res.data),
        apiClient.get('/approval/reference/count').then(res => res.data),
      ]);
      return { inbox, pending, drafts, outbox, reference };
    },
  });

  // Get approval categories
  const { data: categories } = useQuery({
    queryKey: ['approval-categories'],
    queryFn: () => apiClient.get('/approval/categories').then(res => res.data),
  });

  // Get user's quick approval menu
  const { data: quickMenus } = useQuery({
    queryKey: ['quick-approval-menus', user?.id],
    queryFn: () => apiClient.get('/approval/quick-menus').then(res => res.data),
  });

  // Save quick menu mutation
  const saveQuickMenuMutation = useMutation({
    mutationFn: (categoryIds: string[]) => 
      apiClient.post('/approval/quick-menus', { categoryIds }),
    onSuccess: () => {
      message.success('빠른 신청 메뉴가 저장되었습니다');
      queryClient.invalidateQueries({ queryKey: ['quick-approval-menus'] });
      setQuickMenuModalVisible(false);
    },
    onError: () => {
      message.error('빠른 신청 메뉴 저장에 실패했습니다');
    }
  });

  useEffect(() => {
    if (quickMenus) {
      setSelectedCategories(quickMenus.map((menu: QuickApprovalMenu) => menu.categoryId));
    }
  }, [quickMenus]);

  const menuItems = [
    {
      key: '/approval/drafts',
      icon: <FileTextOutlined className="text-blue-500" />,
      title: '임시보관함',
      description: '작성 중인 결재 문서',
      count: counts?.drafts?.count || 0,
      color: 'blue',
    },
    {
      key: '/approval/pending',
      icon: <ClockCircleOutlined className="text-orange-500" />,
      title: '결재 대기',
      description: '결재가 필요한 문서',
      count: counts?.pending?.count || 0,
      color: 'orange',
    },
    {
      key: '/approval/inbox',
      icon: <InboxOutlined className="text-green-500" />,
      title: '수신함',
      description: '받은 결재 문서',
      count: counts?.inbox?.count || 0,
      color: 'green',
    },
    {
      key: '/approval/outbox',
      icon: <SendOutlined className="text-purple-500" />,
      title: '상신함',
      description: '보낸 결재 문서',
      count: counts?.outbox?.count || 0,
      color: 'purple',
    },
    {
      key: '/approval/reference',
      icon: <FileTextOutlined className="text-gray-500" />,
      title: '참조문서',
      description: '참조로 받은 문서',
      count: counts?.reference?.count || 0,
      color: 'gray',
    },
  ];

  const handleQuickApproval = (categoryId: string) => {
    navigate(`/approval/create?category=${categoryId}`);
  };

  const handleSaveQuickMenu = () => {
    saveQuickMenuMutation.mutate(selectedCategories);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Title level={2} className="!mb-2">전자결재</Title>
          <Text type="secondary">결재 문서를 관리하고 처리하세요</Text>
        </div>
        <Space>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate('/approval/create')}
          >
            전자결재 신청
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setQuickMenuModalVisible(true)}
          >
            빠른 신청 설정
          </Button>
        </Space>
      </div>

      {/* Quick Approval Menus */}
      {quickMenus && quickMenus.length > 0 && (
        <Card 
          title={
            <div className="flex items-center gap-2">
              <ThunderboltOutlined className="text-yellow-500" />
              <span>빠른 결재 신청</span>
            </div>
          }
          size="small"
        >
          <Row gutter={[16, 16]}>
            {quickMenus.map((menu: QuickApprovalMenu) => (
              <Col xs={12} sm={8} md={6} lg={4} key={menu.id}>
                <Card
                  hoverable
                  size="small"
                  className="text-center cursor-pointer transition-all hover:shadow-md"
                  onClick={() => handleQuickApproval(menu.categoryId)}
                >
                  <div className="py-2">
                    <div className="text-2xl mb-2">
                      {menu.icon || '📋'}
                    </div>
                    <Text strong className="text-sm">
                      {menu.categoryName}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Menu Overview */}
      <Row gutter={[16, 16]}>
        {menuItems.map((item) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={4} key={item.key}>
            <Card
              hoverable
              className="h-full cursor-pointer transition-all hover:shadow-lg"
              onClick={() => navigate(item.key)}
            >
              <div className="text-center">
                <div className="text-3xl mb-3">
                  {item.icon}
                </div>
                <Title level={4} className="!mb-1">
                  {item.title}
                </Title>
                <Text type="secondary" className="text-sm block mb-3">
                  {item.description}
                </Text>
                <Badge
                  count={item.count}
                  style={{ backgroundColor: `var(--ant-${item.color}-6)` }}
                  showZero
                  className="w-full"
                >
                  <div className="w-full h-8 flex items-center justify-center">
                    <Text strong className="text-lg">
                      {item.count}건
                    </Text>
                  </div>
                </Badge>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Recent Activities */}
      <Card title="최근 결재 활동" size="small">
        <List
          dataSource={[
            { title: '휴가신청서가 승인되었습니다', time: '2시간 전', type: 'success' },
            { title: '출장신청서 검토가 필요합니다', time: '4시간 전', type: 'warning' },
            { title: '지출결의서가 반려되었습니다', time: '1일 전', type: 'error' },
          ]}
          renderItem={(item, index) => (
            <List.Item key={index}>
              <List.Item.Meta
                avatar={
                  <Avatar 
                    icon={<FileTextOutlined />} 
                    style={{ 
                      backgroundColor: 
                        item.type === 'success' ? '#52c41a' : 
                        item.type === 'warning' ? '#faad14' : '#ff4d4f'
                    }}
                  />
                }
                title={item.title}
                description={item.time}
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Quick Menu Settings Modal */}
      <Modal
        title="빠른 결재 신청 메뉴 설정"
        open={quickMenuModalVisible}
        onCancel={() => setQuickMenuModalVisible(false)}
        onOk={handleSaveQuickMenu}
        confirmLoading={saveQuickMenuMutation.isPending}
        width={600}
      >
        <div className="space-y-4">
          <Text type="secondary">
            자주 사용하는 결재 유형을 선택하여 빠른 신청 메뉴에 추가하세요. (최대 8개)
          </Text>
          <Select
            mode="multiple"
            placeholder="결재 유형을 선택하세요"
            value={selectedCategories}
            onChange={setSelectedCategories}
            style={{ width: '100%' }}
            maxCount={8}
          >
            {categories?.map((category: ApprovalCategory) => (
              <Option key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <span>{category.icon || '📋'}</span>
                  <span>{category.name}</span>
                </div>
              </Option>
            ))}
          </Select>
          <Text type="secondary" className="text-xs">
            * 설정한 순서대로 빠른 신청 메뉴에 표시됩니다
          </Text>
        </div>
      </Modal>
    </div>
  );
};