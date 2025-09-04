import React, { useState } from 'react';
import { Row, Col, Card, Tree, Badge, Avatar, Typography, Space, Tag, Button, Calendar, List, Modal, Form, Input, DatePicker, Select } from 'antd';
import { UserOutlined, CalendarOutlined, ClockCircleOutlined, GiftOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import type { DataNode } from 'antd/es/tree';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface User {
  id: string;
  name: string;
  title: string;
  email: string;
  avatar_url?: string;
  org_unit?: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'ON_LEAVE' | 'SICK_LEAVE';
  is_birthday_today: boolean;
  is_on_leave: boolean;
  leave_info?: any;
  last_attendance?: any;
}

interface OrgUnit {
  id: string;
  name: string;
  parent_id?: string;
  members: User[];
  children: OrgUnit[];
}

interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  event_type: string;
  location?: string;
  organizer: { name: string; email: string };
  participants: Array<{ status: string; user: { name: string } }>;
  _count: { participants: number };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ONLINE': return 'green';
    case 'AWAY': return 'orange';
    case 'ON_LEAVE': return 'red';
    case 'SICK_LEAVE': return 'volcano';
    default: return 'default';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'ONLINE': return '온라인';
    case 'AWAY': return '자리비움';
    case 'ON_LEAVE': return '휴가중';
    case 'SICK_LEAVE': return '병가중';
    default: return '오프라인';
  }
};

