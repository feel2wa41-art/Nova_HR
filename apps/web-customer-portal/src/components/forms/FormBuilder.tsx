import React, { useState, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Divider,
  Typography,
  Row,
  Col,
  InputNumber,
  Switch,
  Modal,
  Table,
  Tabs,
  Alert,
  Tag,
  Tooltip,
  Collapse
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  EditOutlined,
  CopyOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

// 필드 타입 정의
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  DATETIME: 'datetime',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  TEXTAREA: 'textarea',
  FILE: 'file',
  MONEY: 'money',
  EMAIL: 'email',
  PHONE: 'phone',
  ADDRESS: 'address',
  TABLE: 'table',
  SECTION: 'section',
  DIVIDER: 'divider'
};

const FIELD_TYPE_OPTIONS = [
  { value: FIELD_TYPES.TEXT, label: '텍스트', icon: '📝' },
  { value: FIELD_TYPES.NUMBER, label: '숫자', icon: '🔢' },
  { value: FIELD_TYPES.DATE, label: '날짜', icon: '📅' },
  { value: FIELD_TYPES.DATETIME, label: '날짜시간', icon: '🕒' },
  { value: FIELD_TYPES.SELECT, label: '선택(단일)', icon: '📋' },
  { value: FIELD_TYPES.MULTI_SELECT, label: '선택(다중)', icon: '☑️' },
  { value: FIELD_TYPES.RADIO, label: '라디오', icon: '⚪' },
  { value: FIELD_TYPES.CHECKBOX, label: '체크박스', icon: '✅' },
  { value: FIELD_TYPES.TEXTAREA, label: '텍스트영역', icon: '📄' },
  { value: FIELD_TYPES.FILE, label: '파일업로드', icon: '📎' },
  { value: FIELD_TYPES.MONEY, label: '금액', icon: '💰' },
  { value: FIELD_TYPES.EMAIL, label: '이메일', icon: '📧' },
  { value: FIELD_TYPES.PHONE, label: '전화번호', icon: '📞' },
  { value: FIELD_TYPES.TABLE, label: '테이블', icon: '📊' },
  { value: FIELD_TYPES.SECTION, label: '섹션', icon: '📦' },
  { value: FIELD_TYPES.DIVIDER, label: '구분선', icon: '➖' }
];

