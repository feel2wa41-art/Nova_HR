import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  DatePicker, 
  Select, 
  message, 
  Modal, 
  Row, 
  Col,
  Statistic,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  EyeOutlined, 
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { dailyReportService, DailyReport, ReportsListResponse } from '../../services/dailyReportService';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { confirm } = Modal;

export const DailyReportPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  });

  const [stats, setStats] = useState({
    totalReports: 0,
    draftReports: 0,
    submittedReports: 0,
    approvedReports: 0
  });

  useEffect(() => {
    loadReports();
  }, [pagination.current, pagination.pageSize, filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize
      };

      if (filters.status) {
        params.status = filters.status;
      }

      const response: ReportsListResponse = await dailyReportService.getMyReports(params);
      
      setReports(response.reports);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total
      }));

      // Calculate stats
      const allReportsResponse = await dailyReportService.getMyReports({ limit: 1000 });
      const allReports = allReportsResponse.reports;
      
      setStats({
        totalReports: allReports.length,
        draftReports: allReports.filter(r => r.status === 'DRAFT').length,
        submittedReports: allReports.filter(r => r.status === 'SUBMITTED').length,
        approvedReports: allReports.filter(r => r.status === 'APPROVED').length
      });

    } catch (error) {
      console.error('Failed to load reports:', error);
      message.error('Failed to load daily reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = () => {
    navigate('/daily-report/create');
  };

  const handleEditReport = (reportId: string) => {
    navigate(`/daily-report/edit/${reportId}`);
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/daily-report/view/${reportId}`);
  };

  const handleSubmitReport = async (reportId: string) => {
    try {
      await dailyReportService.submitReport(reportId);
      message.success('Report submitted successfully');
      loadReports();
    } catch (error) {
      message.error('Failed to submit report');
    }
  };

  const handleDeleteReport = (reportId: string) => {
    confirm({
      title: 'Delete Daily Report',
      content: 'Are you sure you want to delete this daily report? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await dailyReportService.deleteReport(reportId);
          message.success('Report deleted successfully');
          loadReports();
        } catch (error) {
          message.error('Failed to delete report');
        }
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'SUBMITTED': return 'processing';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <EditOutlined />;
      case 'SUBMITTED': return <ClockCircleOutlined />;
      case 'APPROVED': return <CheckCircleOutlined />;
      case 'REJECTED': return <ExclamationCircleOutlined />;
      default: return null;
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'report_date',
      key: 'report_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: true
    },
    {
      title: 'Summary',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      render: (summary: string) => summary || '-'
    },
    {
      title: 'Entries',
      dataIndex: 'entries',
      key: 'entries',
      render: (entries: any[]) => `${entries?.length || 0} tasks`,
      align: 'center' as const
    },
    {
      title: 'Total Hours',
      dataIndex: 'entries',
      key: 'total_hours',
      render: (entries: any[]) => {
        const totalMinutes = entries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
      },
      align: 'center' as const
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Submitted', value: 'SUBMITTED' },
        { text: 'Approved', value: 'APPROVED' },
        { text: 'Rejected', value: 'REJECTED' }
      ]
    },
    {
      title: 'Submitted',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: DailyReport) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewReport(record.id)}
          >
            View
          </Button>
          {record.status === 'DRAFT' && (
            <>
              <Button 
                type="link" 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleEditReport(record.id)}
              >
                Edit
              </Button>
              <Button 
                type="link" 
                size="small"
                onClick={() => handleSubmitReport(record.id)}
              >
                Submit
              </Button>
              <Button 
                type="link" 
                size="small" 
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteReport(record.id)}
              >
                Delete
              </Button>
            </>
          )}
        </Space>
      ),
      width: 200
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-2">Daily Reports</Title>
          <Text type="secondary">Track and manage your daily work activities</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleCreateReport}
          size="large"
        >
          Create Report
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Reports" 
              value={stats.totalReports}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Draft Reports" 
              value={stats.draftReports}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Submitted" 
              value={stats.submittedReports}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Approved" 
              value={stats.approvedReports}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Text strong>Filters:</Text>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="DRAFT">Draft</Option>
              <Option value="SUBMITTED">Submitted</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="REJECTED">Rejected</Option>
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker
              style={{ width: '100%' }}
              value={filters.dateRange}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
            />
          </Col>
          <Col span={4}>
            <Button onClick={loadReports}>Refresh</Button>
          </Col>
        </Row>
      </Card>

      {/* Reports Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} reports`,
            onChange: (page, pageSize) => 
              setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }))
          }}
          locale={{
            emptyText: (
              <Empty 
                description="No daily reports found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={handleCreateReport}>
                  Create Your First Report
                </Button>
              </Empty>
            )
          }}
        />
      </Card>
    </div>
  );
};