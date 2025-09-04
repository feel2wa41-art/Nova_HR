import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  List,
  Typography,
  Tag,
  Space,
  Input,
  Select,
  Avatar,
  Dropdown,
  MenuProps,
  Badge,
  Empty,
  Spin,
  message,
  Modal,
  Form,
  Switch,
  TimePicker,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  LikeOutlined,
  LikeFilled,
  CommentOutlined,
  EyeOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  post_type: 'GENERAL' | 'ANNOUNCEMENT' | 'POLICY' | 'URGENT' | 'CELEBRATION' | 'QUESTION';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  is_pinned: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    email: string;
    profile_image?: string;
    org_unit?: {
      name: string;
    };
  };
  is_liked: boolean;
}

interface NotificationPreferences {
  web_push_enabled: boolean;
  email_enabled: boolean;
  app_push_enabled: boolean;
  community_posts: boolean;
  announcements: boolean;
  comments: boolean;
  likes: boolean;
  mentions: boolean;
  urgent_only: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

interface CreatePostData {
  title: string;
  content: string;
  post_type?: string;
  priority?: string;
  is_pinned?: boolean;
  tags?: string[];
  target_audience?: string;
  notification_settings?: {
    web_push?: boolean;
    email?: boolean;
    app_push?: boolean;
  };
}

export function CommunityPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const postTypeColors = {
    GENERAL: 'default',
    ANNOUNCEMENT: 'blue',
    POLICY: 'purple',
    URGENT: 'red',
    CELEBRATION: 'gold',
    QUESTION: 'green',
  };

  const priorityColors = {
    LOW: 'default',
    NORMAL: 'blue',
    HIGH: 'orange',
    URGENT: 'red',
  };

