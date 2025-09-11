import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Space,
  Popconfirm,
  Tag,
  Typography,
  App,
  Alert,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { FormSchemaBuilder } from '../../components/approval/FormSchemaBuilder';

const { TextArea } = Input;
const { Text } = Typography;

interface Category {
  id: string;
  company_id?: string | null;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  template_content: string;
  form_schema?: any;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface CategoryFormData {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  templateContent: string;
  formSchema?: any;
  isActive: boolean;
  orderIndex: number;
}

export const CategoryManagement = () => {
  const { message } = App.useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [schemaBuilderVisible, setSchemaBuilderVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm<CategoryFormData>();
  const [currentFormSchema, setCurrentFormSchema] = useState<any>(null);

  // 기본 템플릿 내용
  const defaultTemplateContent = `
<h3>신청서</h3>
<p><strong>신청자:</strong> [신청자명]</p>
<p><strong>신청일:</strong> [신청일자]</p>
<p><strong>사유:</strong></p>
<p>[신청 사유를 입력해주세요]</p>
<br>
<p>위와 같이 신청드리오니 검토 후 승인해주시기 바랍니다.</p>
  `.trim();

  const columns: ColumnsType<Category> = [
    {
      title: '순서',
      dataIndex: 'order_index',
      width: 80,
      sorter: (a, b) => a.order_index - b.order_index,
    },
    {
      title: '양식명',
      dataIndex: 'name',
      render: (text, record) => (
        <div>
          <div className="flex items-center gap-2">
            <Text strong>{text}</Text>
            {!record.company_id && (
              <Tag color="blue">시스템</Tag>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.code}
          </Text>
        </div>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '폼 스키마',
      key: 'form_schema',
      width: 120,
      render: (_, record) => (
        <Tag color={record.form_schema ? 'green' : 'default'}>
          {record.form_schema ? '설정됨' : '미설정'}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'is_active',
      width: 120,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          checkedChildren="사용"
          unCheckedChildren="미사용"
          onChange={(checked) => handleToggleActive(record, checked)}
        />
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        const isSystemCategory = !record.company_id;
        
        return (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={isSystemCategory}
              title={isSystemCategory ? "시스템 카테고리는 수정할 수 없습니다" : "카테고리 수정"}
            >
              수정
            </Button>
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleEditFormSchema(record)}
              disabled={isSystemCategory}
              title={isSystemCategory ? "시스템 카테고리의 폼 스키마는 수정할 수 없습니다" : "폼 스키마 설정"}
            >
              폼 설정
            </Button>
            <Popconfirm
              title="정말 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record.id)}
              okText="삭제"
              cancelText="취소"
              disabled={isSystemCategory}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={isSystemCategory}
                title={isSystemCategory ? "시스템 카테고리는 삭제할 수 없습니다" : "카테고리 삭제"}
              >
                삭제
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/v1/approval/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('reko_hr_token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        throw new Error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('카테고리 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      orderIndex: categories.length + 1,
      templateContent: defaultTemplateContent,
    });
    setModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    if (!category.company_id) {
      message.warning('시스템 카테고리는 수정할 수 없습니다.');
      return;
    }
    
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      code: category.code,
      description: category.description,
      icon: category.icon,
      isActive: category.is_active,
      orderIndex: category.order_index,
      templateContent: category.template_content,
      formSchema: category.form_schema,
    });
    setModalVisible(true);
  };

  const handleEditFormSchema = (category: Category) => {
    if (!category.company_id) {
      message.warning('시스템 카테고리의 폼 스키마는 수정할 수 없습니다.');
      return;
    }
    
    setEditingCategory(category);
    setCurrentFormSchema(category.form_schema);
    setSchemaBuilderVisible(true);
  };

  const handleSubmit = async (values: CategoryFormData) => {
    try {
      const data = {
        name: values.name,
        code: values.code,
        description: values.description,
        icon: values.icon,
        templateContent: values.templateContent,
        formSchema: values.formSchema,
        isActive: values.isActive,
        orderIndex: values.orderIndex,
      };

      const token = localStorage.getItem('reko_hr_token');
      let response;

      if (editingCategory) {
        response = await fetch(`http://localhost:3000/api/v1/approval/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          message.success('카테고리가 수정되었습니다.');
        }
      } else {
        response = await fetch('http://localhost:3000/api/v1/approval/categories', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          message.success('카테고리가 생성되었습니다.');
        }
      }

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        
        if (response.status === 403) {
          message.warning('이 카테고리는 수정할 수 없습니다. 시스템 카테고리이거나 권한이 없습니다.');
        } else if (response.status === 400) {
          message.error('입력 데이터에 오류가 있습니다. 필수 항목을 확인해주세요.');
        } else if (response.status === 404) {
          message.error('카테고리를 찾을 수 없습니다.');
        } else {
          message.error('작업 중 오류가 발생했습니다.');
        }
        return;
      }

      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Error submitting category:', error);
      message.error('작업 중 오류가 발생했습니다.');
    }
  };

  const handleBatchToggleSystemForms = async (activate: boolean) => {
    const systemCategories = categories.filter(cat => !cat.company_id);
    
    if (systemCategories.length === 0) {
      message.info('시스템 양식이 없습니다.');
      return;
    }

    setLoading(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const category of systemCategories) {
        if (category.is_active === activate) continue; // 이미 같은 상태면 건너뛰기
        
        try {
          await handleToggleActive(category, activate);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        message.success(
          activate 
            ? `시스템 양식 ${successCount}개가 활성화되었습니다.`
            : `시스템 양식 ${successCount}개가 비활성화되었습니다.`
        );
      }
      
      if (errorCount > 0) {
        message.warning(`${errorCount}개 양식 처리 중 오류가 발생했습니다.`);
      }
    } catch (error) {
      console.error('Error in batch toggle:', error);
      message.error('일괄 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      fetchCategories(); // 최종 상태 새로고침
    }
  };

  const handleToggleActive = async (category: Category, checked: boolean) => {
    try {
      const token = localStorage.getItem('reko_hr_token');
      const response = await fetch(`http://localhost:3000/api/v1/approval/categories/${category.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: checked }),
      });

      if (!response.ok) {
        // API가 PATCH를 지원하지 않을 경우 PUT 사용
        const putResponse = await fetch(`http://localhost:3000/api/v1/approval/categories/${category.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: category.name,
            code: category.code,
            description: category.description,
            icon: category.icon,
            templateContent: category.template_content,
            formSchema: category.form_schema,
            isActive: checked,
            orderIndex: category.order_index,
          }),
        });

        if (!putResponse.ok) {
          throw new Error('Failed to update category status');
        }
      }

      // 로컬 상태 업데이트
      setCategories(prev => prev.map(cat => 
        cat.id === category.id ? { ...cat, is_active: checked } : cat
      ));

      message.success(checked ? 
        `${category.name} 양식이 활성화되었습니다.` : 
        `${category.name} 양식이 비활성화되었습니다.`
      );
    } catch (error) {
      console.error('Error toggling category status:', error);
      message.error('상태 변경 중 오류가 발생했습니다.');
      // 실패 시 원래 상태로 되돌리기
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    // Find the category to check if it's a system category
    const category = categories.find(cat => cat.id === id);
    if (category && !category.company_id) {
      message.warning('시스템 카테고리는 삭제할 수 없습니다.');
      return;
    }
    
    try {
      const token = localStorage.getItem('reko_hr_token');
      const response = await fetch(`http://localhost:3000/api/v1/approval/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Delete API Error:', response.status, errorData);
        
        if (response.status === 403) {
          message.warning('이 카테고리는 삭제할 수 없습니다.');
        } else {
          throw new Error(`Delete request failed: ${response.status} - ${errorData}`);
        }
        return;
      }
      
      message.success('카테고리가 삭제되었습니다.');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      message.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSetupDefaults = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('reko_hr_token');
      const response = await fetch('http://localhost:3000/api/v1/approval/categories/setup-defaults', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        message.success(`기본 양식이 설정되었습니다. (생성: ${result.summary?.created || 0}개, 기존: ${result.summary?.existing || 0}개)`);
        fetchCategories();
      } else {
        throw new Error('Setup defaults failed');
      }
    } catch (error) {
      console.error('Error setting up defaults:', error);
      message.error('기본 양식 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFormSchema = async (schema: any) => {
    if (!editingCategory) return;

    try {
      const token = localStorage.getItem('reko_hr_token');
      const response = await fetch(`http://localhost:3000/api/v1/approval/categories/${editingCategory.id}/form-schema`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formSchema: schema }),
      });

      if (!response.ok) {
        throw new Error('Failed to save form schema');
      }

      message.success('폼 스키마가 저장되었습니다.');
      setSchemaBuilderVisible(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error saving form schema:', error);
      message.error('폼 스키마 저장 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">결재 양식 관리</h3>
            <p className="text-gray-600">전자결재에서 사용할 양식을 관리합니다. 양식에는 동적 폼과 문서 템플릿이 포함됩니다.</p>
          </div>
          <Space>
            <Button
              onClick={handleSetupDefaults}
              disabled={loading}
              loading={loading}
            >
              기본 양식 설정
            </Button>
            <Button
              onClick={() => handleBatchToggleSystemForms(true)}
              disabled={loading}
            >
              시스템 양식 모두 활성화
            </Button>
            <Button
              onClick={() => handleBatchToggleSystemForms(false)}
              disabled={loading}
            >
              시스템 양식 모두 비활성화
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              양식 추가
            </Button>
          </Space>
        </div>

        {categories.length === 0 && !loading && (
          <Alert
            message="아직 등록된 결재 양식이 없습니다"
            description="'기본 양식 설정' 버튼을 클릭하여 휴가신청, 출장신청 등의 기본 양식을 자동으로 생성할 수 있습니다."
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={handleSetupDefaults}>
                기본 양식 설정
              </Button>
            }
          />
        )}

        {categories.length > 0 && (
          <Alert
            message="양식 관리 안내"
            description={
              <div>
                <p>• <Tag color="blue">시스템</Tag> 태그가 있는 양식은 시스템에서 기본 제공하는 양식으로 수정 및 삭제할 수 없습니다.</p>
                <p>• 시스템 양식은 사용/미사용 설정을 통해 활성화 여부를 관리할 수 있습니다.</p>
                <p>• 회사별 맞춤 양식을 추가하려면 '양식 추가' 버튼을 사용하세요.</p>
              </div>
            }
            type="info"
            showIcon
            closable
            className="mb-4"
          />
        )}
      </div>

      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `총 ${total}개`,
        }}
      />

      <Modal
        title={editingCategory ? '양식 수정' : '양식 추가'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="양식명"
            rules={[{ required: true, message: '양식명을 입력해주세요' }]}
          >
            <Input placeholder="예: 휴가 신청" />
          </Form.Item>

          <Form.Item
            name="code"
            label="코드"
            rules={[{ required: true, message: '코드를 입력해주세요' }]}
            help={
              <div className="text-sm text-gray-600 mt-1">
                <p>• 시스템 연동용 고유 코드를 입력하세요 (영문 대문자, 숫자, 언더스코어 사용)</p>
                <p>• 각 양식마다 고유한 코드를 사용하여 구분합니다</p>
                <p>• <strong>예시:</strong> LEAVE_REQUEST (휴가신청), OVERTIME_REQUEST (추가근무신청)</p>
              </div>
            }
          >
            <Input placeholder="예: LEAVE_REQUEST" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
          >
            <Input placeholder="양식에 대한 설명을 입력해주세요" />
          </Form.Item>

          <Form.Item
            name="icon"
            label="아이콘"
          >
            <Input placeholder="예: calendar" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="orderIndex"
              label="표시 순서"
              rules={[{ required: true, message: '순서를 입력해주세요' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="활성화"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item
            name="templateContent"
            label="문서 템플릿"
            rules={[{ required: true, message: '문서 템플릿을 입력해주세요' }]}
          >
            <ReactQuill
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
              placeholder="결재 문서 템플릿을 작성하세요. [신청자명], [신청일자] 등의 변수를 사용할 수 있습니다."
            />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalVisible(false)}>
              취소
            </Button>
            <Button type="primary" htmlType="submit">
              {editingCategory ? '수정' : '생성'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 폼 스키마 빌더 모달 */}
      <Modal
        title={`폼 스키마 설정 - ${editingCategory?.name}`}
        open={schemaBuilderVisible}
        onCancel={() => {
          setSchemaBuilderVisible(false);
          setEditingCategory(null);
          setCurrentFormSchema(null);
        }}
        width={1000}
        footer={[
          <Button key="cancel" onClick={() => {
            setSchemaBuilderVisible(false);
            setEditingCategory(null);
            setCurrentFormSchema(null);
          }}>
            취소
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            onClick={() => handleSaveFormSchema(currentFormSchema)}
          >
            저장
          </Button>,
        ]}
      >
        <FormSchemaBuilder
          initialSchema={editingCategory?.form_schema}
          onSchemaChange={setCurrentFormSchema}
        />
      </Modal>
    </div>
  );
};