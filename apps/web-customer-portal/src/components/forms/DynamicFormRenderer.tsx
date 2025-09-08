import React from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Switch, Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'boolean' | 'file';
  required?: boolean;
  options?: { label: string; value: string | number }[];
  placeholder?: string;
  rules?: any[];
}

export interface DynamicFormRendererProps {
  fields: FormField[];
  onFinish: (values: any) => void;
  initialValues?: any;
  loading?: boolean;
  submitText?: string;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  fields,
  onFinish,
  initialValues,
  loading = false,
  submitText = '제출'
}) => {
  const [form] = Form.useForm();

  const renderField = (field: FormField) => {
    const commonProps = {
      placeholder: field.placeholder || field.label
    };

    switch (field.type) {
      case 'textarea':
        return <TextArea rows={4} {...commonProps} />;
      
      case 'number':
        return <InputNumber style={{ width: '100%' }} {...commonProps} />;
      
      case 'select':
        return (
          <Select {...commonProps}>
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      
      case 'date':
        return <DatePicker style={{ width: '100%' }} />;
      
      case 'boolean':
        return <Switch />;
      
      case 'file':
        return (
          <Upload
            beforeUpload={() => false}
            multiple
          >
            <Button icon={<UploadOutlined />}>파일 선택</Button>
          </Upload>
        );
      
      default:
        return <Input {...commonProps} />;
    }
  };

  const getFormRules = (field: FormField) => {
    const rules = field.rules || [];
    if (field.required) {
      rules.unshift({ required: true, message: `${field.label}을(를) 입력해주세요.` });
    }
    return rules;
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={initialValues}
    >
      {fields.map((field) => (
        <Form.Item
          key={field.name}
          name={field.name}
          label={field.label}
          rules={getFormRules(field)}
        >
          {renderField(field)}
        </Form.Item>
      ))}
      
      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          style={{ width: '100%' }}
        >
          {submitText}
        </Button>
      </Form.Item>
    </Form>
  );
};