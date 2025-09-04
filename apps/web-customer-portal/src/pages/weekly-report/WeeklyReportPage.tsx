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
  Empty,
  Alert,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  EyeOutlined, 
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { 
  weeklyReportService, 
  WeeklyReport, 
  WeeklyReportsListResponse,
  DailyReportsAvailability 
} from '../../services/weeklyReportService';
import { useTranslation } from 'react-i18next';

dayjs.extend(weekOfYear);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { confirm } = Modal;

export const WeeklyReportPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [reports, setReports] = useState<WeeklyReport[]>([]);
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

  const [currentWeekAvailability, setCurrentWeekAvailability] = useState<DailyReportsAvailability | null>(null);

  useEffect(() => {
    loadReports();
    checkCurrentWeekAvailability();
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

      const response: WeeklyReportsListResponse = await weeklyReportService.getMyReports(params);
      
      setReports(response.reports);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total
      }));

      // Calculate stats
      const allReportsResponse = await weeklyReportService.getMyReports({ limit: 1000 });
      const allReports = allReportsResponse.reports;
      
      setStats({
        totalReports: allReports.length,
        draftReports: allReports.filter(r => r.status === 'DRAFT').length,
        submittedReports: allReports.filter(r => r.status === 'SUBMITTED').length,
        approvedReports: allReports.filter(r => r.status === 'APPROVED').length
      });

    } catch (error) {
      console.error('Failed to load reports:', error);
      message.error('주간보고서 로드에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentWeekAvailability = async () => {
    try {
      const currentWeekStart = weeklyReportService.getCurrentWeekStart();
      const availability = await weeklyReportService.checkDailyReportsAvailable(currentWeekStart);
      setCurrentWeekAvailability(availability);
    } catch (error) {
      console.error('Failed to check current week availability:', error);
    }
  };

  const handleCreateReport = () => {
    navigate('/weekly-report/create');
  };

  const handleGenerateReport = async () => {
    try {
      const currentWeekStart = weeklyReportService.getCurrentWeekStart();
      const report = await weeklyReportService.generateFromDailyReports({ 
        week_start: currentWeekStart 
      });
      message.success('일일보고서를 기반으로 주간보고서가 생성되었습니다');
      navigate(`/weekly-report/edit/${report.id}`);
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      message.error(error.response?.data?.message || '주간보고서 생성에 실패했습니다');
    }
  };

  const handleEditReport = (reportId: string) => {
    navigate(`/weekly-report/edit/${reportId}`);
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/weekly-report/view/${reportId}`);
  };

  const handleSubmitReport = async (reportId: string) => {
    try {
      await weeklyReportService.submitReport(reportId);
      message.success('주간보고서가 제출되었습니다');
      loadReports();
    } catch (error) {
      message.error('주간보고서 제출에 실패했습니다');
    }
  };

  const handleDeleteReport = (reportId: string) => {
    confirm({
      title: '주간보고서 삭제',
      content: '이 주간보고서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          await weeklyReportService.deleteReport(reportId);
          message.success('주간보고서가 삭제되었습니다');
          loadReports();
        } catch (error) {
          message.error('주간보고서 삭제에 실패했습니다');
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

  const getTotalHours = (entries: any[]) => {
    const totalMinutes = entries?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const columns = [
    {
      title: '주차',
      dataIndex: 'week_start',
      key: 'week_start',
      render: (weekStart: string) => (
        <div>
          <div>{weeklyReportService.getWeekYear(weekStart)}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {weeklyReportService.formatWeekLabel(weekStart)}
          </Text>
        </div>
      ),
      sorter: true
    },
    {
      title: '요약',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
      render: (summary: string) => summary || '-'
    },
    {
      title: '카테고리',
      dataIndex: 'entries',
      key: 'entries',
      render: (entries: any[]) => `${entries?.length || 0}개`,
      align: 'center' as const
    },
    {
      title: '총 시간',
      dataIndex: 'entries',
      key: 'total_hours',
      render: (entries: any[]) => getTotalHours(entries),
      align: 'center' as const
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: WeeklyReport) => (
        <Space>
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status === 'DRAFT' ? '초안' : 
             status === 'SUBMITTED' ? '제출됨' :
             status === 'APPROVED' ? '승인됨' : '반려됨'}
          </Tag>
          {record.is_auto_generated && (
            <Tag color="purple" icon={<RobotOutlined />}>
              자동생성
            </Tag>
          )}
        </Space>
      ),
      filters: [
        { text: '초안', value: 'DRAFT' },
        { text: '제출됨', value: 'SUBMITTED' },
        { text: '승인됨', value: 'APPROVED' },
        { text: '반려됨', value: 'REJECTED' }
      ]
    },
    {
      title: '제출일',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, record: WeeklyReport) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewReport(record.id)}
          >
            보기
          </Button>
          {record.status === 'DRAFT' && (
            <>
              <Button 
                type="link" 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleEditReport(record.id)}
              >
                편집
              </Button>
              <Button 
                type="link" 
                size="small"
                onClick={() => handleSubmitReport(record.id)}
              >
                제출
              </Button>
              <Button 
                type="link" 
                size="small" 
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteReport(record.id)}
              >
                삭제
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
          <Title level={2} className="mb-2">주간보고서</Title>
          <Text type="secondary">주간 업무 성과와 계획을 관리합니다</Text>
        </div>
        <Space>
          <Button 
            type="default" 
            icon={<PlusOutlined />} 
            onClick={handleCreateReport}
            size="large"
          >
            직접 작성
          </Button>
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            onClick={handleGenerateReport}
            size="large"
            disabled={!currentWeekAvailability?.available}
          >
            일일보고서 요약
          </Button>
        </Space>
      </div>

      {/* Current Week Status */}
      {currentWeekAvailability && (
        <Alert
          message={`이번 주 일일보고서 현황`}
          description={
            currentWeekAvailability.available 
              ? `${currentWeekAvailability.count}개의 승인된 일일보고서가 있습니다. 자동 요약 기능을 사용할 수 있습니다.`
              : '이번 주에 승인된 일일보고서가 없습니다. 직접 작성해주세요.'
          }
          type={currentWeekAvailability.available ? 'info' : 'warning'}
          showIcon
          className="mb-6"
        />
      )}

      {/* Statistics */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic 
              title="전체 보고서" 
              value={stats.totalReports}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="초안" 
              value={stats.draftReports}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="제출됨" 
              value={stats.submittedReports}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="승인됨" 
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
            <Text strong>필터:</Text>
          </Col>
          <Col span={6}>
            <Select
              placeholder="상태별 필터"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="DRAFT">초안</Option>
              <Option value="SUBMITTED">제출됨</Option>
              <Option value="APPROVED">승인됨</Option>
              <Option value="REJECTED">반려됨</Option>
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
            <Button onClick={loadReports}>새로고침</Button>
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
              `${range[0]}-${range[1]} / ${total}개`,
            onChange: (page, pageSize) => 
              setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }))
          }}
          locale={{
            emptyText: (
              <Empty 
                description="주간보고서가 없습니다"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Space>
                  <Button type="primary" onClick={handleCreateReport}>
                    직접 작성하기
                  </Button>
                  {currentWeekAvailability?.available && (
                    <Button onClick={handleGenerateReport}>
                      일일보고서에서 생성하기
                    </Button>
                  )}
                </Space>
              </Empty>
            )
          }}
        />
      </Card>
    </div>
  );
};