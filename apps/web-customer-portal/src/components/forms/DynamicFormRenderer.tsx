import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Radio,
  Checkbox,
  Switch,
  Upload,
  Button,
  Table,
  Card,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Alert,
  Progress,
  message,
  Modal
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface FormField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  description?: string;
  helpText?: string;
  defaultValue?: any;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
  options?: Array<{ value: string; label: string; description?: string }>;
  columns?: Array<{
    key: string;
    label: string;
    type: string;
    validation?: any;
    options?: any[];
    width?: number;
  }>;
  rows?: number;
  maxFiles?: number;
  acceptedFormats?: string[];
  maxFileSize?: number;
  currency?: string;
  allowAdd?: boolean;
  allowDelete?: boolean;
  minRows?: number;
  maxRows?: number;
  colSpan?: number;
  conditional?: {
    field: string;
    operator: string;
    value: any;
  };
}

interface FormSection {
  title: string;
  description?: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

interface FormTemplate {
  version: string;
  title: string;
  description?: string;
  sections: FormSection[];
  settings?: {
    submitButtonText?: string;
    cancelButtonText?: string;
    saveAsDraft?: boolean;
    autoSave?: boolean;
    autoSaveInterval?: number;
    showProgress?: boolean;
    confirmOnLeave?: boolean;
  };
  layout?: {
    columns?: number;
    spacing?: string;
  };
}

interface DynamicFormRendererProps {
  template: FormTemplate;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onSaveDraft?: (data: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  readonly?: boolean;
  hideActions?: boolean;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  template,
  initialData = {},
  onSubmit,
  onSaveDraft,
  onCancel,
  loading = false,
  readonly = false,
  hideActions = false
}) => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 조건부 필드 표시 여부 판단
  const shouldShowField = useCallback((field: FormField) => {
    if (!field.conditional) return true;

    const { field: conditionField, operator, value } = field.conditional;
    const currentValue = formData[conditionField];

    switch (operator) {
      case 'equals':
        return currentValue === value;
      case 'not_equals':
        return currentValue !== value;
      case 'contains':
        return Array.isArray(currentValue) 
          ? currentValue.includes(value)
          : String(currentValue || '').includes(String(value));
      case 'greater_than':
        return Number(currentValue) > Number(value);
      case 'less_than':
        return Number(currentValue) < Number(value);
      default:
        return true;
    }
  }, [formData]);

  // 필드 값 변경 핸들러
  const handleFieldChange = useCallback((fieldKey: string, value: any) => {
    const newData = { ...formData, [fieldKey]: value };
    setFormData(newData);
    setHasUnsavedChanges(true);
    form.setFieldsValue({ [fieldKey]: value });
  }, [form, formData]);

