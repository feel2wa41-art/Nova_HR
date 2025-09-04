import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Tag, 
  Space, 
  Button, 
  Row, 
  Col, 
  Divider,
  Timeline,
  Descriptions,
  message,
  Empty
} from 'antd';
import { 
  ArrowLeftOutlined, 
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { dailyReportService, DailyReport } from '../../services/dailyReportService';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

export const ViewDailyReportPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DailyReport | null>(null);

  useEffect(() => {
    if (id) {
      loadReport(id);
    }
  }, [id]);

  const loadReport = async (reportId: string) => {
    try {
      setLoading(true);
      const reportData = await dailyReportService.getReportById(reportId);
      setReport(reportData);
    } catch (error) {
      console.error('Failed to load report:', error);
      message.error('Failed to load report data');
      navigate('/daily-report');
    } finally {
      setLoading(false);
    }
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

  const getTotalHours = () => {
    if (!report?.entries) return '0h 0m';
    const totalMinutes = report.entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!report) {
    return <div className="p-6">Report not found</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/daily-report')}
            className="mb-2"
          >
            Back to Reports
          </Button>
          <Title level={2} className="mb-2">
            Daily Report - {dayjs(report.report_date).format('MMMM D, YYYY')}
          </Title>
          <Space>
            <Tag color={getStatusColor(report.status)} icon={getStatusIcon(report.status)}>
              {report.status}
            </Tag>
            <Text type="secondary">
              <ClockCircleOutlined /> Total: {getTotalHours()}
            </Text>
          </Space>
        </div>
        
        {report.status === 'DRAFT' && (
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => navigate(`/daily-report/edit/${report.id}`)}
          >
            Edit Report
          </Button>
        )}
      </div>

      {/* Report Information */}
      <Card title="Report Information" className="mb-6">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Date" span={1}>
            <CalendarOutlined /> {dayjs(report.report_date).format('YYYY-MM-DD')}
          </Descriptions.Item>
          <Descriptions.Item label="Status" span={1}>
            <Tag color={getStatusColor(report.status)} icon={getStatusIcon(report.status)}>
              {report.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Created" span={1}>
            {dayjs(report.created_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Total Hours" span={1}>
            <Text strong>{getTotalHours()}</Text>
          </Descriptions.Item>
          {report.submitted_at && (
            <Descriptions.Item label="Submitted" span={1}>
              {dayjs(report.submitted_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          )}
          {report.reviewed_at && report.reviewer && (
            <Descriptions.Item label="Reviewed By" span={1}>
              <Space>
                <UserOutlined />
                {report.reviewer.name}
                <Text type="secondary">
                  ({dayjs(report.reviewed_at).format('YYYY-MM-DD HH:mm')})
                </Text>
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>
        
        {report.summary && (
          <>
            <Divider />
            <div>
              <Text strong>Summary:</Text>
              <Paragraph style={{ marginTop: 8 }}>
                {report.summary}
              </Paragraph>
            </div>
          </>
        )}
      </Card>

      {/* Task Entries */}
      <Card title={`Tasks (${report.entries?.length || 0})`} className="mb-6">
        {!report.entries || report.entries.length === 0 ? (
          <Empty description="No tasks recorded" />
        ) : (
          <div className="space-y-6">
            {report.entries.map((entry, index) => (
              <Card 
                key={entry.id} 
                size="small" 
                className="border border-gray-200"
                title={
                  <Space>
                    <Text strong>Task {index + 1}</Text>
                    {entry.category && (
                      <Tag 
                        color={entry.category.color ? 'default' : 'blue'}
                        style={{ backgroundColor: entry.category.color }}
                      >
                        {entry.category.name}
                      </Tag>
                    )}
                    <Tag icon={<ClockCircleOutlined />}>
                      {Math.floor((entry.duration_minutes || 0) / 60)}h {(entry.duration_minutes || 0) % 60}m
                    </Tag>
                  </Space>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <div>
                      <Text strong>Description:</Text>
                      <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                        {entry.task_description}
                      </Paragraph>
                    </div>
                  </Col>
                  
                  {entry.output && (
                    <Col span={12}>
                      <div>
                        <Text strong>Output/Deliverable:</Text>
                        <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                          {entry.output}
                        </Paragraph>
                      </div>
                    </Col>
                  )}
                  
                  {entry.notes && (
                    <Col span={12}>
                      <div>
                        <Text strong>Notes:</Text>
                        <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                          {entry.notes}
                        </Paragraph>
                      </div>
                    </Col>
                  )}
                  
                  {entry.programs_used && entry.programs_used.length > 0 && (
                    <Col span={24}>
                      <div>
                        <Text strong>Programs Used:</Text>
                        <div style={{ marginTop: 4 }}>
                          {entry.programs_used.map((program, idx) => (
                            <Tag key={idx} style={{ marginBottom: 4 }}>
                              {program}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Status Timeline */}
      <Card title="Status History">
        <Timeline>
          <Timeline.Item
            color="blue"
            dot={<EditOutlined />}
          >
            <div>
              <Text strong>Report Created</Text>
              <br />
              <Text type="secondary">
                {dayjs(report.created_at).format('YYYY-MM-DD HH:mm')}
              </Text>
            </div>
          </Timeline.Item>
          
          {report.submitted_at && (
            <Timeline.Item
              color="orange"
              dot={<ClockCircleOutlined />}
            >
              <div>
                <Text strong>Report Submitted</Text>
                <br />
                <Text type="secondary">
                  {dayjs(report.submitted_at).format('YYYY-MM-DD HH:mm')}
                </Text>
              </div>
            </Timeline.Item>
          )}
          
          {report.reviewed_at && (
            <Timeline.Item
              color={report.status === 'APPROVED' ? 'green' : 'red'}
              dot={report.status === 'APPROVED' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            >
              <div>
                <Text strong>Report {report.status}</Text>
                {report.reviewer && (
                  <>
                    <br />
                    <Text type="secondary">
                      By {report.reviewer.name} on {dayjs(report.reviewed_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </>
                )}
              </div>
            </Timeline.Item>
          )}
        </Timeline>
      </Card>
    </div>
  );
};