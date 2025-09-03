import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  InputNumber,
  Divider,
  Tag,
  Popconfirm,
  Collapse,
  Alert,
  App,
} from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Option } = Select;
const { Panel } = Collapse;
const { TextArea } = Input;

interface FormField {
  id: string;
  name: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    currency?: string;
  };
}

interface FormSchemaBuilderProps {
  initialSchema?: any;
  onSchemaChange: (schema: any) => void;
}

export const FormSchemaBuilder: React.FC<FormSchemaBuilderProps> = ({
  initialSchema,
  onSchemaChange,
}) => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [fields, setFields] = useState<FormField[]>(() => {
    if (initialSchema?.properties) {
      return Object.entries(initialSchema.properties).map(([key, value]: [string, any], index) => ({
        id: `field_${index}`,
        name: key,
        type: value.type || 'string',
        title: value.title || key,
        description: value.description,
        required: initialSchema.required?.includes(key) || false,
        options: value.enum,
        validation: {
          min: value.minimum,
          max: value.maximum,
          minLength: value.minLength,
          maxLength: value.maxLength,
          pattern: value.pattern,
        },
      }));
    }
    return [];
  });

  const fieldTypes = [
    { value: 'string', label: t('form.fields.text', '텍스트') },
    { value: 'number', label: t('form.fields.number', '숫자') },
    { value: 'currency', label: t('form.fields.currency', '화폐/금액') },
    { value: 'bank_name', label: t('form.fields.bank_name', '은행명') },
    { value: 'account_number', label: t('form.fields.account_number', '계좌번호') },
    { value: 'boolean', label: t('form.fields.boolean', '체크박스') },
    { value: 'date', label: t('form.fields.date', '날짜') },
    { value: 'time', label: t('form.fields.time', '시간') },
    { value: 'datetime', label: t('form.fields.datetime', '날짜시간') },
    { value: 'email', label: t('form.fields.email', '이메일') },
    { value: 'tel', label: t('form.fields.tel', '전화번호') },
    { value: 'url', label: 'URL' },
    { value: 'textarea', label: t('form.fields.textarea', '긴 텍스트') },
    { value: 'select', label: t('form.fields.select', '선택 목록') },
    { value: 'multiselect', label: '다중 선택' },
    { value: 'file', label: t('form.fields.file', '파일 업로드') },
  ];

  const generateSchema = () => {
    const properties: any = {};
    const required: string[] = [];

    fields.forEach(field => {
      if (field.name) {
        const propDef: any = {
          type: field.type === 'textarea' ? 'string' : field.type,
          title: field.title,
        };

        if (field.description) {
          propDef.description = field.description;
        }

        // Handle special types
        if (field.type === 'date') {
          propDef.format = 'date';
        } else if (field.type === 'time') {
          propDef.format = 'time';
        } else if (field.type === 'datetime') {
          propDef.format = 'datetime-local';
        } else if (field.type === 'email') {
          propDef.format = 'email';
        } else if (field.type === 'url') {
          propDef.format = 'uri';
        } else if (field.type === 'tel') {
          propDef.format = 'tel';
        } else if (field.type === 'file') {
          propDef.type = 'string';
          propDef.format = 'binary';
        } else if (field.type === 'currency') {
          propDef.type = 'number';
          propDef.format = 'currency';
          propDef.minimum = 0;
          propDef['x-currency'] = true;  // Custom property for currency formatting
        } else if (field.type === 'bank_name') {
          propDef.type = 'string';
          propDef.format = 'bank_name';
          propDef['x-input-type'] = 'bank_name';  // Custom property
        } else if (field.type === 'account_number') {
          propDef.type = 'string';
          propDef.format = 'account_number';
          propDef.pattern = '^[0-9-]+$';  // Allow numbers and dashes
          propDef['x-input-type'] = 'account_number';
        }

        // Handle select options
        if ((field.type === 'select' || field.type === 'multiselect' || field.type === 'bank_name') && field.options?.length) {
          propDef.enum = field.options;
          if (field.type === 'multiselect') {
            propDef.type = 'array';
            propDef.items = {
              type: 'string',
              enum: field.options,
            };
            propDef.uniqueItems = true;
          }
        }

        // Handle validation
        if (field.validation) {
          if (field.validation.min !== undefined) propDef.minimum = field.validation.min;
          if (field.validation.max !== undefined) propDef.maximum = field.validation.max;
          if (field.validation.minLength !== undefined) propDef.minLength = field.validation.minLength;
          if (field.validation.maxLength !== undefined) propDef.maxLength = field.validation.maxLength;
          if (field.validation.pattern) propDef.pattern = field.validation.pattern;
          
          // Handle currency specific properties
          if (field.type === 'currency' && field.validation.currency) {
            propDef['x-currency-code'] = field.validation.currency;
          }
        }

        properties[field.name] = propDef;

        if (field.required) {
          required.push(field.name);
        }
      }
    });

    const schema = {
      type: 'object',
      properties,
      required,
    };

    return schema;
  };

  const handleFieldChange = (fieldId: string, updates: Partial<FormField>) => {
    setFields(prev => 
      prev.map(field => 
        field.id === fieldId 
          ? { ...field, ...updates }
          : field
      )
    );
  };

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: `field${fields.length + 1}`,
      type: 'string',
      title: t('form.defaultFieldTitle', `필드 ${fields.length + 1}`),
      required: false,
    };
    setFields(prev => [...prev, newField]);
  };

  const deleteField = (fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId));
  };

  const duplicateField = (fieldId: string) => {
    const fieldToCopy = fields.find(field => field.id === fieldId);
    if (fieldToCopy) {
      const newField: FormField = {
        ...fieldToCopy,
        id: `field_${Date.now()}`,
        name: `${fieldToCopy.name}_copy`,
        title: `${fieldToCopy.title} ${t('form.copy', '(복사본)')}`,

      };
      setFields(prev => [...prev, newField]);
    }
  };

  // Schema 변경시 부모에게 알림
  React.useEffect(() => {
    const schema = generateSchema();
    onSchemaChange(schema);
  }, [fields]);

  const handlePreview = () => {
    const schema = generateSchema();
    message.info(t('form.schemaOutputToConsole', '스키마가 콘솔에 출력되었습니다.'));
    console.log('Generated Schema:', JSON.stringify(schema, null, 2));
  };

  const renderFieldEditor = (field: FormField) => (
    <Card 
      key={field.id}
      size="small" 
      className="mb-4"
      title={
        <div className="flex items-center justify-between">
          <span>{field.title || '새 필드'}</span>
          <div className="flex items-center gap-2">
            <Tag color={field.required ? 'red' : 'default'}>
              {field.required ? t('common.required', '필수') : t('common.optional', '선택')}
            </Tag>
            <Space>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => duplicateField(field.id)}
                title={t('common.duplicate', '복제')}
              />
              <Popconfirm
                title={t('form.deleteFieldConfirm', '필드를 삭제하시겠습니까?')}
                onConfirm={() => deleteField(field.id)}
                okText={t('common.delete', '삭제')}
                cancelText={t('common.cancel', '취소')}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  title={t('common.delete', '삭제')}
                />
              </Popconfirm>
            </Space>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Form.Item label={t('form.fieldName', '필드명')}>
          <Input
            value={field.name}
            onChange={e => handleFieldChange(field.id, { name: e.target.value })}
            placeholder={t('form.fieldNamePlaceholder', '예: leaveType')}
          />
        </Form.Item>

        <Form.Item label={t('form.displayName', '표시명')}>
          <Input
            value={field.title}
            onChange={e => handleFieldChange(field.id, { title: e.target.value })}
            placeholder={t('form.displayNamePlaceholder', '예: 휴가 종류')}
          />
        </Form.Item>

        <Form.Item label={t('form.fieldType', '필드 타입')}>
          <Select
            value={field.type}
            onChange={value => handleFieldChange(field.id, { type: value })}
          >
            {fieldTypes.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={t('form.required', '필수 여부')}>
          <Switch
            checked={field.required}
            onChange={required => handleFieldChange(field.id, { required })}
          />
        </Form.Item>
      </div>

      <Form.Item label={t('form.description', '설명')}>
        <TextArea
          rows={2}
          value={field.description}
          onChange={e => handleFieldChange(field.id, { description: e.target.value })}
          placeholder={t('form.descriptionPlaceholder', '필드에 대한 설명을 입력하세요')}
        />
      </Form.Item>

      {/* 선택 옵션 (select, multiselect) */}
      {(field.type === 'select' || field.type === 'multiselect') && (
        <Form.Item label={t('form.selectOptions', '선택 옵션 (한 줄에 하나씩)')}>
          <TextArea
            rows={3}
            value={field.options?.join('\n') || ''}
            onChange={e => {
              const options = e.target.value.split('\n').filter(opt => opt.trim());
              handleFieldChange(field.id, { options });
            }}
            placeholder={t('form.selectOptionsPlaceholder', '옵션1\n옵션2\n옵션3')}
          />
        </Form.Item>
      )}

      {/* 은행명 선택 옵션 */}
      {field.type === 'bank_name' && (
        <Form.Item label={t('form.bankList', '은행 목록 (한 줄에 하나씩)')}>
          <TextArea
            rows={5}
            value={field.options?.join('\n') || ''}
            onChange={e => {
              const options = e.target.value.split('\n').filter(opt => opt.trim());
              handleFieldChange(field.id, { options });
            }}
            placeholder={t('form.bankListPlaceholder', '국민은행\n신한은행\n우리은행\n하나은행\n기업은행')}
          />
          <div className="mt-2">
            <Button
              size="small"
              onClick={() => {
                const koreanBanks = [
                  '국민은행', '신한은행', '우리은행', '하나은행', '기업은행',
                  '농협은행', '수협은행', '대구은행', '부산은행', '광주은행',
                  '제주은행', '전북은행', '경남은행', '우체국', '새마을금고',
                  '신협', '산업은행', '수출입은행', '토스뱅크', '카카오뱅크', 'K뱅크'
                ];
                handleFieldChange(field.id, { options: koreanBanks });
              }}
            >
              {t('form.bankName.autoFill', '한국 주요 은행 자동 입력')}
            </Button>
          </div>
        </Form.Item>
      )}

      {/* 숫자 검증 (number) */}
      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label={t('form.minValue', '최소값')}>
            <InputNumber
              value={field.validation?.min}
              onChange={min => handleFieldChange(field.id, {
                validation: { ...field.validation, min }
              })}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={t('form.maxValue', '최대값')}>
            <InputNumber
              value={field.validation?.max}
              onChange={max => handleFieldChange(field.id, {
                validation: { ...field.validation, max }
              })}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>
      )}

      {/* 화폐 설정 (currency) */}
      {field.type === 'currency' && (
        <div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label={t('form.minAmount', '최소 금액')}>
              <InputNumber
                value={field.validation?.min}
                onChange={min => handleFieldChange(field.id, {
                  validation: { ...field.validation, min }
                })}
                style={{ width: '100%' }}
                placeholder="0"
              />
            </Form.Item>
            <Form.Item label={t('form.maxAmount', '최대 금액')}>
              <InputNumber
                value={field.validation?.max}
                onChange={max => handleFieldChange(field.id, {
                  validation: { ...field.validation, max }
                })}
                style={{ width: '100%' }}
                placeholder="1000000"
              />
            </Form.Item>
          </div>
          <Form.Item label={t('form.currency.currencyCode', '통화 코드')}>
            <Select
              value={field.validation?.currency || 'KRW'}
              onChange={currency => handleFieldChange(field.id, {
                validation: { ...field.validation, currency }
              })}
              placeholder={t('form.currency.selectCurrency', '통화 선택')}
            >
              <Option value="KRW">{t('form.currency.KRW', 'KRW (한국 원)')}</Option>
              <Option value="USD">{t('form.currency.USD', 'USD (미국 달러)')}</Option>
              <Option value="EUR">{t('form.currency.EUR', 'EUR (유로)')}</Option>
              <Option value="JPY">{t('form.currency.JPY', 'JPY (일본 엔)')}</Option>
              <Option value="CNY">{t('form.currency.CNY', 'CNY (중국 위안)')}</Option>
              <Option value="GBP">{t('form.currency.GBP', 'GBP (영국 파운드)')}</Option>
              <Option value="IDR">{t('form.currency.IDR', 'IDR (인도네시아 루피아)')}</Option>
            </Select>
          </Form.Item>
        </div>
      )}

      {/* 텍스트 길이 검증 (string, textarea) */}
      {(field.type === 'string' || field.type === 'textarea') && (
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label={t('form.minLength', '최소 길이')}>
            <InputNumber
              value={field.validation?.minLength}
              onChange={minLength => handleFieldChange(field.id, {
                validation: { ...field.validation, minLength }
              })}
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label={t('form.maxLength', '최대 길이')}>
            <InputNumber
              value={field.validation?.maxLength}
              onChange={maxLength => handleFieldChange(field.id, {
                validation: { ...field.validation, maxLength }
              })}
              min={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>
      )}
    </Card>
  );

  return (
    <div>
      <Alert
        message={t('form.schemaBuilderTitle', '폼 스키마 빌더')}
        description={t('form.schemaBuilderDescription', '전자결재에서 사용할 동적 폼의 필드를 구성하세요. 생성된 스키마는 JSON Schema 형식으로 저장됩니다.')}
        type="info"
        showIcon
        className="mb-4"
      />
      
      <div className="mb-4 flex justify-between items-center">
        <h4>{t('form.formFieldConfig', '폼 필드 구성')}</h4>
        <Space>
          <Button onClick={handlePreview}>{t('form.schemaPreview', '스키마 미리보기')}</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addField}
          >
            {t('form.addField', '필드 추가')}
          </Button>
        </Space>
      </div>

      {fields.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-500">
            <p>{t('form.noFieldsYet', '아직 필드가 없습니다.')}</p>
            <p>{t('form.clickAddField', '"필드 추가" 버튼을 클릭하여 새 필드를 추가하세요.')}</p>
          </div>
        </Card>
      ) : (
        <div>
          {fields.map(renderFieldEditor)}
        </div>
      )}

      {fields.length > 0 && (
        <Collapse className="mt-4">
          <Panel header={t('form.generatedSchema', '생성된 JSON Schema')} key="schema">
            <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(generateSchema(), null, 2)}
            </pre>
          </Panel>
        </Collapse>
      )}
    </div>
  );
};