  // 테이블 필드 렌더링
  const renderTableField = (field: FormField) => {
    const tableData = formData[field.key] || [];

    const columns = field.columns?.map(col => ({
      title: col.label,
      dataIndex: col.key,
      key: col.key,
      width: col.width,
      render: (value: any, record: any, index: number) => {
        switch (col.type) {
          case 'number':
            return (
              <InputNumber
                style={{ width: '100%' }}
                value={value}
                disabled={readonly}
                onChange={(val) => {
                  const newTableData = [...tableData];
                  newTableData[index] = { ...newTableData[index], [col.key]: val };
                  handleFieldChange(field.key, newTableData);
                }}
              />
            );
          case 'money':
            return (
              <InputNumber
                style={{ width: '100%' }}
                value={value}
                disabled={readonly}
                formatter={(value) => `${field.currency || 'KRW'} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/[^\d]/g, '')}
                onChange={(val) => {
                  const newTableData = [...tableData];
                  newTableData[index] = { ...newTableData[index], [col.key]: val };
                  handleFieldChange(field.key, newTableData);
                }}
              />
            );
          case 'select':
            return (
              <Select
                style={{ width: '100%' }}
                value={value}
                disabled={readonly}
                onChange={(val) => {
                  const newTableData = [...tableData];
                  newTableData[index] = { ...newTableData[index], [col.key]: val };
                  handleFieldChange(field.key, newTableData);
                }}
              >
                {col.options?.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            );
          default:
            return (
              <Input
                value={value}
                disabled={readonly}
                onChange={(e) => {
                  const newTableData = [...tableData];
                  newTableData[index] = { ...newTableData[index], [col.key]: e.target.value };
                  handleFieldChange(field.key, newTableData);
                }}
              />
            );
        }
      }
    }));

    // 삭제 컬럼 추가
    if (field.allowDelete && !readonly) {
      columns?.push({
        title: '작업',
        dataIndex: 'actions',
        key: 'actions',
        width: 80,
        render: (_, record, index) => (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => {
              const newTableData = tableData.filter((_: any, i: number) => i !== index);
              handleFieldChange(field.key, newTableData);
            }}
          />
        )
      });
    }

    return (
      <div>
        <Table
          columns={columns}
          dataSource={tableData.map((item: any, index: number) => ({ ...item, key: index }))}
          pagination={false}
          size="small"
          bordered
        />
        {field.allowAdd && !readonly && (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => {
              const newRow = field.columns?.reduce((acc, col) => {
                acc[col.key] = col.type === 'number' || col.type === 'money' ? 0 : '';
                return acc;
              }, {} as any) || {};
              
              const newTableData = [...tableData, newRow];
              handleFieldChange(field.key, newTableData);
            }}
            style={{ width: '100%', marginTop: 8 }}
          >
            행 추가
          </Button>
        )}
      </div>
    );
  };

  // 개별 필드 렌더링
  const renderField = (field: FormField) => {
    if (!shouldShowField(field)) return null;

    const commonProps = {
      disabled: readonly,
      placeholder: field.placeholder
    };

    const rules = [];
    if (field.validation?.required) {
      rules.push({ required: true, message: field.validation.message || `${field.label}은(는) 필수입니다` });
    }
    if (field.validation?.pattern) {
      rules.push({ pattern: new RegExp(field.validation.pattern), message: field.validation.message || '형식이 올바르지 않습니다' });
    }

    let fieldComponent;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        fieldComponent = <Input {...commonProps} type={field.type === 'email' ? 'email' : 'text'} />;
        break;

      case 'textarea':
        fieldComponent = <TextArea {...commonProps} rows={field.rows || 3} />;
        break;

      case 'number':
        fieldComponent = (
          <InputNumber
            {...commonProps}
            style={{ width: '100%' }}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );
        break;

      case 'money':
        fieldComponent = (
          <InputNumber
            {...commonProps}
            style={{ width: '100%' }}
            formatter={(value) => `${field.currency || 'KRW'} ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value!.replace(/[^\d]/g, '')}
          />
        );
        break;

      case 'date':
        fieldComponent = (
          <DatePicker
            {...commonProps}
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        );
        break;

      case 'datetime':
        fieldComponent = (
          <DatePicker
            {...commonProps}
            style={{ width: '100%' }}
            showTime
            format="YYYY-MM-DD HH:mm:ss"
          />
        );
        break;

      case 'select':
        fieldComponent = (
          <Select {...commonProps} style={{ width: '100%' }}>
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
        break;

      case 'multi_select':
        fieldComponent = (
          <Select {...commonProps} mode="multiple" style={{ width: '100%' }}>
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
        break;

      case 'radio':
        fieldComponent = (
          <Radio.Group {...commonProps}>
            {field.options?.map(option => (
              <Radio key={option.value} value={option.value}>
                {option.label}
              </Radio>
            ))}
          </Radio.Group>
        );
        break;

      case 'checkbox':
        fieldComponent = <Checkbox {...commonProps}>{field.label}</Checkbox>;
        break;

      case 'file':
        fieldComponent = (
          <Upload
            {...commonProps}
            multiple={field.maxFiles !== 1}
            maxCount={field.maxFiles}
            beforeUpload={() => false}
            accept={field.acceptedFormats?.map(format => `.${format}`).join(',')}
          >
            <Button icon={<UploadOutlined />}>파일 선택</Button>
          </Upload>
        );
        break;

      case 'table':
        fieldComponent = renderTableField(field);
        break;

      case 'divider':
        return <Divider key={field.key}>{field.label}</Divider>;

      default:
        fieldComponent = <Input {...commonProps} />;
    }

    return (
      <Col span={field.colSpan || 24} key={field.key}>
        <Form.Item
          name={field.key}
          label={field.type !== 'checkbox' ? field.label : undefined}
          rules={rules}
          help={field.helpText}
          tooltip={field.description}
        >
          {fieldComponent}
        </Form.Item>
      </Col>
    );
  };

  // 폼 제출
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      await onSubmit({ ...formData, ...values });
      setHasUnsavedChanges(false);
      message.success('성공적으로 제출되었습니다');
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 임시저장
  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    
    try {
      setIsDraftSaving(true);
      const values = form.getFieldsValue();
      await onSaveDraft({ ...formData, ...values });
      setHasUnsavedChanges(false);
      message.success('임시저장되었습니다');
    } catch (error) {
      console.error('Save draft failed:', error);
      message.error('임시저장에 실패했습니다');
    } finally {
      setIsDraftSaving(false);
    }
  };

  return (
    <div>
      {/* 제목과 설명 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>{template.title}</Title>
        {template.description && (
          <Text type="secondary">{template.description}</Text>
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={initialData}
        onValuesChange={(changedValues, allValues) => {
          setFormData(prev => ({ ...prev, ...allValues }));
          setHasUnsavedChanges(true);
        }}
      >
        {template.sections.map((section, sectionIndex) => (
          <Card 
            key={sectionIndex}
            title={section.title}
            style={{ marginBottom: 16 }}
          >
            {section.description && (
              <Alert 
                message={section.description} 
                type="info" 
                showIcon 
                style={{ marginBottom: 16 }}
              />
            )}
            
            <Row gutter={16}>
              {section.fields.map(renderField)}
            </Row>
          </Card>
        ))}

        {/* 액션 버튼 */}
        {!hideActions && (
          <Card>
            <Row justify="end">
              <Space>
                {onCancel && (
                  <Button onClick={onCancel}>
                    {template.settings?.cancelButtonText || '취소'}
                  </Button>
                )}
                
                {template.settings?.saveAsDraft && onSaveDraft && (
                  <Button 
                    onClick={handleSaveDraft}
                    loading={isDraftSaving}
                    disabled={readonly}
                  >
                    임시저장
                  </Button>
                )}
                
                <Button 
                  type="primary" 
                  onClick={handleSubmit}
                  loading={isSubmitting || loading}
                  disabled={readonly}
                >
                  {template.settings?.submitButtonText || '제출'}
                </Button>
              </Space>
            </Row>
          </Card>
        )}
      </Form>
    </div>
  );
};