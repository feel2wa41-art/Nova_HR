import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  Space, 
  Typography, 
  message, 
  Divider,
  Row,
  Col,
  Tag,
  Popconfirm,
  Empty,
  Alert,
  List
} from 'antd';
import { 
  PlusOutlined, 
  MinusCircleOutlined, 
  SaveOutlined, 
  SendOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { 
  weeklyReportService, 
  WeeklyReport, 
  CreateWeeklyReport,
  CreateWeeklyReportEntry 
} from '../../services/weeklyReportService';
import { dailyReportService, ProgramCategory } from '../../services/dailyReportService';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { WeekPicker } = DatePicker;

interface ReportEntry extends CreateWeeklyReportEntry {
  id?: string;
  key: string;
}

export const CreateWeeklyReportPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<ProgramCategory[]>([]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  
  const [entries, setEntries] = useState<ReportEntry[]>([{
    key: '1',
    category_id: '',
    summary: '',
    total_hours: 0,
    key_tasks: [],
    deliverables: [],
    programs_used: []
  }]);

  useEffect(() => {
    loadCategories();
    if (isEditing && id) {
      loadReport(id);
    } else {
      // Set default to current week
      const currentWeekStart = dayjs(weeklyReportService.getCurrentWeekStart());
      form.setFieldsValue({
        week_start: currentWeekStart
      });
    }
  }, [isEditing, id]);

  const loadCategories = async () => {
    try {
      const categoriesData = await dailyReportService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
      message.error('프로그램 카테고리 로드에 실패했습니다');
    }
  };

  const loadReport = async (reportId: string) => {
    try {
      setLoading(true);
      const reportData = await weeklyReportService.getReportById(reportId);
      setReport(reportData);
      
      // Populate form
      form.setFieldsValue({
        week_start: dayjs(reportData.week_start),
        summary: reportData.summary,
        achievements: reportData.achievements,
        challenges: reportData.challenges,
        next_week_goals: reportData.next_week_goals
      });
      
      // Populate entries
      if (reportData.entries && reportData.entries.length > 0) {
        const formattedEntries = reportData.entries.map((entry, index) => ({
          key: (index + 1).toString(),
          id: entry.id,
          category_id: entry.category_id,
          summary: entry.summary,
          total_hours: entry.total_hours,
          key_tasks: entry.key_tasks || [],
          deliverables: entry.deliverables || [],
          programs_used: entry.programs_used || []
        }));
        setEntries(formattedEntries);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      message.error('주간보고서 로드에 실패했습니다');
      navigate('/weekly-report');
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    const newEntry: ReportEntry = {
      key: Date.now().toString(),
      category_id: '',
      summary: '',
      total_hours: 0,
      key_tasks: [],
      deliverables: [],
      programs_used: []
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (key: string) => {
    setEntries(entries.filter(entry => entry.key !== key));
  };

  const updateEntry = (key: string, field: string, value: any) => {
    setEntries(entries.map(entry => 
      entry.key === key ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSave = async (submit = false) => {
    try {
      const values = await form.validateFields();
      
      // Validate entries
      const validEntries = entries.filter(entry => 
        entry.category_id && entry.summary.trim()
      );
      
      if (validEntries.length === 0) {
        message.error('최소한 하나의 카테고리 항목을 추가해주세요');
        return;
      }

      const weekStart = values.week_start.format('YYYY-MM-DD');
      const reportData: CreateWeeklyReport = {
        week_start: weekStart,
        summary: values.summary,
        achievements: values.achievements,
        challenges: values.challenges,
        next_week_goals: values.next_week_goals,
        entries: validEntries.map(entry => ({
          category_id: entry.category_id,
          summary: entry.summary,
          total_hours: entry.total_hours || 0,
          key_tasks: entry.key_tasks || [],
          deliverables: entry.deliverables || [],
          programs_used: entry.programs_used || []
        }))
      };

      if (submit) {
        setSubmitting(true);
      } else {
        setLoading(true);
      }

      let savedReport: WeeklyReport;

      if (isEditing && report) {
        // Update existing report
        savedReport = await weeklyReportService.updateReport(report.id, {
          summary: reportData.summary,
          achievements: reportData.achievements,
          challenges: reportData.challenges,
          next_week_goals: reportData.next_week_goals
        });
        
        message.info('주간보고서가 수정되었습니다');
      } else {
        // Create new report
        savedReport = await weeklyReportService.createReport(reportData);
      }

      if (submit && savedReport) {
        await weeklyReportService.submitReport(savedReport.id);
        message.success('주간보고서가 제출되었습니다');
      } else {
        message.success(`주간보고서가 ${isEditing ? '수정' : '저장'}되었습니다`);
      }

      navigate('/weekly-report');

    } catch (error: any) {
      console.error('Failed to save report:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error(`주간보고서 ${submit ? '제출' : '저장'}에 실패했습니다`);
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const getTotalHours = () => {
    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const getCategoryById = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
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
            {isEditing ? '주간보고서 편집' : '주간보고서 작성'}
          </Title>
          <Text type="secondary">
            주간 업무 성과와 다음 주 계획을 작성하세요
          </Text>
        </div>
        <div className="flex items-center space-x-2">
          <Tag icon={<ClockCircleOutlined />} color="blue">
            총 시간: {getTotalHours()}
          </Tag>
          {report?.is_auto_generated && (
            <Tag icon={<RobotOutlined />} color="purple">
              일일보고서에서 생성됨
            </Tag>
          )}
        </div>
      </div>

      {/* Report locked warning */}
      {report && report.status !== 'DRAFT' && (
        <Alert
          message="보고서 상태"
          description={`이 보고서는 이미 ${report.status === 'SUBMITTED' ? '제출' : '승인/반려'}되어 편집할 수 없습니다.`}
          type="warning"
          showIcon
          className="mb-6"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          week_start: dayjs()
        }}
      >
        {/* Basic Information */}
        <Card title="기본 정보" className="mb-6">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="주차 선택"
                name="week_start"
                rules={[{ required: true, message: '주차를 선택해주세요' }]}
              >
                <WeekPicker 
                  style={{ width: '100%' }}
                  format="YYYY년 WW주차"
                  disabled={isEditing || (report?.status !== 'DRAFT')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="상태">
                <Input 
                  value={report?.status || 'DRAFT'} 
                  disabled 
                  addonBefore="상태"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="주간 요약"
            name="summary"
          >
            <TextArea
              rows={3}
              placeholder="이번 주 주요 업무와 성과를 간략히 요약해주세요..."
              maxLength={1000}
              showCount
              disabled={report?.status !== 'DRAFT'}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="주요 성과"
                name="achievements"
              >
                <TextArea
                  rows={4}
                  placeholder="이번 주 달성한 주요 성과와 결과물을 기록해주세요..."
                  maxLength={1000}
                  showCount
                  disabled={report?.status !== 'DRAFT'}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="어려웠던 점"
                name="challenges"
              >
                <TextArea
                  rows={4}
                  placeholder="이번 주 경험한 어려움이나 해결해야 할 과제들..."
                  maxLength={1000}
                  showCount
                  disabled={report?.status !== 'DRAFT'}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="다음 주 목표"
            name="next_week_goals"
          >
            <TextArea
              rows={3}
              placeholder="다음 주 계획하고 있는 주요 업무와 목표를 작성해주세요..."
              maxLength={1000}
              showCount
              disabled={report?.status !== 'DRAFT'}
            />
          </Form.Item>
        </Card>

        {/* Category Entries */}
        <Card 
          title="카테고리별 업무 내역" 
          className="mb-6"
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={addEntry}
              disabled={report?.status !== 'DRAFT'}
            >
              카테고리 추가
            </Button>
          }
        >
          {entries.length === 0 ? (
            <Empty 
              description="카테고리가 추가되지 않았습니다"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={addEntry}>첫 번째 카테고리 추가</Button>
            </Empty>
          ) : (
            <div className="space-y-4">
              {entries.map((entry, index) => {
                const category = getCategoryById(entry.category_id);
                return (
                  <Card 
                    key={entry.key}
                    size="small"
                    title={`카테고리 ${index + 1}`}
                    extra={
                      entries.length > 1 && (
                        <Popconfirm
                          title="이 카테고리를 삭제하시겠습니까?"
                          onConfirm={() => removeEntry(entry.key)}
                          disabled={report?.status !== 'DRAFT'}
                        >
                          <Button 
                            type="text" 
                            danger 
                            icon={<MinusCircleOutlined />}
                            disabled={report?.status !== 'DRAFT'}
                          />
                        </Popconfirm>
                      )
                    }
                    className="border border-gray-200"
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <div className="mb-4">
                          <Text strong>카테고리</Text>
                          <Select
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder="카테고리 선택"
                            value={entry.category_id}
                            onChange={(value) => updateEntry(entry.key, 'category_id', value)}
                            disabled={report?.status !== 'DRAFT'}
                          >
                            {categories.map(cat => (
                              <Option key={cat.id} value={cat.id}>
                                <Space>
                                  {cat.color && (
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: cat.color }}
                                    />
                                  )}
                                  {cat.name}
                                </Space>
                              </Option>
                            ))}
                          </Select>
                        </div>
                      </Col>
                      
                      <Col span={12}>
                        <div className="mb-4">
                          <Text strong>총 시간 (분)</Text>
                          <Input
                            type="number"
                            style={{ width: '100%', marginTop: 4 }}
                            min={0}
                            placeholder="총 소요 시간 (분 단위)"
                            value={entry.total_hours}
                            onChange={(e) => updateEntry(entry.key, 'total_hours', parseInt(e.target.value) || 0)}
                            disabled={report?.status !== 'DRAFT'}
                          />
                        </div>
                      </Col>
                    </Row>
                    
                    <div className="mb-4">
                      <Text strong>업무 요약</Text>
                      <TextArea
                        rows={3}
                        style={{ marginTop: 4 }}
                        placeholder="이 카테고리에서 수행한 주요 업무를 요약해주세요..."
                        value={entry.summary}
                        onChange={(e) => updateEntry(entry.key, 'summary', e.target.value)}
                        disabled={report?.status !== 'DRAFT'}
                        maxLength={500}
                        showCount
                      />
                    </div>
                    
                    <Row gutter={16}>
                      <Col span={8}>
                        <Text strong>주요 업무</Text>
                        <Select
                          mode="tags"
                          style={{ width: '100%', marginTop: 4 }}
                          placeholder="주요 업무 추가..."
                          value={entry.key_tasks}
                          onChange={(value) => updateEntry(entry.key, 'key_tasks', value)}
                          disabled={report?.status !== 'DRAFT'}
                        />
                      </Col>
                      <Col span={8}>
                        <Text strong>결과물</Text>
                        <Select
                          mode="tags"
                          style={{ width: '100%', marginTop: 4 }}
                          placeholder="결과물 추가..."
                          value={entry.deliverables}
                          onChange={(value) => updateEntry(entry.key, 'deliverables', value)}
                          disabled={report?.status !== 'DRAFT'}
                        />
                      </Col>
                      <Col span={8}>
                        <Text strong>사용 프로그램</Text>
                        <Select
                          mode="tags"
                          style={{ width: '100%', marginTop: 4 }}
                          placeholder="사용한 프로그램..."
                          value={entry.programs_used}
                          onChange={(value) => updateEntry(entry.key, 'programs_used', value)}
                          disabled={report?.status !== 'DRAFT'}
                        >
                          {category?.program_mappings?.map(mapping => (
                            <Option key={mapping.id} value={mapping.program_name}>
                              {mapping.program_name}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                    </Row>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        {(!report || report.status === 'DRAFT') && (
          <Card>
            <div className="flex justify-end space-x-4">
              <Button onClick={() => navigate('/weekly-report')}>
                취소
              </Button>
              <Button 
                type="default" 
                icon={<SaveOutlined />}
                loading={loading && !submitting}
                onClick={() => handleSave(false)}
              >
                임시저장
              </Button>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                loading={submitting}
                onClick={() => handleSave(true)}
              >
                저장 후 제출
              </Button>
            </div>
          </Card>
        )}
      </Form>
    </div>
  );
};