interface FormField {
  id: string;
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
  id: string;
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

interface FormBuilderProps {
  initialTemplate?: FormTemplate;
  onSave: (template: FormTemplate) => void;
  onPreview: (template: FormTemplate) => void;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialTemplate,
  onSave,
  onPreview
}) => {
  const [template, setTemplate] = useState<FormTemplate>(
    initialTemplate || {
      version: '1.0',
      title: '새 양식',
      description: '',
      sections: [],
      settings: {
        submitButtonText: '제출',
        cancelButtonText: '취소',
        saveAsDraft: true,
        autoSave: false
      },
      layout: {
        columns: 12,
        spacing: 'normal'
      }
    }
  );

  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('design');

  // 섹션 추가
  const addSection = useCallback(() => {
    const newSection: FormSection = {
      id: `section_${Date.now()}`,
      title: '새 섹션',
      description: '',
      fields: []
    };

    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  }, []);

  // 필드 추가
  const addField = useCallback((sectionId: string, fieldType: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      key: `field_${Date.now()}`,
      label: '새 필드',
      type: fieldType,
      validation: {},
      colSpan: 12
    };

    // 필드 타입별 기본값 설정
    switch (fieldType) {
      case FIELD_TYPES.SELECT:
      case FIELD_TYPES.MULTI_SELECT:
      case FIELD_TYPES.RADIO:
        newField.options = [
          { value: 'option1', label: '옵션 1' },
          { value: 'option2', label: '옵션 2' }
        ];
        break;
      case FIELD_TYPES.TEXTAREA:
        newField.rows = 3;
        break;
      case FIELD_TYPES.FILE:
        newField.maxFiles = 1;
        newField.maxFileSize = 10;
        newField.acceptedFormats = ['pdf', 'jpg', 'png'];
        break;
      case FIELD_TYPES.MONEY:
        newField.currency = 'KRW';
        break;
      case FIELD_TYPES.TABLE:
        newField.columns = [
          { key: 'col1', label: '컬럼 1', type: 'text' },
          { key: 'col2', label: '컬럼 2', type: 'text' }
        ];
        newField.allowAdd = true;
        newField.allowDelete = true;
        newField.minRows = 1;
        newField.maxRows = 10;
        break;
    }

    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, newField] }
          : section
      )
    }));
  }, []);

  // 필드 편집
  const editField = useCallback((field: FormField) => {
    setSelectedField(field);
    setFieldModalVisible(true);
  }, []);

  // 필드 삭제
  const deleteField = useCallback((sectionId: string, fieldId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: section.fields.filter(f => f.id !== fieldId) }
          : section
      )
    }));
  }, []);

  // 필드 순서 변경
  const reorderFields = useCallback((sectionId: string, startIndex: number, endIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id === sectionId) {
          const fields = [...section.fields];
          const [removed] = fields.splice(startIndex, 1);
          fields.splice(endIndex, 0, removed);
          return { ...section, fields };
        }
        return section;
      })
    }));
  }, []);

  // 필드 설정 저장
  const saveFieldSettings = useCallback((updatedField: FormField) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        fields: section.fields.map(field =>
          field.id === updatedField.id ? updatedField : field
        )
      }))
    }));
    setFieldModalVisible(false);
    setSelectedField(null);
  }, []);

  // 필드 렌더링
  const renderField = (field: FormField, sectionId: string, index: number) => (
    <Draggable key={field.id} draggableId={field.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`field-item ${snapshot.isDragging ? 'dragging' : ''}`}
          style={{
            ...provided.draggableProps.style,
            marginBottom: 8,
            padding: 8,
            border: '1px dashed #d9d9d9',
            borderRadius: 4,
            backgroundColor: snapshot.isDragging ? '#f0f0f0' : 'white'
          }}
        >
          <Row align="middle" justify="space-between">
            <Col flex="auto">
              <Space>
                <div {...provided.dragHandleProps}>
                  <DragOutlined style={{ cursor: 'grab' }} />
                </div>
                <Tag color="blue">
                  {FIELD_TYPE_OPTIONS.find(opt => opt.value === field.type)?.label}
                </Tag>
                <Text strong>{field.label}</Text>
                {field.validation?.required && <Tag color="red">필수</Tag>}
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => editField(field)}
                />
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => {
                    const copiedField = { ...field, id: `field_${Date.now()}`, key: `${field.key}_copy` };
                    addField(sectionId, field.type);
                    // 복사된 필드 설정 적용 로직 추가
                  }}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => deleteField(sectionId, field.id)}
                />
              </Space>
            </Col>
          </Row>
          {field.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {field.description}
            </Text>
          )}
        </div>
      )}
    </Draggable>
  );

  // 섹션 렌더링
  const renderSection = (section: FormSection, index: number) => (
    <Card
      key={section.id}
      title={
        <Space>
          <Text strong>{section.title}</Text>
          <Tag>{section.fields.length}개 필드</Tag>
        </Space>
      }
      extra={
        <Space>
          <Select
            placeholder="필드 추가"
            style={{ width: 120 }}
            onSelect={(value) => addField(section.id, value)}
          >
            {FIELD_TYPE_OPTIONS.map(option => (
              <Option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </Option>
            ))}
          </Select>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setTemplate(prev => ({
                ...prev,
                sections: prev.sections.filter(s => s.id !== section.id)
              }));
            }}
          />
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {section.description && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {section.description}
        </Text>
      )}

      <DragDropContext
        onDragEnd={(result) => {
          if (!result.destination) return;
          reorderFields(section.id, result.source.index, result.destination.index);
        }}
      >
        <Droppable droppableId={section.id}>
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {section.fields.map((field, index) =>
                renderField(field, section.id, index)
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {section.fields.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: 40, 
          color: '#999',
          border: '2px dashed #d9d9d9',
          borderRadius: 4
        }}>
          필드를 추가해주세요
        </div>
      )}
    </Card>
  );

  const tabItems = [
    {
      key: 'design',
      label: '디자인',
      children: (
        <Row gutter={24}>
          <Col span={18}>
            <Card title="폼 구성" style={{ marginBottom: 16 }}>
              <Space style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={addSection}
                >
                  섹션 추가
                </Button>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => onPreview(template)}
                >
                  미리보기
                </Button>
              </Space>

              {template.sections.map(renderSection)}

              {template.sections.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 60, 
                  color: '#999',
                  border: '2px dashed #d9d9d9',
                  borderRadius: 4
                }}>
                  <Title level={4} type="secondary">폼이 비어있습니다</Title>
                  <Text type="secondary">섹션을 추가하여 폼을 구성해보세요</Text>
                </div>
              )}
            </Card>
          </Col>

          <Col span={6}>
            <Card title="폼 설정" size="small">
              <Form layout="vertical" size="small">
                <Form.Item label="폼 제목">
                  <Input
                    value={template.title}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      title: e.target.value
                    }))}
                  />
                </Form.Item>
                
                <Form.Item label="폼 설명">
                  <TextArea
                    rows={3}
                    value={template.description}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                  />
                </Form.Item>

                <Divider />
                
                <Form.Item label="제출 버튼 텍스트">
                  <Input
                    value={template.settings?.submitButtonText}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        submitButtonText: e.target.value
                      }
                    }))}
                  />
                </Form.Item>

                <Form.Item>
                  <Space direction="vertical">
                    <div>
                      <Switch
                        checked={template.settings?.saveAsDraft}
                        onChange={(checked) => setTemplate(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            saveAsDraft: checked
                          }
                        }))}
                      />
                      <Text style={{ marginLeft: 8 }}>임시저장 허용</Text>
                    </div>
                    
                    <div>
                      <Switch
                        checked={template.settings?.autoSave}
                        onChange={(checked) => setTemplate(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            autoSave: checked
                          }
                        }))}
                      />
                      <Text style={{ marginLeft: 8 }}>자동저장</Text>
                    </div>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'json',
      label: 'JSON',
      children: (
        <Card title="JSON 스키마">
          <TextArea
            rows={20}
            value={JSON.stringify(template, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setTemplate(parsed);
              } catch (error) {
                // JSON 파싱 오류는 무시
              }
            }}
          />
        </Card>
      )
    }
  ];

  return (
    <div>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
      />

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={() => onPreview(template)}>미리보기</Button>
          <Button type="primary" onClick={() => onSave(template)}>
            저장
          </Button>
        </Space>
      </div>

      {/* 필드 편집 모달 */}
      <FieldEditModal
        visible={fieldModalVisible}
        field={selectedField}
        onSave={saveFieldSettings}
        onCancel={() => {
          setFieldModalVisible(false);
          setSelectedField(null);
        }}
      />
    </div>
  );
};

