import React, { useState, useEffect } from 'react';
import {
  Badge,
  Dropdown,
  Button,
  List,
  Typography,
  Space,
  Empty,
  Spin,
  Tag,
  Avatar,
  Divider,
  Tooltip,
} from 'antd';
import {
  BellOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  CheckOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';

dayjs.extend(relativeTime);
dayjs.locale('ko');

const { Text } = Typography;

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'attendance' | 'approval' | 'attitude' | 'system';
  isRead: boolean;
  createdAt: string;
  data?: any;
}

const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/notifications');
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.warn('Failed to fetch notifications:', error);
        return [];
      }
    },
    staleTime: 10000,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data.unreadCount || 0;
    },
    staleTime: 5000,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const getNotificationIcon = (category: string, type: string) => {
    const iconProps = { 
      style: { 
        color: type === 'error' ? '#ff4d4f' : 
               type === 'warning' ? '#faad14' : 
               type === 'success' ? '#52c41a' : '#1890ff' 
      } 
    };

    switch (category) {
      case 'attendance':
        return <ClockCircleOutlined {...iconProps} />;
      case 'approval':
        return <FileTextOutlined {...iconProps} />;
      case 'attitude':
        return <UserOutlined {...iconProps} />;
      default:
        return <BellOutlined {...iconProps} />;
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'red';
      case 'warning': return 'orange';
      case 'success': return 'green';
      default: return 'blue';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'attendance': return '근태';
      case 'approval': return '결재';
      case 'attitude': return '태도';
      case 'system': return '시스템';
      default: return '일반';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Handle notification click based on category
    switch (notification.category) {
      case 'attendance':
        window.location.href = '/attendance';
        break;
      case 'approval':
        window.location.href = '/approval';
        break;
      case 'attitude':
        window.location.href = '/attitude';
        break;
    }
    
    setOpen(false);
  };

  const notificationList = (
    <div style={{ width: 380, maxHeight: 400, overflowY: 'auto' }}>
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong>알림</Text>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {unreadCount}개 읽지 않음
            </Text>
            <Tooltip title="알림 설정">
              <Button type="text" icon={<SettingOutlined />} size="small" />
            </Tooltip>
          </Space>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="새 알림이 없습니다"
            style={{ margin: 0 }}
          />
        </div>
      ) : (
        <List
          dataSource={Array.isArray(notifications) ? notifications : []}
          renderItem={(notification: Notification) => (
            <List.Item
              style={{
                padding: '12px 16px',
                backgroundColor: notification.isRead ? 'transparent' : '#f6ffed',
                cursor: 'pointer',
                borderLeft: notification.isRead ? 'none' : '3px solid #52c41a',
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={getNotificationIcon(notification.category, notification.type)}
                    size={36}
                    style={{ backgroundColor: 'transparent', border: '1px solid #d9d9d9' }}
                  />
                }
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text strong={!notification.isRead} style={{ fontSize: 14 }}>
                      {notification.title}
                    </Text>
                    <Space>
                      <Tag 
                        color={getNotificationTypeColor(notification.type)}
                      >
                        {getCategoryLabel(notification.category)}
                      </Tag>
                    </Space>
                  </div>
                }
                description={
                  <div>
                    <Text 
                      type="secondary" 
                      style={{ 
                        fontSize: 12, 
                        display: 'block',
                        marginBottom: 4,
                        lineHeight: '1.4',
                      }}
                    >
                      {notification.message}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(notification.createdAt).fromNow()}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      {notifications.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: '8px 16px', textAlign: 'center' }}>
            <Button type="link" size="small">
              모든 알림 보기
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      popupRender={() => notificationList}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small">
        <Button 
          type="text" 
          icon={<BellOutlined />} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: 40,
            width: 40,
          }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationCenter;