import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Typography,
  Row,
  Col,
  Upload,
  message,
  Spin,
  Space,
  Divider,
  Alert,
  DatePicker,
  InputNumber,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  UploadOutlined,
  ArrowLeftOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { formatCurrency, parseCurrencyInput, CurrencyCode } from '../../utils/currencyUtils';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { approvalApi, ApprovalCategory, CreateDraftRequest, userApi, User, ApprovalDraft } from '../../lib/api';
import { ApprovalRouteModal } from '../../components/approval/ApprovalRouteModal';
import { ReferenceDocumentModal } from '../../components/approval/ReferenceDocumentModal';
import { ReferenceDocumentPreview } from '../../components/approval/ReferenceDocumentPreview';
import { ApprovalLineDisplay } from '../../components/approval/ApprovalLineDisplay';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;
const { TextArea } = Input;


export const CreateDraftPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const { t } = useTranslation();
  
  const editId = searchParams.get('edit');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fileList, setFileList] = useState<any[]>([]);
  const [description, setDescription] = useState<string>('');
  const [approvers, setApprovers] = useState<Array<{ userId: string; name: string; isRequired: boolean }>>([]);
  const [approvalRouteOpen, setApprovalRouteOpen] = useState(false);
  const [approvalRoute, setApprovalRoute] = useState<any>(null);
  const [referenceModalOpen, setReferenceModalOpen] = useState(false);
  const [referenceDocument, setReferenceDocument] = useState<ApprovalDraft | null>(null);
  const { user } = useAuth();

  // Get user list
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        return await userApi.getUsers();
      } catch (error) {
        console.warn('API server connection failed, using mock data:', error);
        return [
          { id: '1', name: 'Kim HR', email: 'hr@nova-hr.com', title: 'HR Manager', role: 'HR_MANAGER', employee_profile: { department: 'HR Team', emp_no: 'EMP002' } },
          { id: '2', name: 'Lee Manager', email: 'manager@nova-hr.com', title: 'Development Manager', role: 'MANAGER', employee_profile: { department: 'Development Team', emp_no: 'EMP004' } },
          { id: '3', name: 'Park Director', email: 'director@nova-hr.com', title: 'Development Director', role: 'DIRECTOR', employee_profile: { department: 'Development Department', emp_no: 'EMP005' } },
        ] as User[];
      }
    },
    retry: false,
  });

  // Get categories list
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['approval-categories'],
    queryFn: () => approvalApi.getCategories(),
    retry: 1,
  });

  // Get existing data in edit mode
  const { data: existingDraft, isLoading: draftLoading } = useQuery({
    queryKey: ['approval-draft', editId],
    queryFn: () => approvalApi.getDraft(editId!),
    enabled: !!editId,
  });

  // Create/update mutation
  const saveMutation = useMutation({
    mutationFn: (data: CreateDraftRequest) => {
      if (editId) {
        return approvalApi.updateDraft(editId, data);
      } else {
        return approvalApi.createDraft(data);
      }
    },
    onSuccess: (result) => {
      message.success(editId ? 'Document has been updated' : 'Document has been saved');
      queryClient.invalidateQueries({ queryKey: ['my-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      navigate('/approval/drafts');
    },
    onError: () => {
      message.error('Failed to save document');
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (draftId: string) => {
      console.log('Submitting draft with approval route:', approvalRoute);
      
      // Allow submission without approval route - backend will handle default route
      if (!approvalRoute || !approvalRoute.steps) {
        console.log('No approval route set, backend will create default route');
        return approvalApi.submitDraft(draftId, {
          comments: 'Please review for approval.',
        });
      }

      // Convert approvalRoute.steps to the format required by API
      const customRoute = approvalRoute.steps.map((step: any) => ({
        type: step.type,
        mode: step.type === 'APPROVAL' ? 'ALL' : 'SEQUENTIAL',
        rule: 'ALL',
        name: step.type === 'COOPERATION' ? 'Cooperation' : 
              step.type === 'APPROVAL' ? 'Approval' :
              step.type === 'REFERENCE' ? 'Reference' :
              step.type === 'RECEPTION' ? 'Reception' :
              step.type === 'CIRCULATION' ? 'Circulation' : step.type,
        approvers: [{
          userId: step.approverId,
          isRequired: step.isRequired || step.type === 'APPROVAL'
        }]
      }));

      console.log('Converted custom route:', customRoute);

      return approvalApi.submitDraft(draftId, {
        customRoute,
        comments: 'Please review for approval.',
      });
    },
    onSuccess: () => {
      message.success('Approval has been submitted');
      queryClient.invalidateQueries({ queryKey: ['my-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      navigate('/approval/drafts');
    },
    onError: () => {
      message.error('Failed to submit approval');
    },
  });

  // Set edit mode data
  useEffect(() => {
    if (existingDraft) {
      console.log('Existing draft loaded:', existingDraft);
      setSelectedCategoryId(existingDraft.category_id);
      
      // Use only content data excluding __approvalRoute
      const { __approvalRoute, ...contentFields } = existingDraft.content || {};
      
      // Convert date fields to dayjs objects
      const processedFields = { ...contentFields };
      Object.keys(processedFields).forEach(key => {
        if (key.includes('date') || key.includes('Date')) {
          const value = processedFields[key];
          if (value && typeof value === 'string') {
            processedFields[key] = dayjs(value);
          }
        }
      });
      
      setFormData(processedFields);
      setDescription(existingDraft.description || '');
      form.setFieldsValue({
        title: existingDraft.title,
        ...processedFields,
      });

      // Restore existing approval route information (priority: content.__approvalRoute > route.stages)
      console.log('Checking for approval route in content:', existingDraft.content?.__approvalRoute);
      if (existingDraft.content?.__approvalRoute) {
        console.log('Setting approval route from content:', existingDraft.content.__approvalRoute);
        setApprovalRoute(existingDraft.content.__approvalRoute);
      } else if (existingDraft.route?.stages && existingDraft.route.stages.length > 0) {
        const steps = existingDraft.route.stages.map((stage: any) => {
          if (stage.approvers && stage.approvers.length > 0) {
            const approver = stage.approvers[0]; // Use first approver
            return {
              type: stage.type,
              approverId: approver.user_id,
              approverName: approver.user?.name || approver.user_id,
              isRequired: stage.type === 'APPROVAL'
            };
          }
          return null;
        }).filter(Boolean);

        if (steps.length > 0) {
          console.log('Setting approval route from route.stages:', { steps });
          setApprovalRoute({ steps });
        }
      } else {
        console.log('No approval route found in draft');
      }
    }
  }, [existingDraft, form]);

  const selectedCategory = categories?.find(cat => cat.id === selectedCategoryId);
  
  // Function to convert JSON Schema to form fields
  const convertJsonSchemaToFields = (jsonSchema: any) => {
    if (!jsonSchema || !jsonSchema.properties) return [];
    
    const fields = [];
    const { properties, required = [] } = jsonSchema;
    
    for (const [key, property] of Object.entries(properties as any)) {
      const prop = property as any;
      const field = {
        key,
        label: prop.title || key,
        type: getFieldTypeFromProperty(prop),
        required: required.includes(key),
        placeholder: prop.description || '',
        validation: {
          min: prop.minimum,
          max: prop.maximum,
          minLength: prop.minLength,
          maxLength: prop.maxLength,
          pattern: prop.pattern,
          currency: prop['x-currency-code']
        },
        options: prop.enum
      };
      fields.push(field);
    }
    
    return fields;
  };
  
  // Function to determine field type from JSON Schema property
  const getFieldTypeFromProperty = (property: any) => {
    if (property.format) {
      switch (property.format) {
        case 'currency': return 'currency';
        case 'bank_name': return 'bank_name';
        case 'account_number': return 'account_number';
        case 'email': return 'email';
        case 'tel': return 'tel';
        case 'date': return 'date';
        case 'time': return 'time';
        case 'datetime-local': return 'datetime';
        case 'uri': return 'url';
        case 'binary': return 'file';
        default: return property.type;
      }
    }
    
    if (property.enum) {
      return property.type === 'array' ? 'multiselect' : 'select';
    }
    
    if (property.type === 'boolean') return 'boolean';
    if (property.type === 'number' || property.type === 'integer') return 'number';
    if (property.type === 'array') return 'multiselect';
    
    return property.type === 'string' ? 'text' : 'text';
  };
  
  // Generate dynamic fields
  const dynamicFields = selectedCategory && 'form_schema' in selectedCategory && selectedCategory.form_schema 
    ? convertJsonSchemaToFields(selectedCategory.form_schema)
    : [];
  
  // Debug: selectedCategory
  console.log('Selected category check:', {
    selectedCategoryId,
    selectedCategory: selectedCategory?.name,
    categoriesCount: categories?.length,
    hasFormSchema: !!(selectedCategory && 'form_schema' in selectedCategory && selectedCategory.form_schema),
    fieldsCount: dynamicFields?.length,
    jsonSchema: (selectedCategory && 'form_schema' in selectedCategory) ? selectedCategory.form_schema : null,
    dynamicFields
  });

  // Render dynamic form fields
  const renderFormField = (field: any) => {
    const { key, type, label, required, placeholder, options, validation } = field;

    const rules = [];
    if (required) {
      rules.push({ required: true, message: `Please enter ${label}` });
    }
    if (validation?.max) {
      if (type === 'text' || type === 'textarea') {
        rules.push({ max: validation.max, message: `Please enter ${validation.max} characters or less` });
      } else if (type === 'number' || type === 'currency') {
        rules.push({ max: validation.max, message: `Please enter a value of ${validation.max} or less` });
      }
    }
    if (validation?.min) {
      if (type === 'number' || type === 'currency') {
        rules.push({ min: validation.min, message: `Please enter a value of ${validation.min} or more` });
      }
    }

    switch (type) {
      case 'text':
      case 'string':
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <Input placeholder={placeholder} />
          </Form.Item>
        );
      
      case 'textarea':
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <TextArea placeholder={placeholder} rows={4} />
          </Form.Item>
        );
      
      case 'number':
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <InputNumber 
              placeholder={placeholder} 
              style={{ width: '100%' }}
              min={validation?.min}
              max={validation?.max}
            />
          </Form.Item>
        );
      
      case 'currency':
        const currencyCode = (validation?.currency || 'KRW') as CurrencyCode;
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <InputNumber
              placeholder={t('form.currency.placeholder', 'Enter amount')}
              style={{ width: '100%' }}
              min={validation?.min || 0}
              max={validation?.max}
              formatter={(value) => {
                if (!value) return '';
                return formatCurrency(Number(value), currencyCode);
              }}
              parser={(value) => {
                if (!value) return 0;
                return parseCurrencyInput(value, currencyCode);
              }}
              addonBefore={currencyCode}
            />
          </Form.Item>
        );
      
      case 'bank_name':
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <Select 
              placeholder={t('form.bankName.placeholder', 'Select a bank')}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)
                  ?.toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
            >
              {options?.map((option: string) => (
                <Select.Option key={option} value={option}>
                  {option}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      
      case 'account_number':
        return (
          <Form.Item 
            key={key} 
            name={key} 
            label={label} 
            rules={[
              ...rules,
              {
                pattern: /^[0-9-]+$/,
                message: 'Only numbers and hyphens (-) are allowed'
              }
            ]}
          >
            <Input 
              placeholder={placeholder || 'Enter account number'}
              maxLength={50}
            />
          </Form.Item>
        );
      
      case 'select':
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <Select placeholder={placeholder}>
              {options?.map((option: any) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      
      case 'date':
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <DatePicker 
              placeholder={placeholder} 
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
            />
          </Form.Item>
        );
      
      case 'email':
        return (
          <Form.Item 
            key={key} 
            name={key} 
            label={label} 
            rules={[
              ...rules,
              { type: 'email', message: 'Please enter a valid email format' }
            ]}
          >
            <Input placeholder={placeholder} type="email" />
          </Form.Item>
        );
      
      case 'tel':
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <Input placeholder={placeholder} type="tel" />
          </Form.Item>
        );
      
      case 'boolean':
        return (
          <Form.Item key={key} name={key} label={label} valuePropName="checked">
            <Input type="checkbox" />
          </Form.Item>
        );
      
      default:
        return (
          <Form.Item key={key} name={key} label={label} rules={rules}>
            <Input placeholder={placeholder} />
          </Form.Item>
        );
    }
  };

  const handleSave = async (submitAfterSave = false) => {
    try {
      const values = await form.validateFields();
      
      if (!selectedCategoryId) {
        message.error('Please select an approval form');
        return;
      }

      const { title, ...content } = values;
      
      // Convert dayjs objects to strings
      const processedContent = { ...content };
      Object.keys(processedContent).forEach(key => {
        if (key.includes('date') || key.includes('Date')) {
          const value = processedContent[key];
          if (value && dayjs.isDayjs(value)) {
            processedContent[key] = value.format('YYYY-MM-DD');
          }
        }
      });
      
      // Use different data structure for edit and create modes
      const saveData = editId ? {
        // UpdateDraftDto - exclude categoryId
        title,
        content: {
          ...processedContent,
          __approvalRoute: approvalRoute // Save approval route information in content
        },
        description,
        attachmentIds: fileList.map(file => file.response?.id).filter(Boolean),
      } : {
        // CreateDraftRequest - include category_id
        category_id: selectedCategoryId,
        title,
        form_data: {
          ...processedContent,
          __approvalRoute: approvalRoute // Save approval route information in content
        },
        comments: description,
        attachments: fileList.map(file => file.response?.id).filter(Boolean),
      } as CreateDraftRequest;

      console.log('Form values:', values);
      console.log('Submit after save:', submitAfterSave);
      console.log('Approval route:', approvalRoute);
      console.log('Processed content:', processedContent);
      console.log('Save data to be sent:', JSON.stringify(saveData, null, 2));

      const result = await saveMutation.mutateAsync(saveData as CreateDraftRequest);
      console.log('Save result:', result);
      
      if (submitAfterSave && result) {
        // Remove strict approval route validation - backend will handle default route
        // if (!approvalRoute || !approvalRoute.steps || approvalRoute.steps.filter((step: any) => step.type === 'APPROVAL').length === 0) {
        //   message.error('Please set up approvers');
        //   return;
        // }
        await submitMutation.mutateAsync(result.id);
      }
    } catch (error) {
      console.error('Save error:', error);
      message.error('An error occurred during save: ' + (error as Error).message);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    // Reset form when category changes (except title)
    const currentTitle = form.getFieldValue('title');
    form.resetFields();
    form.setFieldValue('title', currentTitle);
    setFormData({});
    
    // Apply selected category template to description field
    const category = categories?.find(cat => cat.id === categoryId);
    if (category?.template_content) {
      setDescription(category.template_content);
    }
  };

  const handleReferenceDocumentSelect = (document: ApprovalDraft) => {
    // Set reference document (for display in right panel)
    setReferenceDocument(document);
    
    setReferenceModalOpen(false);
    message.success('Reference document has been linked. Please refer to it in the right panel for writing.');
  };
  
  const handleRemoveReference = () => {
    setReferenceDocument(null);
    message.success('Reference document link has been removed.');
  };
  
  const handleViewReferenceDocument = (document: ApprovalDraft) => {
    // View reference document details (open in new tab)
    const url = `/approval/drafts/${document.id}`;
    window.open(url, '_blank');
  };


  // Debug logging
  console.log('CreateDraftPage render:', {
    editId,
    categoriesLoading,
    draftLoading,
    categories: categories?.length,
    existingDraft: existingDraft?.id,
    selectedCategoryId
  });

  if (categoriesLoading || draftLoading || (editId && !existingDraft) || (editId && existingDraft && !selectedCategory)) {
    console.log('Loading state:', { categoriesLoading, draftLoading, editId, existingDraft: !!existingDraft, selectedCategory: !!selectedCategory });
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (editId && !existingDraft) {
    console.log('Edit mode but no existing draft found');
    return (
      <div className="flex justify-center items-center h-64">
        <div>Document not found.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/approval/drafts')}
          >
            Back
          </Button>
          <Title level={2} className="!mb-0">
            {editId ? 'Edit Approval Document' : 'Create New Approval'}
          </Title>
        </div>
      </div>

      {/* Approval Line Display at Top */}
      {selectedCategoryId && (
        <div className="mb-6">
          <ApprovalLineDisplay 
            approvalRoute={approvalRoute}
            onEdit={() => setApprovalRouteOpen(true)}
          />
        </div>
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Create Approval Document">
            <Form
              form={form}
              layout="vertical"
              onFinish={() => handleSave(false)}
            >
              {/* Approval Form Selection */}
              <Form.Item
                label="Approval Form"
                required
              >
                <Select
                  placeholder="Select an approval form"
                  value={selectedCategoryId || undefined}
                  onChange={handleCategoryChange}
                  size="large"
                  disabled={!!editId} // Cannot change category in edit mode
                >
                  {categories?.map(category => (
                    <Select.Option key={category.id} value={category.id}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>


              {selectedCategory && (
                <>
                  <Divider />
                  
                  {/* Title */}
                  <Form.Item
                    name="title"
                    label="Title"
                    rules={[
                      { required: true, message: 'Please enter a title' },
                      { max: 100, message: 'Title must be 100 characters or less' },
                    ]}
                  >
                    <Input 
                      placeholder="Enter the title of the approval document"
                      size="large"
                    />
                  </Form.Item>

                  {/* Render dynamic form fields */}
                  {dynamicFields?.map((field: any) => 
                    renderFormField(field)
                  )}

                  {/* Document Content */}
                  <Form.Item
                    label="Document Content"
                    required
                  >
                    <ReactQuill
                      value={description}
                      onChange={setDescription}
                      theme="snow"
                      style={{ height: '300px', marginBottom: '50px' }}
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          ['link'],
                          ['clean']
                        ],
                      }}
                      placeholder="Edit the selected form content or enter new content"
                    />
                  </Form.Item>


                  {/* Attachments */}
                  <Form.Item label="Attachments">
                    <Upload
                      fileList={fileList}
                      onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                      beforeUpload={() => false} // Prevent automatic upload
                      multiple
                    >
                      <Button icon={<UploadOutlined />}>Select Files</Button>
                    </Upload>
                    <Text type="secondary" className="mt-2 block">
                      Up to 10MB, maximum 10 files can be attached.
                    </Text>
                  </Form.Item>
                </>
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <div className="space-y-4">
            {/* Work Actions */}
            <Card title="Actions">
              <Space direction="vertical" className="w-full">
                <Button
                  type="default"
                  icon={<SaveOutlined />}
                  size="large"
                  block
                  loading={saveMutation.isPending}
                  onClick={() => handleSave(false)}
                  disabled={!selectedCategoryId}
                >
                  Save as Draft
                </Button>
                
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  size="large"
                  block
                  loading={saveMutation.isPending || submitMutation.isPending}
                  onClick={() => handleSave(true)}
                  disabled={!selectedCategoryId}
                >
                  Submit for Approval
                </Button>
              </Space>
            </Card>
            
            {/* Reference Document - Small display on the right */}
            {!editId && (
              <div>
                <ReferenceDocumentPreview
                  referenceDocument={referenceDocument}
                  onViewDocument={handleViewReferenceDocument}
                  onRemoveReference={handleRemoveReference}
                />
                <div className="mt-2">
                  <Button
                    type="dashed"
                    icon={<FileSearchOutlined />}
                    onClick={() => setReferenceModalOpen(true)}
                    size="small"
                    block
                    className="text-xs"
                  >
                    Select Reference Document
                  </Button>
                </div>
              </div>
            )}
            
            {/* Reference Document - Also display in edit mode */}
            {editId && referenceDocument && (
              <ReferenceDocumentPreview
                referenceDocument={referenceDocument}
                onViewDocument={handleViewReferenceDocument}
              />
            )}

            {/* Approval Form Information */}
            {selectedCategory && (
              <Card title="Form Information">
                <div className="space-y-3">
                  <div>
                    <Text strong>Form Name</Text>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-lg">{selectedCategory.icon || '📋'}</span>
                      <Text>{selectedCategory.name}</Text>
                    </div>
                  </div>
                  
                  {selectedCategory.description && (
                    <div>
                      <Text strong>Description</Text>
                      <div className="mt-1">
                        <Text type="secondary">{selectedCategory.description}</Text>
                      </div>
                    </div>
                  )}

                  <div>
                    <Text strong>Template Usage</Text>
                    <div className="mt-1">
                      <Text>Document template automatically applied</Text>
                    </div>
                  </div>

                  <div>
                    <Text strong>Approval Line</Text>
                    <div className="mt-1">
                      {approvalRoute && approvalRoute.steps.length > 0 ? (
                        <div className="space-y-2 text-sm">
                          {approvalRoute.steps.filter((step: any) => step.type === 'COOPERATION').length > 0 && (
                            <div>
                              <span className="font-medium text-orange-600">Cooperation:</span>{' '}
                              {approvalRoute.steps.filter((step: any) => step.type === 'COOPERATION').map((step: any, index: number) => (
                                <span key={step.id}>
                                  {step.approverName}
                                  {index < approvalRoute.steps.filter((s: any) => s.type === 'COOPERATION').length - 1 && ' → '}
                                </span>
                              ))}
                            </div>
                          )}
                          {approvalRoute.steps.filter((step: any) => step.type === 'APPROVAL').length > 0 && (
                            <div>
                              <span className="font-medium text-green-600">Approval:</span>{' '}
                              {approvalRoute.steps.filter((step: any) => step.type === 'APPROVAL').map((step: any, index: number) => (
                                <span key={step.id}>
                                  {step.approverName}
                                  {index < approvalRoute.steps.filter((s: any) => s.type === 'APPROVAL').length - 1 && ' → '}
                                </span>
                              ))}
                            </div>
                          )}
                          {approvalRoute.steps.filter((step: any) => step.type === 'REFERENCE').length > 0 && (
                            <div>
                              <span className="font-medium text-blue-600">Reference/Reception/Circulation:</span>{' '}
                              {approvalRoute.steps.filter((step: any) => step.type === 'REFERENCE').map((step: any) => step.approverName).join(', ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Text type="secondary">Please set up the approval line</Text>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Help */}
            <Alert
              message="Writing Help"
              description={
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Save as draft to edit later</li>
                  <li>• Cannot be edited after submitting for approval</li>
                  <li>• Only PDF, image, and document files are allowed for attachments</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </div>
        </Col>
      </Row>

      {/* Approval Route Modal */}
      <ApprovalRouteModal
        open={approvalRouteOpen}
        onCancel={() => setApprovalRouteOpen(false)}
        onSave={(route) => {
          // Extract and save only steps from ApprovalRoute object
          setApprovalRoute({ steps: route.steps });
          setApprovalRouteOpen(false);
          message.success('Approval line settings have been saved.');
        }}
        userId={user?.id || ''}
        existingRoute={approvalRoute}
      />

      {/* Reference Document Modal */}
      <ReferenceDocumentModal
        open={referenceModalOpen}
        onCancel={() => setReferenceModalOpen(false)}
        onSelect={handleReferenceDocumentSelect}
      />
    </div>
  );
};