  useEffect(() => {
    fetchPosts();
    fetchNotificationPreferences();
    fetchUnreadNotificationCount();
  }, [searchTerm, filterType, filterPriority, sortBy]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('post_type', filterType);
      if (filterPriority) params.append('priority', filterPriority);
      params.append('sort_by', sortBy);
      params.append('order', 'desc');
      
      const response = await api.get(`/hr-community/posts?${params.toString()}`);
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      message.error('게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      const response = await api.get('/hr-community/notification-preferences');
      setNotificationPrefs(response.data);
      settingsForm.setFieldsValue({
        ...response.data,
        quiet_hours_start: response.data.quiet_hours_start ? dayjs(response.data.quiet_hours_start, 'HH:mm') : null,
        quiet_hours_end: response.data.quiet_hours_end ? dayjs(response.data.quiet_hours_end, 'HH:mm') : null,
      });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const fetchUnreadNotificationCount = async () => {
    try {
      const response = await api.get('/hr-community/notifications/unread-count');
      setUnreadNotificationCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  };

  const handleCreatePost = async (values: any) => {
    try {
      const postData: CreatePostData = {
        title: values.title,
        content: values.content,
        post_type: values.post_type || 'GENERAL',
        priority: values.priority || 'NORMAL',
        is_pinned: values.is_pinned || false,
        tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()) : [],
        target_audience: values.target_audience || 'ALL',
        notification_settings: {
          web_push: values.web_push || false,
          email: values.email || false,
          app_push: values.app_push || false,
        },
      };

      await api.post('/hr-community/posts', postData);
      message.success('게시글이 작성되었습니다.');
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      message.error('게시글 작성에 실패했습니다.');
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await api.post(`/hr-community/posts/${postId}/like`);
      fetchPosts(); // Refresh posts to update like status
    } catch (error) {
      console.error('Error toggling like:', error);
      message.error('좋아요 처리에 실패했습니다.');
    }
  };

  const handleViewPost = async (postId: string) => {
    try {
      await api.post(`/hr-community/posts/${postId}/view`);
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handleUpdateNotificationPreferences = async (values: any) => {
    try {
      const preferences = {
        ...values,
        quiet_hours_start: values.quiet_hours_start ? values.quiet_hours_start.format('HH:mm') : null,
        quiet_hours_end: values.quiet_hours_end ? values.quiet_hours_end.format('HH:mm') : null,
      };

      await api.put('/hr-community/notification-preferences', preferences);
      message.success('알림 설정이 저장되었습니다.');
      setIsSettingsModalOpen(false);
      fetchNotificationPreferences();
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      message.error('알림 설정 저장에 실패했습니다.');
    }
  };

  const getPostActions = (post: CommunityPost): MenuProps['items'] => [
    {
      key: 'edit',
      label: '수정',
      icon: <EditOutlined />,
      onClick: () => navigate(`/community/posts/${post.id}/edit`),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '게시글을 삭제하시겠습니까?',
          content: '삭제된 게시글은 복구할 수 없습니다.',
          onOk: async () => {
            try {
              await api.delete(`/hr-community/posts/${post.id}`);
              message.success('게시글이 삭제되었습니다.');
              fetchPosts();
            } catch (error) {
              console.error('Error deleting post:', error);
              message.error('게시글 삭제에 실패했습니다.');
            }
          },
        });
      },
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>HR 커뮤니티</Title>
        <Space>
          <Badge count={unreadNotificationCount} size="small">
            <Button
              icon={<BellOutlined />}
              onClick={() => navigate('/community/notifications')}
            >
              알림
            </Button>
          </Badge>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setIsSettingsModalOpen(true)}
          >
            알림 설정
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            게시글 작성
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', marginBottom: '16px' }} wrap>
          <Search
            placeholder="게시글 검색..."
            allowClear
            style={{ width: 300 }}
            onSearch={setSearchTerm}
          />
          <Select
            placeholder="게시글 유형"
            style={{ width: 150 }}
            allowClear
            value={filterType || undefined}
            onChange={setFilterType}
          >
            <Option value="GENERAL">일반</Option>
            <Option value="ANNOUNCEMENT">공지사항</Option>
            <Option value="POLICY">정책</Option>
            <Option value="URGENT">긴급</Option>
            <Option value="CELEBRATION">축하</Option>
            <Option value="QUESTION">질문</Option>
          </Select>
          <Select
            placeholder="우선순위"
            style={{ width: 120 }}
            allowClear
            value={filterPriority || undefined}
            onChange={setFilterPriority}
          >
            <Option value="LOW">낮음</Option>
            <Option value="NORMAL">보통</Option>
            <Option value="HIGH">높음</Option>
            <Option value="URGENT">긴급</Option>
          </Select>
          <Select
            placeholder="정렬"
            style={{ width: 150 }}
            value={sortBy}
            onChange={setSortBy}
          >
            <Option value="created_at">최신순</Option>
            <Option value="view_count">조회순</Option>
            <Option value="like_count">좋아요순</Option>
          </Select>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {posts.length === 0 ? (
          <Empty description="게시글이 없습니다." />
        ) : (
          <List
            dataSource={posts}
            renderItem={(post) => (
              <Card
                key={post.id}
                style={{ marginBottom: '16px' }}
                hoverable
                onClick={() => {
                  handleViewPost(post.id);
                  navigate(`/community/posts/${post.id}`);
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      {post.is_pinned && <Tag color="red">고정</Tag>}
                      <Tag color={postTypeColors[post.post_type]}>
                        {post.post_type === 'GENERAL' && '일반'}
                        {post.post_type === 'ANNOUNCEMENT' && '공지사항'}
                        {post.post_type === 'POLICY' && '정책'}
                        {post.post_type === 'URGENT' && '긴급'}
                        {post.post_type === 'CELEBRATION' && '축하'}
                        {post.post_type === 'QUESTION' && '질문'}
                      </Tag>
                      <Tag color={priorityColors[post.priority]}>
                        {post.priority === 'LOW' && '낮음'}
                        {post.priority === 'NORMAL' && '보통'}
                        {post.priority === 'HIGH' && '높음'}
                        {post.priority === 'URGENT' && '긴급'}
                      </Tag>
                    </div>
                    <Title level={4} style={{ margin: '0 0 8px 0' }}>
                      {post.title}
                    </Title>
                    <Paragraph
                      ellipsis={{ rows: 2, expandable: false }}
                      style={{ marginBottom: '12px' }}
                    >
                      {post.content}
                    </Paragraph>
                    {post.tags.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        {post.tags.map((tag) => (
                          <Tag key={tag} style={{ marginBottom: '4px' }}>
                            #{tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Space>
                          <Avatar size="small" src={post.author.profile_image}>
                            {post.author.name.charAt(0)}
                          </Avatar>
                          <Text type="secondary">
                            {post.author.name} · {post.author.org_unit?.name}
                          </Text>
                        </Space>
                        <Text type="secondary">
                          {dayjs(post.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </div>
                      <Space>
                        <Button
                          type="text"
                          size="small"
                          icon={post.is_liked ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikePost(post.id);
                          }}
                        >
                          {post.like_count}
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<CommentOutlined />}
                        >
                          {post.comment_count}
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                        >
                          {post.view_count}
                        </Button>
                        <Dropdown
                          menu={{ items: getPostActions(post) }}
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      </Space>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          />
        )}
      </Spin>

      {/* 게시글 작성 모달 */}
      <Modal
        title="게시글 작성"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        width={800}
        okText="작성"
        cancelText="취소"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreatePost}
        >
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력해주세요.' }]}
          >
            <Input placeholder="게시글 제목을 입력하세요" />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="내용"
            rules={[{ required: true, message: '내용을 입력해주세요.' }]}
          >
            <TextArea
              rows={6}
              placeholder="게시글 내용을 입력하세요"
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="post_type" label="게시글 유형" style={{ flex: 1 }}>
              <Select placeholder="게시글 유형 선택">
                <Option value="GENERAL">일반</Option>
                <Option value="ANNOUNCEMENT">공지사항</Option>
                <Option value="POLICY">정책</Option>
                <Option value="URGENT">긴급</Option>
                <Option value="CELEBRATION">축하</Option>
                <Option value="QUESTION">질문</Option>
              </Select>
            </Form.Item>

            <Form.Item name="priority" label="우선순위" style={{ flex: 1 }}>
              <Select placeholder="우선순위 선택">
                <Option value="LOW">낮음</Option>
                <Option value="NORMAL">보통</Option>
                <Option value="HIGH">높음</Option>
                <Option value="URGENT">긴급</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="tags" label="태그">
            <Input placeholder="태그를 쉼표로 구분하여 입력하세요 (예: 공지, 중요, 필독)" />
          </Form.Item>

          <Form.Item name="target_audience" label="대상 청중">
            <Select placeholder="대상 청중 선택" defaultValue="ALL">
              <Option value="ALL">전체</Option>
              <Option value="DEPARTMENT">부서별</Option>
              <Option value="ROLE">역할별</Option>
            </Select>
          </Form.Item>

          <Divider orientation="left">알림 설정</Divider>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <Form.Item name="web_push" valuePropName="checked">
              <Switch /> 웹 푸쉬 알림
            </Form.Item>
            <Form.Item name="email" valuePropName="checked">
              <Switch /> 이메일 알림
            </Form.Item>
            <Form.Item name="app_push" valuePropName="checked">
              <Switch /> 앱 푸쉬 알림
            </Form.Item>
          </div>

          <Form.Item name="is_pinned" valuePropName="checked">
            <Switch /> 상단 고정
          </Form.Item>
        </Form>
      </Modal>

      {/* 알림 설정 모달 */}
      <Modal
        title="알림 설정"
        open={isSettingsModalOpen}
        onCancel={() => setIsSettingsModalOpen(false)}
        onOk={() => settingsForm.submit()}
        width={600}
        okText="저장"
        cancelText="취소"
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleUpdateNotificationPreferences}
        >
          <Title level={5}>알림 방식</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <Form.Item name="web_push_enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch /> 웹 푸쉬 알림
            </Form.Item>
            <Form.Item name="email_enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch /> 이메일 알림
            </Form.Item>
            <Form.Item name="app_push_enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch /> 앱 푸쉬 알림
            </Form.Item>
          </div>

          <Divider />

          <Title level={5}>알림 내용</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <Form.Item name="community_posts" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch /> 커뮤니티 게시글
            </Form.Item>
            <Form.Item name="announcements" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch /> 공지사항
            </Form.Item>
            <Form.Item name="comments" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch /> 댓글
            </Form.Item>
            <Form.Item name="likes" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch /> 좋아요
            </Form.Item>
            <Form.Item name="mentions" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch /> 멘션
            </Form.Item>
          </div>

          <Divider />

          <Title level={5}>고급 설정</Title>
          <Form.Item name="urgent_only" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Switch /> 긴급한 알림만 받기
          </Form.Item>

          <Form.Item name="quiet_hours_enabled" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Switch /> 방해 금지 시간 설정
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item name="quiet_hours_start" label="시작 시간" style={{ flex: 1 }}>
              <TimePicker format="HH:mm" placeholder="시작 시간" />
            </Form.Item>
            <Form.Item name="quiet_hours_end" label="종료 시간" style={{ flex: 1 }}>
              <TimePicker format="HH:mm" placeholder="종료 시간" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}