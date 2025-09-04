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
  Empty,
  List,
  Progress
} from 'antd';
import { 
  ArrowLeftOutlined, 
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  UserOutlined,
  RobotOutlined,
  FileTextOutlined,
  TrophyOutlined,
  WarningOutlined,
  AimOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { weeklyReportService, WeeklyReport } from '../../services/weeklyReportService';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

export const ViewWeeklyReportPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    if (id) {
      loadReport(id);
    }
  }, [id]);

  const loadReport = async (reportId: string) => {
    try {
      setLoading(true);
      const reportData = await weeklyReportService.getReportById(reportId);
      setReport(reportData);
    } catch (error) {
      console.error('Failed to load report:', error);
      message.error('주간보고서 로드에 실패했습니다');
      navigate('/weekly-report');
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT': return '초안';
      case 'SUBMITTED': return '제출됨';
      case 'APPROVED': return '승인됨';
      case 'REJECTED': return '반려됨';
      default: return status;
    }
  };

  const getTotalHours = () => {
    if (!report?.entries) return '0h 0m';
    const totalMinutes = report.entries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <div className="p-6">로딩 중...</div>;
  }

  if (!report) {
    return <div className="p-6">주간보고서를 찾을 수 없습니다</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/weekly-report')}
            className="mb-2"
          >
            주간보고서 목록으로
          </Button>
          <Title level={2} className="mb-2">
            {weeklyReportService.getWeekYear(report.week_start)} 주간보고서
          </Title>
          <Space>
            <Text type="secondary">
              {weeklyReportService.formatWeekLabel(report.week_start)}
            </Text>
            <Divider type="vertical" />
            <Tag color={getStatusColor(report.status)} icon={getStatusIcon(report.status)}>
              {getStatusText(report.status)}
            </Tag>
            {report.is_auto_generated && (
              <Tag color="purple" icon={<RobotOutlined />}>
                자동생성
              </Tag>
            )}
            <Text type="secondary">
              <ClockCircleOutlined /> 총 시간: {getTotalHours()}
            </Text>
          </Space>
        </div>
        
        {report.status === 'DRAFT' && (
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => navigate(`/weekly-report/edit/${report.id}`)}
          >
            편집하기
          </Button>
        )}
      </div>

      {/* Report Information */}
      <Card title="보고서 기본 정보" className="mb-6">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="주차" span={1}>
            <Space>
              <CalendarOutlined />
              {weeklyReportService.getWeekYear(report.week_start)}
              <Text type="secondary">
                ({weeklyReportService.formatWeekLabel(report.week_start)})
              </Text>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="상태" span={1}>
            <Tag color={getStatusColor(report.status)} icon={getStatusIcon(report.status)}>
              {getStatusText(report.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="작성일" span={1}>
            {dayjs(report.created_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="총 작업시간" span={1}>
            <Text strong>{getTotalHours()}</Text>
          </Descriptions.Item>
          {report.submitted_at && (
            <Descriptions.Item label="제출일" span={1}>
              {dayjs(report.submitted_at).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          )}
          {report.reviewed_at && report.reviewer && (
            <Descriptions.Item label="검토자" span={1}>
              <Space>
                <UserOutlined />
                {report.reviewer.name}
                <Text type="secondary">
                  ({dayjs(report.reviewed_at).format('YYYY-MM-DD HH:mm')})
                </Text>
              </Space>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="생성 방식" span={2}>
            {report.is_auto_generated ? (
              <Space>
                <RobotOutlined />
                <Text>일일보고서에서 자동 생성</Text>
                <Text type="secondary">
                  ({report.daily_reports_included.length}개 일일보고서 요약)
                </Text>
              </Space>
            ) : (
              <Space>
                <EditOutlined />
                <Text>직접 작성</Text>
              </Space>
            )}
          </Descriptions.Item>
        </Descriptions>
        
        {report.summary && (
          <>
            <Divider />
            <div>
              <Text strong>주간 요약:</Text>
              <Paragraph style={{ marginTop: 8 }}>
                {report.summary}
              </Paragraph>
            </div>
          </>
        )}
      </Card>

      {/* Detailed Content */}
      <Row gutter={16} className="mb-6">
        {/* Achievements */}
        {report.achievements && (
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#faad14' }} />
                  주요 성과
                </Space>
              }
            >
              <Paragraph>
                {report.achievements}
              </Paragraph>
            </Card>
          </Col>
        )}

        {/* Challenges */}
        {report.challenges && (
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <WarningOutlined style={{ color: '#ff7875' }} />
                  어려웠던 점
                </Space>
              }
            >
              <Paragraph>
                {report.challenges}
              </Paragraph>
            </Card>
          </Col>
        )}
      </Row>

      {/* Next Week Goals */}
      {report.next_week_goals && (
        <Card 
          title={
            <Space>
              <AimOutlined style={{ color: '#52c41a' }} />
              다음 주 목표
            </Space>
          }
          className="mb-6"
        >
          <Paragraph>
            {report.next_week_goals}
          </Paragraph>
        </Card>
      )}

      {/* Category Entries */}
      <Card 
        title={
          <Space>
            <FileTextOutlined />
            카테고리별 업무 내역 ({report.entries?.length || 0}개)
          </Space>
        } 
        className="mb-6"
      >
        {!report.entries || report.entries.length === 0 ? (
          <Empty description="카테고리별 업무 내역이 없습니다" />
        ) : (
          <div className="space-y-6">
            {report.entries.map((entry, index) => (
              <Card 
                key={entry.id} 
                size="small" 
                className="border border-gray-200"
                title={
                  <Space>
                    <Text strong>카테고리 {index + 1}</Text>
                    {entry.category && (
                      <Tag 
                        color="default"
                        style={{ 
                          backgroundColor: entry.category.color || '#f0f0f0',
                          color: entry.category.color ? '#fff' : '#000'
                        }}
                      >
                        {entry.category.name}
                      </Tag>
                    )}
                    <Tag icon={<ClockCircleOutlined />}>
                      {Math.floor((entry.total_hours || 0) / 60)}h {(entry.total_hours || 0) % 60}m
                    </Tag>
                  </Space>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <div>
                      <Text strong>업무 요약:</Text>
                      <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                        {entry.summary}
                      </Paragraph>
                    </div>
                  </Col>
                  
                  {entry.key_tasks && entry.key_tasks.length > 0 && (
                    <Col span={8}>
                      <div>
                        <Text strong>주요 업무:</Text>
                        <List
                          size="small"
                          dataSource={entry.key_tasks}
                          renderItem={(task) => (
                            <List.Item style={{ paddingTop: 4, paddingBottom: 4 }}>
                              <Text>• {task}</Text>
                            </List.Item>
                          )}
                        />
                      </div>
                    </Col>
                  )}
                  
                  {entry.deliverables && entry.deliverables.length > 0 && (
                    <Col span={8}>
                      <div>
                        <Text strong>결과물:</Text>
                        <List
                          size="small"
                          dataSource={entry.deliverables}
                          renderItem={(deliverable) => (
                            <List.Item style={{ paddingTop: 4, paddingBottom: 4 }}>
                              <Text>• {deliverable}</Text>
                            </List.Item>
                          )}
                        />
                      </div>
                    </Col>
                  )}
                  
                  {entry.programs_used && entry.programs_used.length > 0 && (
                    <Col span={8}>
                      <div>
                        <Text strong>사용 프로그램:</Text>
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
      <Card title="상태 변경 이력">
        <Timeline>
          <Timeline.Item
            color="blue"
            dot={<EditOutlined />}
          >
            <div>
              <Text strong>보고서 작성</Text>
              <br />
              <Text type="secondary">
                {dayjs(report.created_at).format('YYYY-MM-DD HH:mm')}
              </Text>
              {report.is_auto_generated && (
                <>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    일일보고서 {report.daily_reports_included.length}개에서 자동 생성
                  </Text>
                </>
              )}
            </div>
          </Timeline.Item>
          
          {report.submitted_at && (
            <Timeline.Item
              color="orange"
              dot={<ClockCircleOutlined />}
            >
              <div>
                <Text strong>보고서 제출</Text>
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
                <Text strong>보고서 {getStatusText(report.status)}</Text>
                {report.reviewer && (
                  <>
                    <br />
                    <Text type="secondary">
                      {report.reviewer.name} · {dayjs(report.reviewed_at).format('YYYY-MM-DD HH:mm')}
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