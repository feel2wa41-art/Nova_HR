import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber,
  Switch,
  Tag,
  Tabs,
  message,
  Popconfirm,
  Tooltip,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SettingOutlined,
  DollarOutlined,
  TeamOutlined,
  TagsOutlined
} from '@ant-design/icons';
import { api } from '../../lib/api';

const { TabPane } = Tabs;
const { Option } = Select;

interface CommonCodeCategory {
  id: string;
  category_code: string;
  category_name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  codes: CommonCode[];
}

interface CommonCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  parent_code_id?: string;
  extra_data?: any;
  is_active: boolean;
  sort_order: number;
  parent_code?: CommonCode;
  child_codes: CommonCode[];
}

interface ExpenseLimit {
  id: string;
  grade_code_id?: string;
  position_code_id?: string;
  expense_category: string;
  daily_limit?: number;
  monthly_limit?: number;
  yearly_limit?: number;
  currency: string;
  approval_required: boolean;
  auto_approval_limit?: number;
  is_active: boolean;
  grade_code?: {
    name: string;
    category: {
      category_name: string;
    };
  };
}

const CommonCodeManagement: React.FC = () => {
  const [categories, setCategories] = useState<CommonCodeCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CommonCodeCategory | null>(null);
  const [codes, setCodes] = useState<CommonCode[]>([]);
  const [expenseLimits, setExpenseLimits] = useState<ExpenseLimit[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CommonCodeCategory | null>(null);
  const [editingCode, setEditingCode] = useState<CommonCode | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseLimit | null>(null);

  const [categoryForm] = Form.useForm();
  const [codeForm] = Form.useForm();
  const [expenseForm] = Form.useForm();

  // Get company ID from localStorage or context
  const companyId = 'company-demo'; // TODO: Get from actual context

  useEffect(() => {
    fetchCategories();
    fetchExpenseLimits();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/common-codes/company/${companyId}/categories`);
      setCategories(response.data);
    } catch (error) {
      message.error('공통코드 카테고리 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCodes = async (categoryId: string) => {
    try {
      const response = await api.get(`/common-codes/categories/${categoryId}/codes`);
      setCodes(response.data);
    } catch (error) {
      message.error('공통코드 조회에 실패했습니다.');
    }
  };

  const fetchExpenseLimits = async () => {
    try {
      const response = await api.get(`/common-codes/company/${companyId}/expense-limits`);
      setExpenseLimits(response.data);
    } catch (error) {
      message.error('비용 한도 조회에 실패했습니다.');
    }
  };

  // Category CRUD
  const handleCreateCategory = async (values: any) => {
    try {
      await api.post(`/common-codes/company/${companyId}/categories`, values);
      message.success('카테고리가 생성되었습니다.');
      setCategoryModalVisible(false);
      categoryForm.resetFields();
      fetchCategories();
    } catch (error) {
      message.error('카테고리 생성에 실패했습니다.');
    }
  };

  const handleUpdateCategory = async (values: any) => {
    if (!editingCategory) return;
    try {
      await api.put(`/common-codes/categories/${editingCategory.id}`, values);
      message.success('카테고리가 수정되었습니다.');
      setCategoryModalVisible(false);
      categoryForm.resetFields();
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      message.error('카테고리 수정에 실패했습니다.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await api.delete(`/common-codes/categories/${categoryId}`);
      message.success('카테고리가 삭제되었습니다.');
      fetchCategories();
    } catch (error) {
      message.error('카테고리 삭제에 실패했습니다.');
    }
  };

  // Code CRUD
  const handleCreateCode = async (values: any) => {
    if (!selectedCategory) return;
    try {
      await api.post(`/common-codes/categories/${selectedCategory.id}/codes`, values);
      message.success('공통코드가 생성되었습니다.');
      setCodeModalVisible(false);
      codeForm.resetFields();
      fetchCodes(selectedCategory.id);
    } catch (error) {
      message.error('공통코드 생성에 실패했습니다.');
    }
  };

  const handleUpdateCode = async (values: any) => {
    if (!editingCode) return;
    try {
      await api.put(`/common-codes/codes/${editingCode.id}`, values);
      message.success('공통코드가 수정되었습니다.');
      setCodeModalVisible(false);
      codeForm.resetFields();
      setEditingCode(null);
      if (selectedCategory) {
        fetchCodes(selectedCategory.id);
      }
    } catch (error) {
      message.error('공통코드 수정에 실패했습니다.');
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    try {
      await api.delete(`/common-codes/codes/${codeId}`);
      message.success('공통코드가 삭제되었습니다.');
      if (selectedCategory) {
        fetchCodes(selectedCategory.id);
      }
    } catch (error) {
      message.error('공통코드 삭제에 실패했습니다.');
    }
  };

  // Expense Limit CRUD
  const handleCreateExpenseLimit = async (values: any) => {
    try {
      await api.post(`/common-codes/company/${companyId}/expense-limits`, values);
      message.success('비용 한도가 설정되었습니다.');
      setExpenseModalVisible(false);
      expenseForm.resetFields();
      fetchExpenseLimits();
    } catch (error) {
      message.error('비용 한도 설정에 실패했습니다.');
    }
  };

  const handleUpdateExpenseLimit = async (values: any) => {
    if (!editingExpense) return;
    try {
      await api.put(`/common-codes/expense-limits/${editingExpense.id}`, values);
      message.success('비용 한도가 수정되었습니다.');
      setExpenseModalVisible(false);
      expenseForm.resetFields();
      setEditingExpense(null);
      fetchExpenseLimits();
    } catch (error) {
      message.error('비용 한도 수정에 실패했습니다.');
    }
  };

  const handleDeleteExpenseLimit = async (limitId: string) => {
    try {
      await api.delete(`/common-codes/expense-limits/${limitId}`);
      message.success('비용 한도가 삭제되었습니다.');
      fetchExpenseLimits();
    } catch (error) {
      message.error('비용 한도 삭제에 실패했습니다.');
    }
  };

  // UI Handlers
  const openCategoryModal = (category?: CommonCodeCategory) => {
    if (category) {
      setEditingCategory(category);
      categoryForm.setFieldsValue(category);
    } else {
      setEditingCategory(null);
      categoryForm.resetFields();
    }
    setCategoryModalVisible(true);
  };

  const openCodeModal = (code?: CommonCode) => {
    if (code) {
      setEditingCode(code);
      codeForm.setFieldsValue(code);
    } else {
      setEditingCode(null);
      codeForm.resetFields();
    }
    setCodeModalVisible(true);
  };

  const openExpenseModal = (expense?: ExpenseLimit) => {
    if (expense) {
      setEditingExpense(expense);
      expenseForm.setFieldsValue(expense);
    } else {
      setEditingExpense(null);
      expenseForm.resetFields();
    }
    setExpenseModalVisible(true);
  };

  const onCategorySelect = (category: CommonCodeCategory) => {
    setSelectedCategory(category);
    fetchCodes(category.id);
  };

  // Table columns
  const categoryColumns = [
    {
      title: '카테고리 코드',
      dataIndex: 'category_code',
      key: 'category_code',
      render: (text: string, record: CommonCodeCategory) => (
        <Space>
          <Tag color={record.is_system ? 'blue' : 'green'}>{text}</Tag>
          {record.is_system && <Tag color="orange">시스템</Tag>}
        </Space>
      ),
    },
    {
      title: '카테고리 명',
      dataIndex: 'category_name',
      key: 'category_name',
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '코드 수',
      key: 'code_count',
      render: (record: CommonCodeCategory) => (
        <Tag color="blue">{record.codes?.length || 0}</Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '액션',
      key: 'action',
      render: (record: CommonCodeCategory) => (
        <Space>
          <Button
            type="link"
            icon={<TeamOutlined />}
            onClick={() => onCategorySelect(record)}
          >
            코드 관리
          </Button>
          {!record.is_system && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => openCategoryModal(record)}
              >
                수정
              </Button>
              <Popconfirm
                title="정말 삭제하시겠습니까?"
                onConfirm={() => handleDeleteCategory(record.id)}
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  삭제
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const codeColumns = [
    {
      title: '코드',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '코드명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '상위 코드',
      key: 'parent_code',
      render: (record: CommonCode) => (
        record.parent_code ? <Tag>{record.parent_code.name}</Tag> : '-'
      ),
    },
    {
      title: '하위 코드 수',
      key: 'child_count',
      render: (record: CommonCode) => (
        <Tag color="purple">{record.child_codes?.length || 0}</Tag>
      ),
    },
    {
      title: '정렬순서',
      dataIndex: 'sort_order',
      key: 'sort_order',
    },
    {
      title: '상태',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '액션',
      key: 'action',
      render: (record: CommonCode) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openCodeModal(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDeleteCode(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expenseColumns = [
    {
      title: '등급/직급',
      key: 'grade_position',
      render: (record: ExpenseLimit) => (
        record.grade_code ? 
          <Tag color="blue">{record.grade_code.name}</Tag> : 
          <Tag color="green">직급별</Tag>
      ),
    },
    {
      title: '비용 카테고리',
      dataIndex: 'expense_category',
      key: 'expense_category',
      render: (text: string) => <Tag color="orange">{text}</Tag>,
    },
    {
      title: '일일 한도',
      dataIndex: 'daily_limit',
      key: 'daily_limit',
      render: (amount: number, record: ExpenseLimit) => (
        amount ? `${amount.toLocaleString()} ${record.currency}` : '-'
      ),
    },
    {
      title: '월별 한도',
      dataIndex: 'monthly_limit',
      key: 'monthly_limit',
      render: (amount: number, record: ExpenseLimit) => (
        amount ? `${amount.toLocaleString()} ${record.currency}` : '-'
      ),
    },
    {
      title: '자동승인 한도',
      dataIndex: 'auto_approval_limit',
      key: 'auto_approval_limit',
      render: (amount: number, record: ExpenseLimit) => (
        amount ? `${amount.toLocaleString()} ${record.currency}` : '-'
      ),
    },
    {
      title: '승인 필요',
      dataIndex: 'approval_required',
      key: 'approval_required',
      render: (required: boolean) => (
        <Tag color={required ? 'red' : 'green'}>
          {required ? '필요' : '불필요'}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '액션',
      key: 'action',
      render: (record: ExpenseLimit) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openExpenseModal(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDeleteExpenseLimit(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <SettingOutlined />
                공통코드 관리
              </Space>
            }
            extra={
              <Tooltip title="시스템 공통코드는 직급, 등급, 부서, 비용항목 등을 관리합니다">
                <Button type="primary" icon={<PlusOutlined />}>
                  사용 가이드
                </Button>
              </Tooltip>
            }
          >
            <Tabs defaultActiveKey="categories">
              <TabPane 
                tab={
                  <Space>
                    <TagsOutlined />
                    카테고리 관리
                  </Space>
                } 
                key="categories"
              >
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openCategoryModal()}
                  >
                    카테고리 추가
                  </Button>
                </div>
                <Table
                  columns={categoryColumns}
                  dataSource={categories}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>

              <TabPane 
                tab={
                  <Space>
                    <TeamOutlined />
                    코드 관리
                  </Space>
                } 
                key="codes"
              >
                {selectedCategory ? (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <Space>
                        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                          {selectedCategory.category_name} ({selectedCategory.category_code})
                        </Tag>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => openCodeModal()}
                        >
                          코드 추가
                        </Button>
                      </Space>
                    </div>
                    <Table
                      columns={codeColumns}
                      dataSource={codes}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <p>카테고리를 선택하여 코드를 관리하세요.</p>
                  </div>
                )}
              </TabPane>

              <TabPane 
                tab={
                  <Space>
                    <DollarOutlined />
                    비용 한도 설정
                  </Space>
                } 
                key="expense-limits"
              >
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openExpenseModal()}
                  >
                    비용 한도 추가
                  </Button>
                </div>
                <Table
                  columns={expenseColumns}
                  dataSource={expenseLimits}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* Category Modal */}
      <Modal
        title={editingCategory ? '카테고리 수정' : '카테고리 추가'}
        open={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        footer={null}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={editingCategory ? handleUpdateCategory : handleCreateCategory}
        >
          <Form.Item
            name="category_code"
            label="카테고리 코드"
            rules={[{ required: true, message: '카테고리 코드를 입력하세요' }]}
          >
            <Input placeholder="POSITION, GRADE 등" disabled={editingCategory?.is_system} />
          </Form.Item>
          
          <Form.Item
            name="category_name"
            label="카테고리 명"
            rules={[{ required: true, message: '카테고리 명을 입력하세요' }]}
          >
            <Input placeholder="직급, 등급 등" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="설명"
          >
            <Input.TextArea placeholder="카테고리 설명" />
          </Form.Item>
          
          <Form.Item
            name="sort_order"
            label="정렬 순서"
          >
            <InputNumber min={0} placeholder="0" />
          </Form.Item>

          {editingCategory && (
            <Form.Item
              name="is_active"
              label="상태"
              valuePropName="checked"
            >
              <Switch checkedChildren="활성" unCheckedChildren="비활성" />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCategory ? '수정' : '생성'}
              </Button>
              <Button onClick={() => setCategoryModalVisible(false)}>
                취소
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Code Modal */}
      <Modal
        title={editingCode ? '코드 수정' : '코드 추가'}
        open={codeModalVisible}
        onCancel={() => setCodeModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={codeForm}
          layout="vertical"
          onFinish={editingCode ? handleUpdateCode : handleCreateCode}
        >
          <Form.Item
            name="code"
            label="코드"
            rules={[{ required: true, message: '코드를 입력하세요' }]}
          >
            <Input placeholder="MANAGER, CEO 등" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="코드명"
            rules={[{ required: true, message: '코드명을 입력하세요' }]}
          >
            <Input placeholder="부장, 대표이사 등" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="설명"
          >
            <Input.TextArea placeholder="코드 설명" />
          </Form.Item>

          <Form.Item
            name="parent_code_id"
            label="상위 코드"
          >
            <Select placeholder="상위 코드 선택" allowClear>
              {codes.map(code => (
                <Option key={code.id} value={code.id}>
                  {code.name} ({code.code})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="sort_order"
            label="정렬 순서"
          >
            <InputNumber min={0} placeholder="0" />
          </Form.Item>

          {editingCode && (
            <Form.Item
              name="is_active"
              label="상태"
              valuePropName="checked"
            >
              <Switch checkedChildren="활성" unCheckedChildren="비활성" />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingCode ? '수정' : '생성'}
              </Button>
              <Button onClick={() => setCodeModalVisible(false)}>
                취소
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Expense Limit Modal */}
      <Modal
        title={editingExpense ? '비용 한도 수정' : '비용 한도 추가'}
        open={expenseModalVisible}
        onCancel={() => setExpenseModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={expenseForm}
          layout="vertical"
          onFinish={editingExpense ? handleUpdateExpenseLimit : handleCreateExpenseLimit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="grade_code_id"
                label="등급 선택"
              >
                <Select placeholder="등급 선택" allowClear>
                  {categories
                    .find(cat => cat.category_code === 'GRADE')
                    ?.codes.map(code => (
                      <Option key={code.id} value={code.id}>
                        {code.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expense_category"
                label="비용 카테고리"
                rules={[{ required: true, message: '비용 카테고리를 입력하세요' }]}
              >
                <Select placeholder="비용 카테고리 선택">
                  <Option value="HOTEL">호텔비</Option>
                  <Option value="TRANSPORTATION">교통비</Option>
                  <Option value="MEAL">식비</Option>
                  <Option value="ENTERTAINMENT">접대비</Option>
                  <Option value="TRAINING">교육비</Option>
                  <Option value="OFFICE_SUPPLIES">사무용품비</Option>
                  <Option value="COMMUNICATION">통신비</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="daily_limit"
                label="일일 한도"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="monthly_limit"
                label="월별 한도"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="yearly_limit"
                label="연간 한도"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="currency"
                label="통화"
                initialValue="IDR"
              >
                <Select>
                  <Option value="IDR">IDR</Option>
                  <Option value="USD">USD</Option>
                  <Option value="EUR">EUR</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="auto_approval_limit"
                label="자동 승인 한도"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="approval_required"
                label="승인 필요"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="필요" unCheckedChildren="불필요" />
              </Form.Item>
            </Col>
          </Row>

          {editingExpense && (
            <Form.Item
              name="is_active"
              label="상태"
              valuePropName="checked"
            >
              <Switch checkedChildren="활성" unCheckedChildren="비활성" />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingExpense ? '수정' : '생성'}
              </Button>
              <Button onClick={() => setExpenseModalVisible(false)}>
                취소
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CommonCodeManagement;