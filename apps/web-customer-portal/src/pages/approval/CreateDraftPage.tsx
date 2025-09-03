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

  // 사용자 목록 조회
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        return await userApi.getUsers();
      } catch (error) {
        console.warn('API 서버 연결 실패, 목업 데이터 사용:', error);
        return [
          { id: '1', name: '김인사', email: 'hr@nova-hr.com', title: 'HR 매니저', role: 'HR_MANAGER', employee_profile: { department: 'HR팀', emp_no: 'EMP002' } },
          { id: '2', name: '이팀장', email: 'manager@nova-hr.com', title: '개발팀장', role: 'MANAGER', employee_profile: { department: '개발팀', emp_no: 'EMP004' } },
          { id: '3', name: '박부장', email: 'director@nova-hr.com', title: '개발부장', role: 'DIRECTOR', employee_profile: { department: '개발부', emp_no: 'EMP005' } },
        ] as User[];
      }
    },
    retry: false,
  });

  // 카테고리 목록 조회 (임시 목업 데이터 사용)
  const mockCategories = [
    {
      id: '1',
      name: '비용 청구',
      code: 'REIMBURSEMENT',
      description: '업무 관련 비용 청구',
      icon: '💳',
      template_content: `<h3>비용 청구서</h3><p><strong>신청자:</strong> [신청자명]</p><p><strong>신청일:</strong> [신청일자]</p><p><strong>청구 금액:</strong> [금액]원</p><p><strong>비용 분류:</strong> [비용분류]</p><p><strong>사용 내역:</strong></p><p>[사용 내역을 상세히 입력해주세요]</p><p><strong>사용처:</strong> [사용처]</p><p><strong>영수증 날짜:</strong> [영수증날짜]</p><br><p>위와 같이 비용을 청구드리오니 승인해주시기 바랍니다.</p>`,
      is_active: true
    },
    {
      id: '2',
      name: '회사용품 요청',
      code: 'SUPPLY_REQUEST',
      description: '사무용품 및 장비 요청',
      icon: '📦',
      template_content: `<h3>회사용품 요청서</h3><p><strong>신청자:</strong> [신청자명]</p><p><strong>신청일:</strong> [신청일자]</p><p><strong>품목명:</strong> [품목명]</p><p><strong>수량:</strong> [수량]</p><p><strong>긴급도:</strong> [긴급도]</p><p><strong>요청 사유:</strong></p><p>[요청 사유를 입력해주세요]</p><br><p>위와 같이 용품을 요청드리오니 승인해주시기 바랍니다.</p>`,
      is_active: true
    },
    {
      id: '3',
      name: '휴가 신청',
      code: 'LEAVE_REQUEST',
      description: '연차/병가 등 휴가 신청',
      icon: '🏖️',
      template_content: `<h3>휴가 신청서</h3><p><strong>신청자:</strong> [신청자명]</p><p><strong>신청일:</strong> [신청일자]</p><p><strong>휴가 유형:</strong> [휴가유형]</p><p><strong>휴가 기간:</strong> [시작일] ~ [종료일]</p><p><strong>사유:</strong></p><p>[휴가 사유를 입력해주세요]</p><br><p>위와 같이 휴가를 신청드리오니 승인해주시기 바랍니다.</p>`,
      is_active: true
    }
  ];

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['approval-categories'],
    queryFn: async () => {
      try {
        return await approvalApi.getCategories();
      } catch (error) {
        console.warn('API 서버 연결 실패, 목업 데이터 사용:', error);
        return mockCategories;
      }
    },
    retry: false,
  });

  // 편집 모드인 경우 기존 데이터 조회
  const { data: existingDraft, isLoading: draftLoading } = useQuery({
    queryKey: ['approval-draft', editId],
    queryFn: () => approvalApi.getDraft(editId!),
    enabled: !!editId,
  });

  // 생성/수정 뮤테이션
  const saveMutation = useMutation({
    mutationFn: (data: CreateDraftRequest) => {
      if (editId) {
        return approvalApi.updateDraft(editId, data);
      } else {
        return approvalApi.createDraft(data);
      }
    },
    onSuccess: (result) => {
      message.success(editId ? '문서가 수정되었습니다' : '문서가 저장되었습니다');
      queryClient.invalidateQueries({ queryKey: ['my-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      navigate('/approval/drafts');
    },
    onError: () => {
      message.error('문서 저장에 실패했습니다');
    },
  });

  // 제출 뮤테이션
  const submitMutation = useMutation({
    mutationFn: async (draftId: string) => {
      console.log('Submitting draft with approval route:', approvalRoute);
      
      // Allow submission without approval route - backend will handle default route
      if (!approvalRoute || !approvalRoute.steps) {
        console.log('No approval route set, backend will create default route');
        return approvalApi.submitDraft(draftId, {
          comments: '결재 요청드립니다.',
        });
      }

      // approvalRoute.steps를 API에서 요구하는 형태로 변환
      const customRoute = approvalRoute.steps.map((step: any) => ({
        type: step.type,
        mode: step.type === 'APPROVAL' ? 'ALL' : 'SEQUENTIAL',
        rule: 'ALL',
        name: step.type === 'COOPERATION' ? '협조' : 
              step.type === 'APPROVAL' ? '결재' :
              step.type === 'REFERENCE' ? '참조' :
              step.type === 'RECEPTION' ? '수신' :
              step.type === 'CIRCULATION' ? '공람' : step.type,
        approvers: [{
          userId: step.approverId,
          isRequired: step.isRequired || step.type === 'APPROVAL'
        }]
      }));

      console.log('Converted custom route:', customRoute);

      return approvalApi.submitDraft(draftId, {
        customRoute,
        comments: '결재 요청드립니다.',
      });
    },
    onSuccess: () => {
      message.success('결재가 제출되었습니다');
      queryClient.invalidateQueries({ queryKey: ['my-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['approval-stats'] });
      navigate('/approval/drafts');
    },
    onError: () => {
      message.error('결재 제출에 실패했습니다');
    },
  });

  // 편집 모드 데이터 설정
  useEffect(() => {
    if (existingDraft) {
      console.log('Existing draft loaded:', existingDraft);
      setSelectedCategoryId(existingDraft.category_id);
      
      // __approvalRoute 제외한 content 데이터만 사용
      const { __approvalRoute, ...contentFields } = existingDraft.content || {};
      
      // 날짜 필드들을 dayjs 객체로 변환
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

      // 기존 결재선 정보가 있으면 복원 (우선순위: content.__approvalRoute > route.stages)
      console.log('Checking for approval route in content:', existingDraft.content?.__approvalRoute);
      if (existingDraft.content?.__approvalRoute) {
        console.log('Setting approval route from content:', existingDraft.content.__approvalRoute);
        setApprovalRoute(existingDraft.content.__approvalRoute);
      } else if (existingDraft.route?.stages && existingDraft.route.stages.length > 0) {
        const steps = existingDraft.route.stages.map((stage: any) => {
          if (stage.approvers && stage.approvers.length > 0) {
            const approver = stage.approvers[0]; // 첫 번째 결재자 사용
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
  
  // JSON Schema를 폼 필드로 변환하는 함수
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
  
  // JSON Schema property에서 필드 타입을 결정하는 함수
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
  
  // 동적 필드 생성
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

  // 동적 폼 필드 렌더링
  const renderFormField = (field: any) => {
    const { key, type, label, required, placeholder, options, validation } = field;

    const rules = [];
    if (required) {
      rules.push({ required: true, message: `${label}을(를) 입력해주세요` });
    }
    if (validation?.max) {
      if (type === 'text' || type === 'textarea') {
        rules.push({ max: validation.max, message: `${validation.max}자 이하로 입력해주세요` });
      } else if (type === 'number' || type === 'currency') {
        rules.push({ max: validation.max, message: `${validation.max} 이하의 값을 입력해주세요` });
      }
    }
    if (validation?.min) {
      if (type === 'number' || type === 'currency') {
        rules.push({ min: validation.min, message: `${validation.min} 이상의 값을 입력해주세요` });
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
              placeholder={t('form.currency.placeholder', '금액을 입력하세요')}
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
              placeholder={t('form.bankName.placeholder', '은행을 선택하세요')}
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
                message: '숫자와 하이픈(-)만 입력 가능합니다'
              }
            ]}
          >
            <Input 
              placeholder={placeholder || '계좌번호를 입력하세요'}
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
              { type: 'email', message: '올바른 이메일 형식을 입력해주세요' }
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
        message.error('결재 양식을 선택해주세요');
        return;
      }

      const { title, ...content } = values;
      
      // dayjs 객체를 문자열로 변환
      const processedContent = { ...content };
      Object.keys(processedContent).forEach(key => {
        if (key.includes('date') || key.includes('Date')) {
          const value = processedContent[key];
          if (value && dayjs.isDayjs(value)) {
            processedContent[key] = value.format('YYYY-MM-DD');
          }
        }
      });
      
      // 수정 모드와 생성 모드에 따라 다른 데이터 구조 사용
      const saveData = editId ? {
        // UpdateDraftDto - categoryId 제외
        title,
        content: {
          ...processedContent,
          __approvalRoute: approvalRoute // 결재선 정보를 content에 저장
        },
        description,
        attachmentIds: fileList.map(file => file.response?.id).filter(Boolean),
      } : {
        // CreateDraftRequest - categoryId 포함
        categoryId: selectedCategoryId,
        title,
        content: {
          ...processedContent,
          __approvalRoute: approvalRoute // 결재선 정보를 content에 저장
        },
        description,
        attachmentIds: fileList.map(file => file.response?.id).filter(Boolean),
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
        //   message.error('결재자를 설정해주세요');
        //   return;
        // }
        await submitMutation.mutateAsync(result.id);
      }
    } catch (error) {
      console.error('Save error:', error);
      message.error('저장 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    // 카테고리 변경 시 폼 초기화 (제목 제외)
    const currentTitle = form.getFieldValue('title');
    form.resetFields();
    form.setFieldValue('title', currentTitle);
    setFormData({});
    
    // 선택된 카테고리의 템플릿을 설명 필드에 적용
    const category = categories?.find(cat => cat.id === categoryId);
    if (category?.template_content) {
      setDescription(category.template_content);
    }
  };

  const handleReferenceDocumentSelect = (document: ApprovalDraft) => {
    // 참조 문서 설정 (오른쪽 패널에 표시용)
    setReferenceDocument(document);
    
    setReferenceModalOpen(false);
    message.success('참조 문서가 연결되었습니다. 오른쪽 패널에서 참조하여 작성해주세요.');
  };
  
  const handleRemoveReference = () => {
    setReferenceDocument(null);
    message.success('참조 문서 연결이 해제되었습니다.');
  };
  
  const handleViewReferenceDocument = (document: ApprovalDraft) => {
    // 참조 문서 상세 보기 (새 탭에서 열기)
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
        <div>문서를 찾을 수 없습니다.</div>
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
            돌아가기
          </Button>
          <Title level={2} className="!mb-0">
            {editId ? '결재 문서 수정' : '새 결재 작성'}
          </Title>
        </div>
      </div>

      {/* 결재 라인 상단 표시 */}
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
          <Card title="결재 문서 작성">
            <Form
              form={form}
              layout="vertical"
              onFinish={() => handleSave(false)}
            >
              {/* 결재 양식 선택 */}
              <Form.Item
                label="결재 양식"
                required
              >
                <Select
                  placeholder="결재 양식을 선택하세요"
                  value={selectedCategoryId || undefined}
                  onChange={handleCategoryChange}
                  size="large"
                  disabled={!!editId} // 편집 모드에서는 카테고리 변경 불가
                >
                  {categories?.map(category => (
                    <Select.Option key={category.id} value={category.id}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* 결재 라인 설정 - 양식 선택 바로 아래 */}
              {selectedCategoryId && (
                <Form.Item
                  label="결재 라인 설정"
                  extra="결재 과정에 참여할 사람들을 지정하세요"
                >
                  <Button
                    type={approvalRoute ? "default" : "primary"}
                    icon={<SendOutlined />}
                    onClick={() => setApprovalRouteOpen(true)}
                    block
                    size="large"
                  >
                    {approvalRoute ? '결재 라인 수정' : '결재 라인 설정'}
                  </Button>
                </Form.Item>
              )}

              {selectedCategory && (
                <>
                  <Divider />
                  
                  {/* 제목 */}
                  <Form.Item
                    name="title"
                    label="제목"
                    rules={[
                      { required: true, message: '제목을 입력해주세요' },
                      { max: 100, message: '제목은 100자 이하로 입력해주세요' },
                    ]}
                  >
                    <Input 
                      placeholder="결재 문서의 제목을 입력하세요"
                      size="large"
                    />
                  </Form.Item>

                  {/* 동적 폼 필드 렌더링 */}
                  {dynamicFields?.map((field: any) => 
                    renderFormField(field)
                  )}

                  {/* 문서 내용 */}
                  <Form.Item
                    label="문서 내용"
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
                      placeholder="선택한 양식의 내용을 수정하거나 새로운 내용을 입력하세요"
                    />
                  </Form.Item>


                  {/* 첨부파일 */}
                  <Form.Item label="첨부파일">
                    <Upload
                      fileList={fileList}
                      onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                      beforeUpload={() => false} // 자동 업로드 방지
                      multiple
                    >
                      <Button icon={<UploadOutlined />}>파일 선택</Button>
                    </Upload>
                    <Text type="secondary" className="mt-2 block">
                      최대 10MB, 10개 파일까지 첨부 가능합니다.
                    </Text>
                  </Form.Item>
                </>
              )}
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <div className="space-y-4">
            {/* 작업 액션 */}
            <Card title="작업">
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
                  임시저장
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
                  결재 요청
                </Button>
              </Space>
            </Card>
            
            {/* 참조 문서 - 오른쪽에 작게 표시 */}
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
                    참조 문서 선택
                  </Button>
                </div>
              </div>
            )}
            
            {/* 참조 문서 - 편집 모드에서도 표시 */}
            {editId && referenceDocument && (
              <ReferenceDocumentPreview
                referenceDocument={referenceDocument}
                onViewDocument={handleViewReferenceDocument}
              />
            )}

            {/* 결재 양식 정보 */}
            {selectedCategory && (
              <Card title="양식 정보">
                <div className="space-y-3">
                  <div>
                    <Text strong>양식명</Text>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-lg">{selectedCategory.icon || '📋'}</span>
                      <Text>{selectedCategory.name}</Text>
                    </div>
                  </div>
                  
                  {selectedCategory.description && (
                    <div>
                      <Text strong>설명</Text>
                      <div className="mt-1">
                        <Text type="secondary">{selectedCategory.description}</Text>
                      </div>
                    </div>
                  )}

                  <div>
                    <Text strong>템플릿 사용</Text>
                    <div className="mt-1">
                      <Text>문서 템플릿 자동 적용</Text>
                    </div>
                  </div>

                  <div>
                    <Text strong>결재선</Text>
                    <div className="mt-1">
                      {approvalRoute && approvalRoute.steps.length > 0 ? (
                        <div className="space-y-2 text-sm">
                          {approvalRoute.steps.filter((step: any) => step.type === 'COOPERATION').length > 0 && (
                            <div>
                              <span className="font-medium text-orange-600">협조:</span>{' '}
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
                              <span className="font-medium text-green-600">결재:</span>{' '}
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
                              <span className="font-medium text-blue-600">참조/수신/공람:</span>{' '}
                              {approvalRoute.steps.filter((step: any) => step.type === 'REFERENCE').map((step: any) => step.approverName).join(', ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Text type="secondary">결재선을 설정해주세요</Text>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* 도움말 */}
            <Alert
              message="작성 도움말"
              description={
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 임시저장하면 나중에 수정할 수 있습니다</li>
                  <li>• 결재 요청 후에는 수정이 불가능합니다</li>
                  <li>• 첨부파일은 PDF, 이미지, 문서 파일만 가능합니다</li>
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
          // ApprovalRoute 객체에서 steps만 추출하여 저장
          setApprovalRoute({ steps: route.steps });
          setApprovalRouteOpen(false);
          message.success('결재선 설정이 저장되었습니다.');
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