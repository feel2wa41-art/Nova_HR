import React, { useState } from 'react';
import { Table, Card, Button, Space, Tag, Select, DatePicker, Modal, Form, message, Tabs, Statistic, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, CalendarOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

export const LeaveApproval: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string | undefined>();
  const queryClient = useQueryClient();

  // Fetch leave requests from leave API
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['leave-requests', selectedStatus, selectedEmployee, dateRange, selectedLeaveType],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedStatus && selectedStatus !== '') params.append('status', selectedStatus);
      if (selectedEmployee) params.append('userId', selectedEmployee);
      if (selectedLeaveType) params.append('leaveType', selectedLeaveType);
      if (dateRange) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      
      const response = await apiClient.get(`/leave/requests?${params.toString()}`);
      
      // Data is already in the correct format from the API
      return response.data.data || response.data;
    },
  });

  // Fetch leave statistics
  const { data: statistics } = useQuery({
    queryKey: ['leave-statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/leave/statistics');
      return response.data;
    },
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const response = await apiClient.get('/users');
      return response.data;
    },
  });

  // Fetch leave types
  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const response = await apiClient.get('/leave-approval/types');
      return response.data;
    },
  });

  // Approve/Reject leave mutation through approval system
  const processLeaveMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: 'approve' | 'reject'; comments?: string }) => {
      // Process through leave API
      if (action === 'approve') {
        return apiClient.put(`/leave/requests/${id}/approve`, { comments });
      } else {
        return apiClient.put(`/leave/requests/${id}/reject`, { reason: comments });
      }
    },
    onSuccess: (_, variables) => {
      message.success(variables.action === 'approve' ? '휴가가 승인되었습니다.' : '휴가가 반려되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-statistics'] });
    },
    onError: (error: any) => {
      console.error('Leave processing error:', error);
      message.error(error.response?.data?.message || '처리 중 오류가 발생했습니다.');
    },
  });

  const handleApprove = (id: string) => {
    Modal.confirm({
      title: '휴가 승인',
      content: '이 휴가 신청을 승인하시겠습니까?',
      okText: '승인',
      cancelText: '취소',
      onOk: () => processLeaveMutation.mutate({ id, action: 'approve' }),
    });
  };

  const handleReject = (id: string) => {
    Modal.confirm({
      title: '휴가 반려',
      content: (
        <Form layout="vertical">
          <Form.Item label="반려 사유" name="comments">
            <textarea className="w-full p-2 border rounded" rows={3} placeholder="반려 사유를 입력하세요" />
          </Form.Item>
        </Form>
      ),
      okText: '반려',
      cancelText: '취소',
      okType: 'danger',
      onOk: () => {
        const comments = (document.querySelector('textarea') as HTMLTextAreaElement)?.value;
        processLeaveMutation.mutate({ id, action: 'reject', comments });
      },
    });
  };

  const columns = [
    {
      title: '순번',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '신청자',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user: any) => user?.name || '-',
    },
    {
      title: '부서',
      dataIndex: 'user',
      key: 'department',
      width: 120,
      render: (user: any) => user?.employee_profile?.department || '-',
    },
    {
      title: '휴가 유형',
      dataIndex: 'leave_type',
      key: 'leave_type',
      width: 120,
      render: (type: any) => (
        <Tag color={type?.colorHex || 'blue'}>{type?.name || type || '-'}</Tag>
      ),
    },
    {
      title: '시작일',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '종료일',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '일수',
      dataIndex: 'requested_days',
      key: 'requested_days',
      width: 80,
      render: (days: number) => `${days || 0}일`,
    },
    {
      title: '사유',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      ellipsis: true,
    },
    {
      title: '긴급',
      dataIndex: 'emergency',
      key: 'emergency',
      width: 80,
      render: (emergency: boolean) => emergency ? <Tag color="red">긴급</Tag> : null,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
          PENDING: { color: 'orange', text: '대기중', icon: <ClockCircleOutlined /> },
          APPROVED: { color: 'green', text: '승인', icon: <CheckCircleOutlined /> },
          REJECTED: { color: 'red', text: '반려', icon: <CloseCircleOutlined /> },
        };
        const config = statusConfig[status] || { color: 'default', text: status, icon: null };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '신청일',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      sorter: (a: any, b: any) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '작업',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        if (record.status === 'PENDING') {
          return (
            <Space size="small">
              <Button
                type="primary"
                size="small"
                onClick={() => handleApprove(record.id)}
              >
                승인
              </Button>
              <Button
                danger
                size="small"
                onClick={() => handleReject(record.id)}
              >
                반려
              </Button>
            </Space>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="p-6">
      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="대기중인 신청"
              value={statistics?.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="오늘 휴가자"
              value={statistics?.todayOnLeave || 0}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="이번달 승인"
              value={statistics?.monthlyApproved || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="이번달 반려"
              value={statistics?.monthlyRejected || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">휴가 승인</span>
            <Button icon={<FileSearchOutlined />} type="primary">
              휴가 현황 보고서
            </Button>
          </div>
        }
      >
        <Tabs 
          activeKey={selectedStatus} 
          onChange={setSelectedStatus}
          items={[
            {
              key: 'PENDING',
              label: '대기중'
            },
            {
              key: 'APPROVED',
              label: '승인됨'
            },
            {
              key: 'REJECTED',
              label: '반려됨'
            },
            {
              key: '',
              label: '전체'
            }
          ]}
        />

        <div className="mb-4">
          <Space size="middle" wrap>
            <Select
              placeholder="직원 선택"
              allowClear
              style={{ width: 200 }}
              onChange={setSelectedEmployee}
              showSearch
              optionFilterProp="children"
            >
              {employees?.map((emp: any) => (
                <Option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.email})
                </Option>
              ))}
            </Select>
            <Select
              placeholder="휴가 유형"
              allowClear
              style={{ width: 150 }}
              onChange={setSelectedLeaveType}
            >
              {leaveTypes?.map((type: any) => (
                <Option key={type.id} value={type.id}>
                  {type.name}
                </Option>
              ))}
            </Select>
            <RangePicker
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              placeholder={['시작일', '종료일']}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={leaveRequests}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `총 ${total}건`,
          }}
        />
      </Card>
    </div>
  );
};