export const UserHealthPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventForm] = Form.useForm();

  // Fetch organization chart
  const { data: orgChart = [] } = useQuery<OrgUnit[]>({
    queryKey: ['organization-chart'],
    queryFn: () => apiClient.get('/user-health/organization-chart').then(res => res.data),
  });

  // Fetch all users with status
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-with-status'],
    queryFn: () => apiClient.get('/user-health/users').then(res => res.data),
  });

  // Fetch events
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => apiClient.get('/user-health/events').then(res => res.data),
  });

  // Fetch dashboard summary
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiClient.get('/user-health/dashboard/summary').then(res => res.data),
  });

  // Fetch today's birthdays
  const { data: todaysBirthdays = [] } = useQuery({
    queryKey: ['todays-birthdays'],
    queryFn: () => apiClient.get('/user-health/birthdays/today').then(res => res.data),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (eventData: any) => apiClient.post('/user-health/events', eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEventModalVisible(false);
      eventForm.resetFields();
    },
  });

  // Convert org chart to tree data
  const convertToTreeData = (orgUnits: OrgUnit[]): DataNode[] => {
    return orgUnits.map(unit => ({
      key: unit.id,
      title: (
        <div>
          <Text strong>{unit.name}</Text>
          <div className="mt-2">
            {unit.members.map(user => (
              <div key={user.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"
                   onClick={() => setSelectedUserId(user.id)}>
                <Badge status={getStatusColor(user.status) as any} />
                <Avatar size="small" icon={<UserOutlined />} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Text>{user.name}</Text>
                    {user.is_birthday_today && <GiftOutlined style={{ color: '#ff4d4f' }} />}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{user.title}</Text>
                </div>
                <Tag color={getStatusColor(user.status)} size="small">
                  {getStatusText(user.status)}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      ),
      children: unit.children.length > 0 ? convertToTreeData(unit.children) : undefined,
    }));
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleCreateEvent = (values: any) => {
    createEventMutation.mutate(values);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>사용자 헬스 체크</Title>
        <Paragraph>조직도를 기반으로 사용자 상태를 실시간으로 확인하고 관리합니다.</Paragraph>
      </div>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <div className="text-center">
                <Title level={3} className="!mb-0">{summary.total_users}</Title>
                <Text type="secondary">전체 사용자</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <Title level={3} className="!mb-0 text-green-600">{summary.online_users}</Title>
                <Text type="secondary">온라인</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <Title level={3} className="!mb-0 text-red-600">{summary.on_leave_users}</Title>
                <Text type="secondary">휴가중</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <Title level={3} className="!mb-0 text-orange-600">{summary.todays_birthdays}</Title>
                <Text type="secondary">오늘 생일</Text>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={24}>
        {/* Left Panel - Organization Chart */}
        <Col span={12}>
          <Card title="조직도" className="h-full">
            <Tree
              treeData={convertToTreeData(orgChart)}
              defaultExpandAll
              showLine={{ showLeafIcon: false }}
              blockNode
            />
          </Card>
        </Col>

        {/* Right Panel - Events and Details */}
        <Col span={12}>
          <Space direction="vertical" className="w-full" size="large">
            {/* Today's Birthdays */}
            {todaysBirthdays.length > 0 && (
              <Card title="🎉 오늘의 생일" size="small">
                <List
                  size="small"
                  dataSource={todaysBirthdays}
                  renderItem={(item: any) => (
                    <List.Item>
                      <div className="flex items-center gap-3">
                        <Avatar icon={<UserOutlined />} />
                        <div>
                          <Text strong>{item.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>{item.title}</Text>
                        </div>
                        <GiftOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* User Details */}
            {selectedUser && (
              <Card title="사용자 상세 정보" size="small">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="large" icon={<UserOutlined />} />
                    <div>
                      <Title level={4} className="!mb-0">{selectedUser.name}</Title>
                      <Text type="secondary">{selectedUser.title}</Text>
                      <div className="mt-1">
                        <Tag color={getStatusColor(selectedUser.status)}>
                          {getStatusText(selectedUser.status)}
                        </Tag>
                        {selectedUser.is_birthday_today && (
                          <Tag color="red" icon={<GiftOutlined />}>생일</Tag>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Text type="secondary">이메일: </Text>
                    <Text>{selectedUser.email}</Text>
                  </div>
                  
                  <div>
                    <Text type="secondary">부서: </Text>
                    <Text>{selectedUser.org_unit}</Text>
                  </div>

                  {selectedUser.is_on_leave && selectedUser.leave_info && (
                    <div>
                      <Text type="secondary">휴가 정보: </Text>
                      <Text>{selectedUser.leave_info.leave_type} ({new Date(selectedUser.leave_info.start_date).toLocaleDateString()} ~ {new Date(selectedUser.leave_info.end_date).toLocaleDateString()})</Text>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Events */}
            <Card 
              title="행사 및 이벤트" 
              size="small"
              extra={
                <Button type="primary" onClick={() => setEventModalVisible(true)}>
                  행사 등록
                </Button>
              }
            >
              <List
                size="small"
                dataSource={events}
                renderItem={(event: Event) => (
                  <List.Item>
                    <div className="w-full">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Text strong>{event.title}</Text>
                          <div className="flex items-center gap-2 mt-1">
                            <CalendarOutlined />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {new Date(event.start_date).toLocaleDateString()}
                            </Text>
                            {event.location && (
                              <>
                                <EnvironmentOutlined />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {event.location}
                                </Text>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge count={event._count.participants} />
                      </div>
                      {event.description && (
                        <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
                          {event.description}
                        </Paragraph>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Event Creation Modal */}
      <Modal
        title="행사 등록"
        open={eventModalVisible}
        onCancel={() => setEventModalVisible(false)}
        footer={null}
      >
        <Form
          form={eventForm}
          onFinish={handleCreateEvent}
          layout="vertical"
        >
          <Form.Item
            label="행사명"
            name="title"
            rules={[{ required: true, message: '행사명을 입력해주세요.' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label="시작 날짜"
            name="start_date"
            rules={[{ required: true, message: '시작 날짜를 선택해주세요.' }]}
          >
            <DatePicker showTime className="w-full" />
          </Form.Item>

          <Form.Item
            label="종료 날짜"
            name="end_date"
          >
            <DatePicker showTime className="w-full" />
          </Form.Item>

          <Form.Item
            label="행사 유형"
            name="event_type"
          >
            <Select>
              <Select.Option value="MEETING">회의</Select.Option>
              <Select.Option value="TRAINING">교육</Select.Option>
              <Select.Option value="COMPANY_EVENT">회사 행사</Select.Option>
              <Select.Option value="HOLIDAY">휴일</Select.Option>
              <Select.Option value="GENERAL">일반</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="장소"
            name="location"
          >
            <Input />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button onClick={() => setEventModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit" loading={createEventMutation.isPending}>
                등록
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};