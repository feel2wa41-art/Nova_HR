import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  List,
  Typography,
  Tag,
  Space,
  Avatar,
  Empty,
  Spin,
  message,
  Badge,
  Tooltip,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DeleteOutlined,
  BellOutlined,
  CommentOutlined,
  LikeOutlined,
  NotificationOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../../lib/api';

const { Title, Text } = Typography;

interface Notification {
  id: string;
  type: 'HR_COMMUNITY_POST' | 'HR_COMMUNITY_COMMENT' | 'HR_COMMUNITY_LIKE';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: {
    post_id?: string;
    comment_id?: string;
    author_name?: string;
    post_title?: string;
  };
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/hr-community/notifications?page=${pageNum}&limit=20`);
      const newNotifications = response.data.notifications || [];
      
      if (pageNum === 1) {
        setNotifications(newNotifications);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
      }
      
      setHasMore(newNotifications.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      message.error('알림을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.post(`/hr-community/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      message.error('알림 읽음 처리에 실패했습니다.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/hr-community/notifications/read-all');
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      message.success('모든 알림을 읽음 처리했습니다.');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      message.error('알림 읽음 처리에 실패했습니다.');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.post_id) {
      navigate(`/community/posts/${notification.data.post_id}`);
    } else {
      navigate('/community');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'HR_COMMUNITY_POST':
        return <NotificationOutlined style={{ color: '#1890ff' }} />;
      case 'HR_COMMUNITY_COMMENT':
        return <CommentOutlined style={{ color: '#52c41a' }} />;
      case 'HR_COMMUNITY_LIKE':
        return <LikeOutlined style={{ color: '#fa541c' }} />;
      default:
        return <BellOutlined style={{ color: '#666' }} />;
    }
  };

  const getNotificationActions = (notification: Notification): MenuProps['items'] => [
    {
      key: 'mark-read',
      label: notification.is_read ? '읽지 않음으로 표시' : '읽음으로 표시',
      icon: <CheckOutlined />,
      onClick: () => handleMarkAsRead(notification.id),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        // Implement delete notification if needed
        message.info('알림 삭제 기능은 추후 구현됩니다.');
      },
    },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/community')}
          >
            커뮤니티로
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            알림 <Badge count={unreadCount} size="small" />
          </Title>
        </div>
        
        {unreadCount > 0 && (
          <Button type="primary" onClick={handleMarkAllAsRead}>
            모두 읽음으로 표시
          </Button>
        )}
      </div>

      <Card>
        <Spin spinning={loading && page === 1}>
          {notifications.length === 0 ? (
            <Empty
              description="알림이 없습니다."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <>
              <List
                dataSource={notifications}
                renderItem={(notification) => (
                  <List.Item
                    key={notification.id}
                    style={{
                      backgroundColor: notification.is_read ? 'transparent' : '#f6ffed',
                      padding: '16px',
                      margin: '8px 0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                    onClick={() => handleNotificationClick(notification)}
                    actions={[
                      <Dropdown
                        key="more"
                        menu={{ items: getNotificationActions(notification) }}
                        trigger={['click']}
                      >
                        <Button
                          type="text"
                          icon={<MoreOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Dropdown>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge dot={!notification.is_read}>
                          <Avatar
                            size="large"
                            icon={getNotificationIcon(notification.type)}
                            style={{
                              backgroundColor: notification.is_read ? '#f0f0f0' : '#fff',
                              border: notification.is_read ? '1px solid #d9d9d9' : '2px solid #1890ff',
                            }}
                          />
                        </Badge>
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Text
                            strong={!notification.is_read}
                            style={{
                              color: notification.is_read ? '#666' : '#000',
                            }}
                          >
                            {notification.title}
                          </Text>
                          <Tag
                            color={
                              notification.type === 'HR_COMMUNITY_POST' ? 'blue' :
                              notification.type === 'HR_COMMUNITY_COMMENT' ? 'green' : 'orange'
                            }
                            size="small"
                          >
                            {notification.type === 'HR_COMMUNITY_POST' && '게시글'}
                            {notification.type === 'HR_COMMUNITY_COMMENT' && '댓글'}
                            {notification.type === 'HR_COMMUNITY_LIKE' && '좋아요'}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <Text
                            style={{
                              color: notification.is_read ? '#999' : '#666',
                            }}
                          >
                            {notification.message}
                          </Text>
                          <div style={{ marginTop: '8px' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {dayjs(notification.created_at).format('YYYY-MM-DD HH:mm')}
                            </Text>
                            {notification.data?.author_name && (
                              <Text type="secondary" style={{ fontSize: '12px', marginLeft: '12px' }}>
                                by {notification.data.author_name}
                              </Text>
                            )}
                          </div>
                          {notification.data?.post_title && (
                            <div style={{ marginTop: '4px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                "{notification.data.post_title}"
                              </Text>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
              
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                  <Button
                    loading={loading}
                    onClick={() => fetchNotifications(page + 1)}
                  >
                    더 보기
                  </Button>
                </div>
              )}
            </>
          )}
        </Spin>
      </Card>
    </div>
  );
}