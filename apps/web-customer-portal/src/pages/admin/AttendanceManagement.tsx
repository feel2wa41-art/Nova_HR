import React, { useState } from 'react';
import { Table, Card, Button, Space, Tag, Select, DatePicker, Modal, Form, message, Tabs, Statistic, Row, Col, TimePicker } from 'antd';
import { ClockCircleOutlined, UserOutlined, EnvironmentOutlined, ExclamationCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;

export const AttendanceManagement: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('today');
  const queryClient = useQueryClient();

  // Fetch attendance records
  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['attendance-records', selectedDate, selectedDepartment, selectedEmployee, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('date', selectedDate.format('YYYY-MM-DD'));
      if (selectedDepartment) params.append('departmentId', selectedDepartment);
      if (selectedEmployee) params.append('userId', selectedEmployee);
      if (activeTab === 'adjustments') params.append('type', 'adjustments');
      
      const response = await apiClient.get(`/admin/attendance?${params.toString()}`);
      return response.data;
    },
  });

  // Fetch attendance statistics
  const { data: statistics } = useQuery({
    queryKey: ['attendance-statistics', selectedDate],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/attendance-statistics?date=${selectedDate.format('YYYY-MM-DD')}`);
      return response.data;
    },
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/organizations');
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

  // Approve/Reject adjustment request
  const processAdjustmentMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: 'approve' | 'reject'; comments?: string }) => {
      return apiClient.put(`/attendance/adjustment-requests/${id}/${action}`, { comments });
    },
    onSuccess: (_, variables) => {
      message.success(variables.action === 'approve' ? '정정 요청이 승인되었습니다.' : '정정 요청이 반려되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-statistics'] });
    },
    onError: () => {
      message.error('처리 중 오류가 발생했습니다.');
    },
  });

  const handleAdjustmentApprove = (id: string) => {
    Modal.confirm({
      title: '정정 요청 승인',
      content: '이 출퇴근 정정 요청을 승인하시겠습니까?',
      okText: '승인',
      cancelText: '취소',
      onOk: () => processAdjustmentMutation.mutate({ id, action: 'approve' }),
    });
  };

  const handleAdjustmentReject = (id: string) => {
    Modal.confirm({
      title: '정정 요청 반려',
      content: '이 출퇴근 정정 요청을 반려하시겠습니까?',
      okText: '반려',
      cancelText: '취소',
      okType: 'danger',
      onOk: () => processAdjustmentMutation.mutate({ id, action: 'reject' }),
    });
  };

  const attendanceColumns = [
    {
      title: '사원',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user: any) => (
        <Space>
          <UserOutlined />
          {user?.name || '-'}
        </Space>
      ),
    },
    {
      title: '부서',
      dataIndex: 'user',
      key: 'department',
      width: 120,
      render: (user: any) => user?.department?.name || '-',
    },
    {
      title: '출근 시간',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      width: 120,
      render: (time: string) => time ? dayjs(time).format('HH:mm:ss') : '-',
    },
    {
      title: '출근 위치',
      dataIndex: 'checkInLocation',
      key: 'checkInLocation',
      width: 150,
      render: (location: any) => location ? (
        <Space size="small">
          <EnvironmentOutlined />
          <span className="text-xs">{location.address || `${location.lat}, ${location.lng}`}</span>
        </Space>
      ) : '-',
    },
    {
      title: '퇴근 시간',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      width: 120,
      render: (time: string) => time ? dayjs(time).format('HH:mm:ss') : '-',
    },
    {
      title: '퇴근 위치',
      dataIndex: 'checkOutLocation',
      key: 'checkOutLocation',
      width: 150,
      render: (location: any) => location ? (
        <Space size="small">
          <EnvironmentOutlined />
          <span className="text-xs">{location.address || `${location.lat}, ${location.lng}`}</span>
        </Space>
      ) : '-',
    },
    {
      title: '근무 시간',
      dataIndex: 'workingHours',
      key: 'workingHours',
      width: 100,
      render: (_: any, record: any) => {
        if (record.checkInTime && record.checkOutTime) {
          const checkIn = dayjs(record.checkInTime);
          const checkOut = dayjs(record.checkOutTime);
          const hours = checkOut.diff(checkIn, 'hour', true);
          return `${hours.toFixed(1)}시간`;
        }
        return '-';
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          NORMAL: { color: 'green', text: '정상' },
          LATE: { color: 'orange', text: '지각' },
          EARLY_LEAVE: { color: 'orange', text: '조퇴' },
          ABSENT: { color: 'red', text: '결근' },
          OUTSIDE: { color: 'blue', text: '외근' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '비고',
      dataIndex: 'note',
      key: 'note',
      width: 200,
      ellipsis: true,
    },
  ];

  const adjustmentColumns = [
    {
      title: '요청자',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user: any) => user?.name || '-',
    },
    {
      title: '요청 유형',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeConfig: Record<string, { color: string; text: string }> = {
          CHECK_IN: { color: 'blue', text: '출근 정정' },
          CHECK_OUT: { color: 'green', text: '퇴근 정정' },
          BOTH: { color: 'purple', text: '출퇴근 정정' },
        };
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '대상 날짜',
      dataIndex: 'targetDate',
      key: 'targetDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '요청 시간',
      dataIndex: 'requestedTime',
      key: 'requestedTime',
      width: 120,
      render: (time: string) => time ? dayjs(time).format('HH:mm') : '-',
    },
    {
      title: '사유',
      dataIndex: 'reason',
      key: 'reason',
      width: 250,
      ellipsis: true,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'orange', text: '대기중' },
          APPROVED: { color: 'green', text: '승인' },
          REJECTED: { color: 'red', text: '반려' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '요청일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
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
                onClick={() => handleAdjustmentApprove(record.id)}
              >
                승인
              </Button>
              <Button
                danger
                size="small"
                onClick={() => handleAdjustmentReject(record.id)}
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
              title="출근"
              value={statistics?.present || 0}
              suffix={`/ ${statistics?.total || 0}`}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="지각"
              value={statistics?.late || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="결근"
              value={statistics?.absent || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="정정 요청"
              value={statistics?.adjustmentPending || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">근태 관리</span>
            <Space>
              <Button icon={<DownloadOutlined />}>근태 보고서 다운로드</Button>
            </Space>
          </div>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="오늘 근태" key="today" />
          <TabPane tab="정정 요청" key="adjustments" />
          <TabPane tab="월간 통계" key="monthly" />
        </Tabs>

        <div className="mb-4">
          <Space size="middle" wrap>
            <DatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date || dayjs())}
              placeholder="날짜 선택"
            />
            <Select
              placeholder="부서 선택"
              allowClear
              style={{ width: 200 }}
              onChange={setSelectedDepartment}
            >
              {departments?.map((dept: any) => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
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
          </Space>
        </div>

        <Table
          columns={activeTab === 'adjustments' ? adjustmentColumns : attendanceColumns}
          dataSource={attendanceRecords}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: activeTab === 'adjustments' ? 1400 : 1500 }}
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