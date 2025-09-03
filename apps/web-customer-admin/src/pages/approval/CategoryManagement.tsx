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
  message,
  Popconfirm,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Text } = Typography;

interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  form_schema: any;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface CategoryFormData {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  formSchema: any;
  isActive: boolean;
  orderIndex: number;
}

export const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm<CategoryFormData>();

  // 기본 폼 스키마 템플릿
  const defaultFormSchema = {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        title: '사유',
        description: '신청 사유를 입력해주세요',
      },
    },
    required: ['reason'],
  };

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
          <Text strong>{text}</Text>
          <br />
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
      title: '상태',
      dataIndex: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // TODO: API 호출
      // const response = await api.get('/approval/categories');
      // setCategories(response.data);
      
      // 임시 데이터
      setCategories([
        {
          id: '1',
          name: '휴가 신청',
          code: 'LEAVE_REQUEST',
          description: '연차, 병가, 특별휴가 신청',
          is_active: true,
          order_index: 1,
          form_schema: defaultFormSchema,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: '출장 신청',
          code: 'BUSINESS_TRIP',
          description: '업무 출장 신청',
          is_active: true,
          order_index: 2,
          form_schema: defaultFormSchema,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
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
      formSchema: JSON.stringify(defaultFormSchema, null, 2),
    });
    setModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      code: category.code,
      description: category.description,
      icon: category.icon,
      isActive: category.is_active,
      orderIndex: category.order_index,
      formSchema: JSON.stringify(category.form_schema, null, 2),
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values: CategoryFormData) => {
    try {
      // let formSchema;
      try {
        JSON.parse(values.formSchema || '{}');
      } catch {
        message.error('폼 스키마가 올바른 JSON 형식이 아닙니다.');
        return;
      }

      // const data = {
      //   ...values,
      //   formSchema,
      // };

      if (editingCategory) {
        // TODO: API 호출 - 수정
        // await api.put(`/approval/categories/${editingCategory.id}`, data);
        message.success('카테고리가 수정되었습니다.');
      } else {
        // TODO: API 호출 - 생성
        // await api.post('/approval/categories', data);
        message.success('카테고리가 생성되었습니다.');
      }

      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      message.error('작업 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (_id: string) => {
    try {
      // TODO: API 호출
      // await api.delete(`/approval/categories/${id}`);
      message.success('카테고리가 삭제되었습니다.');
      fetchCategories();
    } catch (error) {
      message.error('삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">결재 양식 관리</h3>
          <p className="text-gray-600">전자결재에서 사용할 양식을 관리합니다.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          양식 추가
        </Button>
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
            name="formSchema"
            label="폼 스키마 (JSON)"
            rules={[{ required: true, message: '폼 스키마를 입력해주세요' }]}
          >
            <TextArea
              rows={10}
              placeholder="JSON Schema 형식으로 입력해주세요"
              style={{ fontFamily: 'monospace' }}
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
    </div>
  );
};