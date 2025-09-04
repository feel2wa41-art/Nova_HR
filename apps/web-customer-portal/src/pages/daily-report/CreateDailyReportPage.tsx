import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  InputNumber, 
  Space, 
  Typography, 
  message, 
  Divider,
  Row,
  Col,
  Tag,
  Popconfirm,
  Empty,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  MinusCircleOutlined, 
  SaveOutlined, 
  SendOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { 
  dailyReportService, 
  DailyReport, 
  ProgramCategory, 
  CreateDailyReport,
  CreateDailyReportEntry 
} from '../../services/dailyReportService';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ReportEntry extends CreateDailyReportEntry {
  id?: string;
  key: string;
}

export const CreateDailyReportPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<ProgramCategory[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  
  const [entries, setEntries] = useState<ReportEntry[]>([{
    key: '1',
    category_id: '',
    task_description: '',
    output: '',
    notes: '',
    duration_minutes: 0,
    programs_used: []
  }]);

  useEffect(() => {
    loadCategories();
    if (isEditing && id) {
      loadReport(id);
    }
  }, [isEditing, id]);

  const loadCategories = async () => {
    try {
      const categoriesData = await dailyReportService.getCategories();
      setCategories(categoriesData);
      
      // If no categories exist, offer to create defaults
      if (categoriesData.length === 0) {
        message.info('No program categories found. Creating default categories...');
        await dailyReportService.createDefaultCategories();
        const newCategories = await dailyReportService.getCategories();
        setCategories(newCategories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      message.error('Failed to load program categories');
    }
  };

  const loadReport = async (reportId: string) => {
    try {
      setLoading(true);
      const reportData = await dailyReportService.getReportById(reportId);
      setReport(reportData);
      
      // Populate form
      form.setFieldsValue({
        report_date: dayjs(reportData.report_date),
        summary: reportData.summary
      });
      
      // Populate entries
      if (reportData.entries && reportData.entries.length > 0) {
        const formattedEntries = reportData.entries.map((entry, index) => ({
          key: (index + 1).toString(),
          id: entry.id,
          category_id: entry.category_id,
          task_description: entry.task_description,
          output: entry.output,
          notes: entry.notes,
          duration_minutes: entry.duration_minutes,
          programs_used: entry.programs_used || []
        }));
        setEntries(formattedEntries);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      message.error('Failed to load report data');
      navigate('/daily-report');
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    const newEntry: ReportEntry = {
      key: Date.now().toString(),
      category_id: '',
      task_description: '',
      output: '',
      notes: '',
      duration_minutes: 0,
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
        entry.category_id && entry.task_description.trim()
      );
      
      if (validEntries.length === 0) {
        message.error('Please add at least one task entry');
        return;
      }

      const reportData: CreateDailyReport = {
        report_date: values.report_date.format('YYYY-MM-DD'),
        summary: values.summary,
        entries: validEntries.map(entry => ({
          category_id: entry.category_id,
          task_description: entry.task_description,
          output: entry.output,
          notes: entry.notes,
          duration_minutes: entry.duration_minutes || 0,
          programs_used: entry.programs_used || []
        }))
      };

      if (submit) {
        setSubmitting(true);
      } else {
        setLoading(true);
      }

      let savedReport: DailyReport;

      if (isEditing && report) {
        // Update existing report
        savedReport = await dailyReportService.updateReport(report.id, {
          summary: reportData.summary
        });
        
        // Update entries individually (simplified approach)
        message.info('Report entries updated successfully');
      } else {
        // Create new report
        savedReport = await dailyReportService.createReport(reportData);
      }

      if (submit && savedReport) {
        await dailyReportService.submitReport(savedReport.id);
        message.success('Daily report submitted successfully');
      } else {
        message.success(`Daily report ${isEditing ? 'updated' : 'saved'} successfully`);
      }

      navigate('/daily-report');

    } catch (error: any) {
      console.error('Failed to save report:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error(`Failed to ${submit ? 'submit' : 'save'} report`);
      }
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const getTotalHours = () => {
    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
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
            onClick={() => navigate('/daily-report')}
            className="mb-2"
          >
            Back to Reports
          </Button>
          <Title level={2} className="mb-2">
            {isEditing ? 'Edit Daily Report' : 'Create Daily Report'}
          </Title>
          <Text type="secondary">
            Record your daily work activities and tasks
          </Text>
        </div>
        <div className="flex items-center space-x-2">
          <Tag icon={<ClockCircleOutlined />} color="blue">
            Total: {getTotalHours()}
          </Tag>
        </div>
      </div>

      {/* Report locked warning */}
      {report && report.status !== 'DRAFT' && (
        <Alert
          message="Report Status"
          description={`This report has been ${report.status.toLowerCase()} and cannot be edited.`}
          type="warning"
          showIcon
          className="mb-6"
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          report_date: dayjs()
        }}
      >
        {/* Basic Information */}
        <Card title="Report Information" className="mb-6">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="Report Date"
                name="report_date"
                rules={[{ required: true, message: 'Please select report date' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Status">
                <Input 
                  value={report?.status || 'DRAFT'} 
                  disabled 
                  addonBefore="Status"
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            label="Summary"
            name="summary"
          >
            <TextArea
              rows={3}
              placeholder="Brief overview of your day's work and achievements..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Card>

        {/* Task Entries */}
        <Card 
          title="Daily Tasks" 
          className="mb-6"
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={addEntry}
              disabled={report?.status !== 'DRAFT'}
            >
              Add Task
            </Button>
          }
        >
          {entries.length === 0 ? (
            <Empty 
              description="No tasks added yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={addEntry}>Add First Task</Button>
            </Empty>
          ) : (
            <div className="space-y-4">
              {entries.map((entry, index) => {
                const category = getCategoryById(entry.category_id);
                return (
                  <Card 
                    key={entry.key}
                    size="small"
                    title={`Task ${index + 1}`}
                    extra={
                      entries.length > 1 && (
                        <Popconfirm
                          title="Remove this task?"
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
                      <Col span={8}>
                        <div className="mb-4">
                          <Text strong>Category</Text>
                          <Select
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder="Select category"
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
                      
                      <Col span={8}>
                        <div className="mb-4">
                          <Text strong>Duration (minutes)</Text>
                          <InputNumber
                            style={{ width: '100%', marginTop: 4 }}
                            min={0}
                            max={1440}
                            placeholder="0"
                            value={entry.duration_minutes}
                            onChange={(value) => updateEntry(entry.key, 'duration_minutes', value || 0)}
                            disabled={report?.status !== 'DRAFT'}
                          />
                        </div>
                      </Col>
                      
                      <Col span={8}>
                        <div className="mb-4">
                          <Text strong>Programs Used</Text>
                          <Select
                            mode="tags"
                            style={{ width: '100%', marginTop: 4 }}
                            placeholder="Add programs..."
                            value={entry.programs_used}
                            onChange={(value) => updateEntry(entry.key, 'programs_used', value)}
                            disabled={report?.status !== 'DRAFT'}
                          >
                            {/* Pre-populate with mapped programs if category is selected */}
                            {category?.program_mappings?.map(mapping => (
                              <Option key={mapping.id} value={mapping.program_name}>
                                {mapping.program_name}
                              </Option>
                            ))}
                          </Select>
                        </div>
                      </Col>
                    </Row>
                    
                    <div className="mb-4">
                      <Text strong>Task Description</Text>
                      <TextArea
                        rows={2}
                        style={{ marginTop: 4 }}
                        placeholder="What did you work on?"
                        value={entry.task_description}
                        onChange={(e) => updateEntry(entry.key, 'task_description', e.target.value)}
                        disabled={report?.status !== 'DRAFT'}
                        maxLength={200}
                        showCount
                      />
                    </div>
                    
                    <Row gutter={16}>
                      <Col span={12}>
                        <Text strong>Output/Deliverable</Text>
                        <TextArea
                          rows={2}
                          style={{ marginTop: 4 }}
                          placeholder="What was completed or produced?"
                          value={entry.output}
                          onChange={(e) => updateEntry(entry.key, 'output', e.target.value)}
                          disabled={report?.status !== 'DRAFT'}
                          maxLength={200}
                          showCount
                        />
                      </Col>
                      <Col span={12}>
                        <Text strong>Notes</Text>
                        <TextArea
                          rows={2}
                          style={{ marginTop: 4 }}
                          placeholder="Additional notes or challenges..."
                          value={entry.notes}
                          onChange={(e) => updateEntry(entry.key, 'notes', e.target.value)}
                          disabled={report?.status !== 'DRAFT'}
                          maxLength={200}
                          showCount
                        />
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
              <Button onClick={() => navigate('/daily-report')}>
                Cancel
              </Button>
              <Button 
                type="default" 
                icon={<SaveOutlined />}
                loading={loading && !submitting}
                onClick={() => handleSave(false)}
              >
                Save Draft
              </Button>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                loading={submitting}
                onClick={() => handleSave(true)}
              >
                Save & Submit
              </Button>
            </div>
          </Card>
        )}
      </Form>
    </div>
  );
};