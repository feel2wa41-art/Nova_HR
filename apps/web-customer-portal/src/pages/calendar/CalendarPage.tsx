import React, { useState } from 'react';
import { 
  Calendar, 
  Badge, 
  Card, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  TimePicker, 
  Select, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col,
  List,
  Avatar,
  Tag,
  message,
  Tabs,
  Tooltip,
  Switch,
  ColorPicker,
} from 'antd';
import { 
  PlusOutlined, 
  ClockCircleOutlined, 
  EnvironmentOutlined,
  UserOutlined,
  NotificationOutlined,
  SettingOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  event_type: string;
  location?: string;
  color: string;
  is_public: boolean;
  status: string;
  creator: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  attendees: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar_url?: string;
    };
  }>;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  created_at: string;
  is_read: boolean;
  author: {
    name: string;
    avatar_url?: string;
  };
}

export const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventForm] = Form.useForm();
  const [settingsForm] = Form.useForm();

  // Fetch calendar events
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', selectedDate.format('YYYY-MM')],
    queryFn: () => {
      const startDate = selectedDate.startOf('month').format('YYYY-MM-DD');
      const endDate = selectedDate.endOf('month').format('YYYY-MM-DD');
      return apiClient.get(`/calendar/events?start_date=${startDate}&end_date=${endDate}&include_others=true`)
        .then(res => res.data);
    },
  });

  // Fetch today's events
  const { data: todaysEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['todays-events', dayjs().format('YYYY-MM-DD')],
    queryFn: () => apiClient.get('/calendar/events/today').then(res => res.data),
  });

  // Fetch upcoming events
  const { data: upcomingEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['upcoming-events'],
    queryFn: () => apiClient.get('/calendar/events/upcoming?days=7').then(res => res.data),
  });

  // Fetch announcements
  const { data: announcementsData } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => apiClient.get('/calendar/announcements?limit=5').then(res => res.data),
  });

  // Fetch public holidays
  const { data: holidays = [] } = useQuery({
    queryKey: ['public-holidays', selectedDate.year()],
    queryFn: () => apiClient.get(`/calendar/holidays?year=${selectedDate.year()}`).then(res => res.data),
  });

  // Fetch calendar settings
  const { data: settings } = useQuery({
    queryKey: ['calendar-settings'],
    queryFn: () => apiClient.get('/calendar/settings').then(res => res.data),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/calendar/events', data),
    onSuccess: () => {
      message.success('일정이 생성되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['todays-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
      setEventModalVisible(false);
      eventForm.resetFields();
    },
    onError: () => {
      message.error('일정 생성에 실패했습니다.');
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiClient.put('/calendar/settings', data),
    onSuccess: () => {
      message.success('설정이 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['calendar-settings'] });
      setSettingsModalVisible(false);
    },
  });

  // Mark announcement as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/calendar/announcements/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const getDateEvents = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return events.filter(event => {
      const eventStart = dayjs(event.start_date);
      const eventEnd = dayjs(event.end_date);
      return (
        eventStart.format('YYYY-MM-DD') === dateStr ||
        eventEnd.format('YYYY-MM-DD') === dateStr ||
        (eventStart.isBefore(date, 'day') && eventEnd.isAfter(date, 'day'))
      );
    });
  };

  const getDateHoliday = (date: Dayjs) => {
    return holidays.find(holiday => 
      dayjs(holiday.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    );
  };

  const dateCellRender = (date: Dayjs) => {
    const dayEvents = getDateEvents(date);
    const holiday = getDateHoliday(date);
    
    return (
      <div className="calendar-date-cell">
        {holiday && (
          <div className="text-red-500 text-xs font-semibold mb-1">
            {holiday.name}
          </div>
        )}
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map((event, index) => (
            <Badge
              key={event.id}
              color={event.color}
              text={
                <span 
                  className="text-xs cursor-pointer hover:underline truncate"
                  onClick={() => setSelectedEvent(event)}
                >
                  {event.all_day ? '' : dayjs(event.start_date).format('HH:mm')} {event.title}
                </span>
              }
            />
          ))}
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
          )}
        </div>
      </div>
    );
  };

  const monthCellRender = (date: Dayjs) => {
    const monthEvents = events.filter(event => 
      dayjs(event.start_date).month() === date.month()
    );
    return monthEvents.length ? (
      <div className="text-center">
        <Badge count={monthEvents.length} />
      </div>
    ) : null;
  };

  const handleCreateEvent = (values: any) => {
    const { dateRange, timeRange, attendees, ...rest } = values;
    
    let startDate, endDate;
    
    if (values.all_day) {
      startDate = dateRange[0].startOf('day');
      endDate = dateRange[1].endOf('day');
    } else {
      startDate = dayjs(dateRange[0]).hour(timeRange[0].hour()).minute(timeRange[0].minute());
      endDate = dayjs(dateRange[1] || dateRange[0]).hour(timeRange[1].hour()).minute(timeRange[1].minute());
    }

    createEventMutation.mutate({
      ...rest,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      attendee_ids: attendees || [],
    });
  };

  const handleUpdateSettings = (values: any) => {
    updateSettingsMutation.mutate(values);
  };

  const getEventTypeColor = (type: string) => {
    const colors = {
      'PERSONAL': '#1890ff',
      'MEETING': '#52c41a',
      'COMPANY_ANNOUNCEMENT': '#faad14',
      'HOLIDAY': '#f5222d',
      'BIRTHDAY': '#eb2f96',
      'LEAVE': '#722ed1',
    };
    return colors[type] || '#1890ff';
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      'PERSONAL': '개인',
      'MEETING': '회의',
      'COMPANY_ANNOUNCEMENT': '회사공지',
      'HOLIDAY': '휴일',
      'BIRTHDAY': '생일',
      'LEAVE': '휴가',
    };
    return labels[type] || '개인';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'ACCEPTED': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      'DECLINED': <CloseCircleOutlined style={{ color: '#f5222d' }} />,
      'TENTATIVE': <QuestionCircleOutlined style={{ color: '#faad14' }} />,
      'PENDING': <ClockCircleOutlined style={{ color: '#1890ff' }} />,
    };
    return icons[status] || icons['PENDING'];
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <Title level={2}>캘린더</Title>
            <Text type="secondary">일정 관리 및 회사 공지사항을 확인하세요.</Text>
          </div>
          <Space>
            <Button 
              icon={<SettingOutlined />}
              onClick={() => {
                settingsForm.setFieldsValue(settings);
                setSettingsModalVisible(true);
              }}
            >
              설정
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                eventForm.setFieldsValue({
                  dateRange: [dayjs(), dayjs()],
                  timeRange: [dayjs().hour(9), dayjs().hour(10)],
                  event_type: 'PERSONAL',
                  color: '#1890ff',
                  reminder_minutes: [15],
                });
                setEventModalVisible(true);
              }}
            >
              일정 추가
            </Button>
          </Space>
        </div>
      </div>

      <Row gutter={24}>
        {/* Main Calendar */}
        <Col span={18}>
          <Card>
            <Calendar
              value={selectedDate}
              onSelect={setSelectedDate}
              onPanelChange={(date, mode) => {
                setSelectedDate(date);
                setViewMode(mode);
              }}
              dateCellRender={viewMode === 'month' ? dateCellRender : undefined}
              monthCellRender={viewMode === 'year' ? monthCellRender : undefined}
              headerRender={({ value, type, onChange, onTypeChange }) => (
                <div className="flex justify-between items-center p-4 border-b">
                  <div className="flex items-center gap-4">
                    <Space.Compact>
                      <Button 
                        type={type === 'month' ? 'primary' : 'default'}
                        onClick={() => onTypeChange('month')}
                      >
                        월
                      </Button>
                      <Button 
                        type={type === 'year' ? 'primary' : 'default'}
                        onClick={() => onTypeChange('year')}
                      >
                        년
                      </Button>
                    </Space.Compact>
                    <Title level={4} className="!mb-0">
                      {value.format('YYYY년 MM월')}
                    </Title>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => onChange(dayjs())}>오늘</Button>
                    <Button onClick={() => onChange(value.subtract(1, type))}>이전</Button>
                    <Button onClick={() => onChange(value.add(1, type))}>다음</Button>
                  </div>
                </div>
              )}
            />
          </Card>
        </Col>

        {/* Sidebar */}
        <Col span={6}>
          <Space direction="vertical" className="w-full" size="large">
            {/* Today's Events */}
            <Card title="오늘의 일정" size="small">
              {todaysEvents.length > 0 ? (
                <List
                  size="small"
                  dataSource={todaysEvents}
                  renderItem={(event: CalendarEvent) => (
                    <List.Item className="!px-0">
                      <div className="w-full">
                        <div className="flex items-center gap-2">
                          <Badge color={event.color} />
                          <Text strong className="flex-1 truncate">{event.title}</Text>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <ClockCircleOutlined />
                          {event.all_day 
                            ? '하루 종일' 
                            : `${dayjs(event.start_date).format('HH:mm')} - ${dayjs(event.end_date).format('HH:mm')}`
                          }
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">오늘 일정이 없습니다.</Text>
              )}
            </Card>

            {/* Upcoming Events */}
            <Card title="다가오는 일정" size="small">
              {upcomingEvents.length > 0 ? (
                <List
                  size="small"
                  dataSource={upcomingEvents.slice(0, 5)}
                  renderItem={(event: CalendarEvent) => (
                    <List.Item className="!px-0">
                      <div className="w-full">
                        <div className="flex items-center gap-2">
                          <Badge color={event.color} />
                          <Text strong className="flex-1 truncate">{event.title}</Text>
                        </div>
                        <div className="text-xs text-gray-500">
                          {dayjs(event.start_date).format('MM/DD HH:mm')}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">예정된 일정이 없습니다.</Text>
              )}
            </Card>

            {/* Company Announcements */}
            <Card title="회사 공지사항" size="small">
              {announcementsData?.data?.length > 0 ? (
                <List
                  size="small"
                  dataSource={announcementsData.data}
                  renderItem={(announcement: Announcement) => (
                    <List.Item 
                      className="!px-0 cursor-pointer hover:bg-gray-50"
                      onClick={() => markReadMutation.mutate(announcement.id)}
                    >
                      <div className="w-full">
                        <div className="flex items-center gap-2">
                          {!announcement.is_read && <Badge status="processing" />}
                          <Text 
                            strong={!announcement.is_read}
                            className="flex-1 truncate"
                          >
                            {announcement.title}
                          </Text>
                          <Tag color={announcement.priority === 'URGENT' ? 'red' : 'default'}>
                            {announcement.priority}
                          </Tag>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {dayjs(announcement.created_at).format('MM/DD')}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">공지사항이 없습니다.</Text>
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Create Event Modal */}
      <Modal
        title="일정 추가"
        open={eventModalVisible}
        onCancel={() => setEventModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={eventForm}
          onFinish={handleCreateEvent}
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
            label="설명"
            name="description"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="유형"
                name="event_type"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="PERSONAL">개인 일정</Option>
                  <Option value="MEETING">회의</Option>
                  <Option value="COMPANY_ANNOUNCEMENT">회사 행사</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="색상"
                name="color"
              >
                <ColorPicker />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="날짜"
            name="dateRange"
            rules={[{ required: true, message: '날짜를 선택해주세요.' }]}
          >
            <RangePicker className="w-full" />
          </Form.Item>

          <Form.Item name="all_day" valuePropName="checked">
            <Switch /> 하루 종일
          </Form.Item>

          <Form.Item
            label="시간"
            name="timeRange"
            rules={[{ required: true, message: '시간을 선택해주세요.' }]}
          >
            <TimePicker.RangePicker className="w-full" format="HH:mm" />
          </Form.Item>

          <Form.Item
            label="장소"
            name="location"
          >
            <Input prefix={<EnvironmentOutlined />} />
          </Form.Item>

          <Form.Item name="is_public" valuePropName="checked">
            <Switch /> 다른 사용자에게 공개
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button onClick={() => setEventModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit" loading={createEventMutation.isPending}>
                저장
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Settings Modal */}
      <Modal
        title="캘린더 설정"
        open={settingsModalVisible}
        onCancel={() => setSettingsModalVisible(false)}
        footer={null}
      >
        <Form
          form={settingsForm}
          onFinish={handleUpdateSettings}
          layout="vertical"
        >
          <Form.Item
            label="기본 보기"
            name="default_view"
          >
            <Select>
              <Option value="MONTH">월간</Option>
              <Option value="WEEK">주간</Option>
              <Option value="DAY">일간</Option>
              <Option value="AGENDA">일정 목록</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="주 시작일"
            name="week_start"
          >
            <Select>
              <Option value={0}>일요일</Option>
              <Option value={1}>월요일</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="근무 시작 시간"
                name="work_hours_start"
              >
                <TimePicker format="HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="근무 종료 시간"
                name="work_hours_end"
              >
                <TimePicker format="HH:mm" className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="show_weekends" valuePropName="checked">
            <Switch /> 주말 표시
          </Form.Item>

          <Form.Item name="show_declined_events" valuePropName="checked">
            <Switch /> 거절한 일정 표시
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button onClick={() => setSettingsModalVisible(false)}>취소</Button>
              <Button type="primary" htmlType="submit" loading={updateSettingsMutation.isPending}>
                저장
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Modal
          title={selectedEvent.title}
          open={!!selectedEvent}
          onCancel={() => setSelectedEvent(null)}
          footer={[
            <Button key="close" onClick={() => setSelectedEvent(null)}>
              닫기
            </Button>
          ]}
        >
          <div className="space-y-4">
            <div>
              <Text strong>일정 유형: </Text>
              <Tag color={selectedEvent.color}>{getEventTypeLabel(selectedEvent.event_type)}</Tag>
            </div>
            
            <div>
              <Text strong>시간: </Text>
              <Text>
                {selectedEvent.all_day 
                  ? '하루 종일'
                  : `${dayjs(selectedEvent.start_date).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(selectedEvent.end_date).format('YYYY-MM-DD HH:mm')}`
                }
              </Text>
            </div>

            {selectedEvent.location && (
              <div>
                <Text strong>장소: </Text>
                <Text>{selectedEvent.location}</Text>
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <Text strong>설명: </Text>
                <Paragraph>{selectedEvent.description}</Paragraph>
              </div>
            )}

            <div>
              <Text strong>주최자: </Text>
              <Avatar size="small" icon={<UserOutlined />} className="mr-2" />
              <Text>{selectedEvent.creator.name}</Text>
            </div>

            {selectedEvent.attendees.length > 0 && (
              <div>
                <Text strong>참석자: </Text>
                <List
                  size="small"
                  dataSource={selectedEvent.attendees}
                  renderItem={(attendee) => (
                    <List.Item className="!px-0">
                      <div className="flex items-center gap-2">
                        <Avatar size="small" icon={<UserOutlined />} />
                        <Text>{attendee.user.name}</Text>
                        {getStatusIcon(attendee.status)}
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};