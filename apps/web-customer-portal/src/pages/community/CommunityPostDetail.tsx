import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Tag,
  Space,
  Avatar,
  Divider,
  List,
  Input,
  Form,
  Modal,
  message,
  Dropdown,
  MenuProps,
  Spin,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  LikeOutlined,
  LikeFilled,
  CommentOutlined,
  EyeOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../../lib/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Author {
  id: string;
  name: string;
  email: string;
  profile_image?: string;
  org_unit?: {
    name: string;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: Author;
  parent_id?: string;
  replies?: Comment[];
}

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
  author: Author;
  is_liked: boolean;
  allow_comments: boolean;
  comments: Comment[];
}

export function CommunityPostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentForm] = Form.useForm();
  const [replyForms] = Form.useForm();
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

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
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    if (!postId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/hr-community/posts/${postId}`);
      setPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
      message.error('게시글을 불러오는데 실패했습니다.');
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async () => {
    if (!post) return;

    try {
      await api.post(`/hr-community/posts/${post.id}/like`);
      setPost({
        ...post,
        is_liked: !post.is_liked,
        like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1,
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      message.error('좋아요 처리에 실패했습니다.');
    }
  };

  const handleCreateComment = async (values: any) => {
    if (!post) return;

    try {
      const response = await api.post(`/hr-community/posts/${post.id}/comments`, {
        content: values.comment,
      });
      
      setPost({
        ...post,
        comments: [...post.comments, response.data],
        comment_count: post.comment_count + 1,
      });
      
      commentForm.resetFields();
      message.success('댓글이 작성되었습니다.');
    } catch (error) {
      console.error('Error creating comment:', error);
      message.error('댓글 작성에 실패했습니다.');
    }
  };

  const handleCreateReply = async (parentId: string, content: string) => {
    if (!post) return;

    try {
      const response = await api.post(`/hr-community/posts/${post.id}/comments`, {
        content,
        parent_id: parentId,
      });

      const updatedComments = post.comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), response.data],
          };
        }
        return comment;
      });

      setPost({
        ...post,
        comments: updatedComments,
        comment_count: post.comment_count + 1,
      });
      
      setActiveReplyId(null);
      replyForms.resetFields();
      message.success('답글이 작성되었습니다.');
    } catch (error) {
      console.error('Error creating reply:', error);
      message.error('답글 작성에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!post) return;

    try {
      await api.delete(`/hr-community/comments/${commentId}`);
      
      const updatedComments = post.comments.filter(comment => comment.id !== commentId);
      setPost({
        ...post,
        comments: updatedComments,
        comment_count: post.comment_count - 1,
      });
      
      message.success('댓글이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting comment:', error);
      message.error('댓글 삭제에 실패했습니다.');
    }
  };

  const getCommentActions = (comment: Comment): MenuProps['items'] => [
    {
      key: 'edit',
      label: '수정',
      icon: <EditOutlined />,
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '댓글을 삭제하시겠습니까?',
          content: '삭제된 댓글은 복구할 수 없습니다.',
          onOk: () => handleDeleteComment(comment.id),
        });
      },
    },
  ];

  const getPostActions = (): MenuProps['items'] => {
    if (!post) return [];
    
    return [
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
                navigate('/community');
              } catch (error) {
                console.error('Error deleting post:', error);
                message.error('게시글 삭제에 실패했습니다.');
              }
            },
          });
        },
      },
    ];
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Empty description="게시글을 찾을 수 없습니다." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/community')}
          style={{ marginBottom: '16px' }}
        >
          목록으로
        </Button>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
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
            <Title level={2}>{post.title}</Title>
          </div>
          <Dropdown menu={{ items: getPostActions() }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
          <Avatar size="small" src={post.author.profile_image}>
            {post.author.name.charAt(0)}
          </Avatar>
          <div style={{ marginLeft: '8px' }}>
            <Text strong>{post.author.name}</Text>
            <Text type="secondary" style={{ marginLeft: '8px' }}>
              {post.author.org_unit?.name}
            </Text>
            <Text type="secondary" style={{ marginLeft: '8px' }}>
              · {dayjs(post.created_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
        </div>

        <div style={{ marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
          {post.content.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>

        {post.tags.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            {post.tags.map((tag) => (
              <Tag key={tag} style={{ marginBottom: '4px' }}>
                #{tag}
              </Tag>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size="large">
            <Button
              type={post.is_liked ? 'primary' : 'default'}
              icon={post.is_liked ? <LikeFilled /> : <LikeOutlined />}
              onClick={handleLikePost}
            >
              좋아요 {post.like_count}
            </Button>
            <Space>
              <CommentOutlined />
              <Text>댓글 {post.comment_count}</Text>
            </Space>
            <Space>
              <EyeOutlined />
              <Text>조회 {post.view_count}</Text>
            </Space>
          </Space>
        </div>

        {post.updated_at !== post.created_at && (
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
            수정됨: {dayjs(post.updated_at).format('YYYY-MM-DD HH:mm')}
          </Text>
        )}
      </Card>

      <Card style={{ marginTop: '24px' }} title="댓글">
        {post.allow_comments ? (
          <>
            <Form form={commentForm} onFinish={handleCreateComment} style={{ marginBottom: '24px' }}>
              <Form.Item
                name="comment"
                rules={[{ required: true, message: '댓글 내용을 입력해주세요.' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="댓글을 입력하세요..."
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                  댓글 작성
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            {post.comments.length === 0 ? (
              <Empty description="댓글이 없습니다." style={{ margin: '24px 0' }} />
            ) : (
              <List
                dataSource={post.comments.filter(comment => !comment.parent_id)}
                renderItem={(comment) => (
                  <List.Item key={comment.id} style={{ alignItems: 'flex-start', padding: '16px 0' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                          <Avatar size="small" src={comment.author.profile_image} style={{ marginRight: '8px' }}>
                            {comment.author.name.charAt(0)}
                          </Avatar>
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: '4px' }}>
                              <Text strong>{comment.author.name}</Text>
                              <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                                {comment.author.org_unit?.name} · {dayjs(comment.created_at).format('MM-DD HH:mm')}
                              </Text>
                            </div>
                            <Paragraph style={{ marginBottom: '8px' }}>{comment.content}</Paragraph>
                            <Space>
                              <Button
                                type="link"
                                size="small"
                                onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                              >
                                답글
                              </Button>
                            </Space>
                          </div>
                        </div>
                        <Dropdown menu={{ items: getCommentActions(comment) }} trigger={['click']}>
                          <Button type="text" size="small" icon={<MoreOutlined />} />
                        </Dropdown>
                      </div>

                      {/* 답글 입력 폼 */}
                      {activeReplyId === comment.id && (
                        <div style={{ marginTop: '12px', marginLeft: '32px' }}>
                          <Form
                            onFinish={(values) => handleCreateReply(comment.id, values.reply)}
                            style={{ display: 'flex', gap: '8px' }}
                          >
                            <Form.Item
                              name="reply"
                              style={{ flex: 1, marginBottom: 0 }}
                              rules={[{ required: true, message: '답글 내용을 입력해주세요.' }]}
                            >
                              <Input placeholder="답글을 입력하세요..." />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="primary" htmlType="submit" size="small">
                                등록
                              </Button>
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button size="small" onClick={() => setActiveReplyId(null)}>
                                취소
                              </Button>
                            </Form.Item>
                          </Form>
                        </div>
                      )}

                      {/* 답글 목록 */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div style={{ marginTop: '12px', marginLeft: '32px', borderLeft: '2px solid #f0f0f0', paddingLeft: '16px' }}>
                          {comment.replies.map((reply) => (
                            <div key={reply.id} style={{ marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Avatar size="small" src={reply.author.profile_image} style={{ marginRight: '8px' }}>
                                  {reply.author.name.charAt(0)}
                                </Avatar>
                                <div style={{ flex: 1 }}>
                                  <div style={{ marginBottom: '4px' }}>
                                    <Text strong>{reply.author.name}</Text>
                                    <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px' }}>
                                      {reply.author.org_unit?.name} · {dayjs(reply.created_at).format('MM-DD HH:mm')}
                                    </Text>
                                  </div>
                                  <Paragraph style={{ marginBottom: 0 }}>{reply.content}</Paragraph>
                                </div>
                                <Dropdown menu={{ items: getCommentActions(reply) }} trigger={['click']}>
                                  <Button type="text" size="small" icon={<MoreOutlined />} />
                                </Dropdown>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </>
        ) : (
          <Empty description="댓글이 비활성화되었습니다." />
        )}
      </Card>
    </div>
  );
}