// 필드 편집 모달 컴포넌트
interface FieldEditModalProps {
  visible: boolean;
  field: FormField | null;
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

const FieldEditModal: React.FC<FieldEditModalProps> = ({
  visible,
  field,
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (visible && field) {
      form.setFieldsValue(field);
    }
  }, [visible, field, form]);

  const handleSave = () => {
    form.validateFields().then(values => {
      if (field) {
        onSave({ ...field, ...values });
      }
    });
  };

  if (!field) return null;

  return (
    <Modal
      title="필드 설정"
      open={visible}
      onOk={handleSave}
      onCancel={onCancel}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="필드 키" name="key" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="라벨" name="label" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="설명" name="description">
          <TextArea rows={2} />
        </Form.Item>

        <Form.Item label="플레이스홀더" name="placeholder">
          <Input />
        </Form.Item>

        <Collapse>
          <Panel header="검증 규칙" key="validation">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name={['validation', 'required']} valuePropName="checked">
                  <Switch /> 필수 입력
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="최소값" name={['validation', 'min']}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="최대값" name={['validation', 'max']}>
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {(field.type === FIELD_TYPES.SELECT || 
            field.type === FIELD_TYPES.MULTI_SELECT || 
            field.type === FIELD_TYPES.RADIO) && (
            <Panel header="선택 옵션" key="options">
              {/* 옵션 설정 UI */}
              <Form.List name="options">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={8} align="middle">
                        <Col span={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'value']}
                            rules={[{ required: true }]}
                          >
                            <Input placeholder="값" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            {...restField}
                            name={[name, 'label']}
                            rules={[{ required: true }]}
                          >
                            <Input placeholder="라벨" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Button type="dashed" onClick={() => add()} block>
                      옵션 추가
                    </Button>
                  </>
                )}
              </Form.List>
            </Panel>
          )}
        </Collapse>
      </Form>
    </Modal>
  );
};

export default FormBuilder;