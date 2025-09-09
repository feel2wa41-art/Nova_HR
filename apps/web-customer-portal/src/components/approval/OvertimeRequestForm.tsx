import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Alert,
  Divider,
  Radio,
  Checkbox,
  message
} from 'antd';
import {
  ClockCircleOutlined,
  FileTextOutlined,
  SaveOutlined,
  SendOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { FileUploadComponent, FileAttachment } from './FileUploadComponent';
import { overtimeApi } from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface OvertimeFormData {
  overtime_type: 'EVENING' | 'WEEKEND' | 'HOLIDAY' | 'EARLY';
  work_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  work_description: string;
  reason: string;
  emergency_level: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  requires_manager_approval: boolean;
  expected_completion?: string;
  attachments?: FileAttachment[];
}

interface OvertimeRequestFormProps {
  initialData?: Partial<OvertimeFormData>;
  onSubmit: (data: OvertimeFormData) => void;
  onSaveDraft: (data: OvertimeFormData) => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
}

export const OvertimeRequestForm: React.FC<OvertimeRequestFormProps> = ({
  initialData,
  onSubmit,
  onSaveDraft,
  loading = false,
  mode = 'create'
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        ...initialData,
        work_date: initialData.work_date ? dayjs(initialData.work_date) : undefined,
        start_time: initialData.start_time ? dayjs(initialData.start_time) : undefined,
        end_time: initialData.end_time ? dayjs(initialData.end_time) : undefined,
      });
      
      if (initialData.attachments) {
        setAttachments(initialData.attachments);
      }
    }
  }, [initialData, form]);

  // Auto-calculate total hours when start/end time changes
  const handleTimeChange = () => {
    const startTime = form.getFieldValue('start_time');
    const endTime = form.getFieldValue('end_time');
    
    if (startTime && endTime) {
      const start = dayjs(startTime);
      const end = dayjs(endTime);
      const diffHours = end.diff(start, 'hour', true);
      
      if (diffHours > 0) {
        setCalculatedHours(diffHours);
        form.setFieldValue('total_hours', diffHours);
      }
    }
  };

  const handleFileUpload = async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      setUploadingFiles(true);
      console.log('🚀 파일 업로드 처리 시작:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Simulate realistic upload process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For now, we'll simulate file upload
      // In production, you would call the actual upload API
      // const result = await overtimeApi.uploadAttachment('temp-id', file);
      
      const result = {
        success: true,
        url: URL.createObjectURL(file) // Temporary URL for demo
      };
      
      console.log('✅ 파일 업로드 완료:', {
        name: file.name,
        url: result.url
      });
      
      return result;
    } catch (error) {
      console.error('❌ 파일 업로드 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '파일 업로드에 실패했습니다.'
      };
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSubmit = async (values: any) => {
    const formData: OvertimeFormData = {
      ...values,
      work_date: values.work_date.format('YYYY-MM-DD'),
      start_time: values.start_time.format('YYYY-MM-DD HH:mm:ss'),
      end_time: values.end_time.format('YYYY-MM-DD HH:mm:ss'),
      attachments: attachments.filter(att => att.status === 'done' || att.file)
    };
    
    onSubmit(formData);
  };

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields();
      const formData: OvertimeFormData = {
        ...values,
        work_date: values.work_date?.format('YYYY-MM-DD'),
        start_time: values.start_time?.format('YYYY-MM-DD HH:mm:ss'),
        end_time: values.end_time?.format('YYYY-MM-DD HH:mm:ss'),
        attachments: attachments
      };
      
      onSaveDraft(formData);
    } catch (error) {
      message.warning('필수 항목을 입력해주세요.');
    }
  };

  const overtimeTypeOptions = [
    { value: 'EVENING', label: '야근', icon: '🌙' },
    { value: 'WEEKEND', label: '주말근무', icon: '📅' },
    { value: 'HOLIDAY', label: '특근(공휴일)', icon: '🎉' },
    { value: 'EARLY', label: '조기출근', icon: '🌅' }
  ];

  const emergencyLevelOptions = [
    { value: 'LOW', label: '낮음', color: 'green' },
    { value: 'NORMAL', label: '보통', color: 'blue' },
    { value: 'HIGH', label: '높음', color: 'orange' },
    { value: 'URGENT', label: '긴급', color: 'red' }
  ];


  return (
    <Card>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>
          <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          추가근무 신청
        </Title>
        <Text type="secondary">
          야근, 주말근무, 특근 등의 추가근무를 신청하세요. 승인 후 근무시간이 반영됩니다.
        </Text>
      </div>

      <Alert
        message="추가근무 신청 안내"
        description="추가근무는 사전 승인이 필요하며, 회사 정책에 따라 최대 근무시간이 제한될 수 있습니다."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          emergency_level: 'NORMAL',
          requires_manager_approval: true
        }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="overtime_type"
              label="추가근무 유형"
              rules={[{ required: true, message: '추가근무 유형을 선택해주세요' }]}
            >
              <Select placeholder="추가근무 유형을 선택하세요">
                {overtimeTypeOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <Space>
                      <span>{option.icon}</span>
                      {option.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="work_date"
              label="근무일자"
              rules={[{ required: true, message: '근무일자를 선택해주세요' }]}
            >
              <DatePicker 
                style={{ width: '100%' }}
                placeholder="근무일자 선택"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="start_time"
              label="시작시간"
              rules={[{ required: true, message: '시작시간을 선택해주세요' }]}
            >
              <TimePicker 
                style={{ width: '100%' }}
                format="HH:mm"
                placeholder="시작시간"
                onChange={handleTimeChange}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={8}>
            <Form.Item
              name="end_time"
              label="종료시간"
              rules={[{ required: true, message: '종료시간을 선택해주세요' }]}
            >
              <TimePicker 
                style={{ width: '100%' }}
                format="HH:mm"
                placeholder="종료시간"
                onChange={handleTimeChange}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={8}>
            <Form.Item
              name="total_hours"
              label="총 근무시간"
              rules={[
                { required: true, message: '총 근무시간을 입력해주세요' },
                { type: 'number', min: 0.5, max: 12, message: '0.5시간 이상 12시간 이하로 입력해주세요' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.5}
                max={12}
                step={0.5}
                placeholder="시간"
                suffix="시간"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="work_description"
          label="업무내용"
          rules={[
            { required: true, message: '업무내용을 입력해주세요' },
            { min: 10, message: '최소 10자 이상 입력해주세요' },
            { max: 1000, message: '최대 1000자까지 입력 가능합니다' }
          ]}
        >
          <TextArea
            rows={4}
            placeholder="구체적인 추가근무 내용을 작성하세요 (최소 10자)"
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="추가근무 사유"
          rules={[
            { required: true, message: '추가근무 사유를 입력해주세요' },
            { min: 10, message: '최소 10자 이상 입력해주세요' },
            { max: 500, message: '최대 500자까지 입력 가능합니다' }
          ]}
        >
          <TextArea
            rows={3}
            placeholder="추가근무가 필요한 사유를 작성하세요 (최소 10자)"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="emergency_level"
              label="긴급도"
              rules={[{ required: true, message: '긴급도를 선택해주세요' }]}
            >
              <Radio.Group>
                <Row gutter={8}>
                  {emergencyLevelOptions.map(option => (
                    <Col key={option.value}>
                      <Radio value={option.value}>
                        <span style={{ color: option.color }}>{option.label}</span>
                      </Radio>
                    </Col>
                  ))}
                </Row>
              </Radio.Group>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12}>
            <Form.Item
              name="requires_manager_approval"
              valuePropName="checked"
            >
              <Checkbox>팀장 승인 필요</Checkbox>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="expected_completion"
          label="완료 예상 결과 (선택사항)"
        >
          <TextArea
            rows={2}
            placeholder="추가근무를 통해 달성하고자 하는 결과를 간략히 작성하세요"
            maxLength={300}
            showCount
          />
        </Form.Item>

        <Divider />

        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            첨부파일
          </Text>
          <FileUploadComponent
            value={attachments}
            onChange={setAttachments}
            disabled={loading || uploadingFiles}
            maxFiles={10}
            onUpload={handleFileUpload}
          />
        </div>

        <Divider />

        <Row gutter={16} justify="end">
          <Col>
            <Button
              size="large"
              onClick={handleSaveDraft}
              loading={loading}
              icon={<SaveOutlined />}
            >
              임시저장
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              icon={<SendOutlined />}
            >
              승인요청
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default OvertimeRequestForm;