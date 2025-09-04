import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  Tag,
  Typography,
  Card,
  List,
  Avatar,
  App,
  Switch,
  Divider,
  Row,
  Col,
  Steps,
  Tooltip,
  Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalApi, userApi } from '../../lib/api';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Step } = Steps;

interface RouteTemplate {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  category?: {
    id: string;
    name: string;
  };
  stages: RouteStage[];
}

interface RouteStage {
  id: string;
  stage_type: 'AGREEMENT' | 'APPROVAL' | 'REFERENCE';
  name: string;
  order_index: number;
  mode: 'ALL' | 'ANY' | 'SEQUENTIAL';
  approvers: Approver[];
}

interface Approver {
  id: string;
  user_id: string;
  order_index: number;
  is_required: boolean;
  user?: {
    id: string;
    name: string;
    title?: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  title?: string;
  role: string;
}

export const RouteTemplateManagement = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RouteTemplate | null>(null);
  const [form] = Form.useForm();
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [currentStage, setCurrentStage] = useState(0);
  const [stages, setStages] = useState<Omit<RouteStage, 'id'>[]>([]);

  // Fetch route templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['adminApprovalTemplates'],
    queryFn: () => approvalApi.getAdminApprovalTemplates(),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['approvalCategories'],
    queryFn: () => approvalApi.getCategories(),
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(),
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => approvalApi.createRouteTemplate(data),
    onSuccess: () => {
      message.success('Approval route template has been created.');
      queryClient.invalidateQueries({ queryKey: ['adminApprovalTemplates'] });
      handleCancel();
    },
    onError: () => {
      message.error('Failed to create template.');
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      approvalApi.updateRouteTemplate(id, data),
    onSuccess: () => {
      message.success('Approval route template has been updated.');
      queryClient.invalidateQueries({ queryKey: ['adminApprovalTemplates'] });
      handleCancel();
    },
    onError: () => {
      message.error('Failed to update template.');
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => approvalApi.deleteRouteTemplate(id),
    onSuccess: () => {
      message.success('Approval route template has been deleted.');
      queryClient.invalidateQueries({ queryKey: ['adminApprovalTemplates'] });
    },
    onError: () => {
      message.error('Failed to delete template.');
    },
  });

  const getStageColor = (type: string) => {
    switch (type) {
      case 'AGREEMENT': return 'blue';
      case 'APPROVAL': return 'green';
      case 'REFERENCE': return 'orange';
      default: return 'default';
    }
  };

  const getStageTypeName = (type: string) => {
    switch (type) {
      case 'AGREEMENT': return 'Agreement';
      case 'APPROVAL': return 'Approval';
      case 'REFERENCE': return 'Reference';
      default: return type;
    }
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setStages([]);
    setSelectedUsers([]);
    setCurrentStage(0);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (template: RouteTemplate) => {
    setEditingTemplate(template);
    setStages(template.stages.map(stage => ({
      stage_type: stage.stage_type,
      name: stage.name,
      order_index: stage.order_index,
      mode: stage.mode,
      approvers: stage.approvers,
    })));
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      category_id: template.category_id,
      is_default: template.is_default,
      is_active: template.is_active,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    deleteTemplateMutation.mutate(id);
  };

  const handleCancel = () => {
    setModalVisible(false);
    setEditingTemplate(null);
    setStages([]);
    setSelectedUsers([]);
    setCurrentStage(0);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const templateData = {
        name: values.name,
        description: values.description,
        category_id: values.category_id,
        is_default: values.is_default || false,
        is_active: values.is_active !== false,
        stages: stages.map((stage, index) => ({
          stage_type: stage.stage_type,
          name: stage.name || getStageTypeName(stage.stage_type),
          order_index: index,
          mode: stage.mode || 'ALL',
          approvers: stage.approvers.map((approver, approverIndex) => ({
            user_id: approver.user_id,
            order_index: approverIndex,
            is_required: approver.is_required !== false,
          })),
        })),
      };

      if (editingTemplate) {
        updateTemplateMutation.mutate({ 
          id: editingTemplate.id, 
          data: templateData 
        });
      } else {
        createTemplateMutation.mutate(templateData);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const addStage = () => {
    const newStage: Omit<RouteStage, 'id'> = {
      stage_type: 'APPROVAL',
      name: `Approval Stage ${stages.length + 1}`,
      order_index: stages.length,
      mode: 'ALL',
      approvers: [],
    };
    setStages([...stages, newStage]);
    setCurrentStage(stages.length);
  };

  const updateStage = (index: number, updates: Partial<Omit<RouteStage, 'id'>>) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], ...updates };
    setStages(newStages);
  };

  const removeStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages.map((stage, i) => ({ ...stage, order_index: i })));
    if (currentStage >= newStages.length && newStages.length > 0) {
      setCurrentStage(newStages.length - 1);
    }
  };

  const addApproverToStage = (stageIndex: number, user: User) => {
    const newStages = [...stages];
    const approver: Approver = {
      id: `temp_${Date.now()}_${user.id}`, // Temporary ID for new approvers
      user_id: user.id,
      order_index: newStages[stageIndex].approvers.length,
      is_required: true,
      user: user,
    };
    newStages[stageIndex].approvers.push(approver);
    setStages(newStages);
  };

  const removeApproverFromStage = (stageIndex: number, approverIndex: number) => {
    const newStages = [...stages];
    newStages[stageIndex].approvers = newStages[stageIndex].approvers
      .filter((_, i) => i !== approverIndex)
      .map((approver, i) => ({ ...approver, order_index: i }));
    setStages(newStages);
  };

  const columns: ColumnsType<RouteTemplate> = [
    {
      title: 'Template Name',
      dataIndex: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.is_default && <Tag color="green" style={{ marginLeft: 8 }}>Default</Tag>}
          {record.description && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.description}
              </Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 120,
      render: (category) => category ? (
        <Tag color="blue">{category.name}</Tag>
      ) : (
        <Tag>All</Tag>
      ),
    },
    {
      title: 'Approval Stages',
      dataIndex: 'stages',
      render: (stages: RouteStage[]) => (
        <div className="flex gap-1 flex-wrap">
          {stages?.map((stage, index) => (
            <Tag key={stage.id} color={getStageColor(stage.stage_type)}>
              {index + 1}. {getStageTypeName(stage.stage_type)} ({stage.approvers?.length || 0} people)
            </Tag>
          )) || []}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
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
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this?"
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Title level={4}>Approval Route Template Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Template
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        loading={isLoading}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / Total ${total} items`,
        }}
      />

      <Modal
        title={editingTemplate ? 'Edit Approval Route Template' : 'Add Approval Route Template'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit}
            loading={createTemplateMutation.isPending || updateTemplateMutation.isPending}
          >
            {editingTemplate ? 'Update' : 'Create'}
          </Button>,
        ]}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Template Name"
                name="name"
                rules={[{ required: true, message: 'Please enter template name' }]}
              >
                <Input placeholder="e.g. Default Approval Route" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Category" name="category_id">
                <Select placeholder="Select category" allowClear>
                  {categories.map((category: any) => (
                    <Select.Option key={category.id} value={category.id}>
                      {category.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Description" name="description">
            <TextArea rows={2} placeholder="Enter template description" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Default Template" name="is_default" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Active" name="is_active" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Approval Stage Setup</Divider>

          <div className="mb-4">
            <Button type="dashed" onClick={addStage} icon={<PlusOutlined />}>
              Add Stage
            </Button>
          </div>

          {stages.length > 0 && (
            <Steps
              current={currentStage}
              onChange={setCurrentStage}
              direction="horizontal"
              size="small"
              className="mb-4"
            >
              {stages.map((stage, index) => (
                <Step
                  key={index}
                  title={`Stage ${index + 1}`}
                  description={getStageTypeName(stage.stage_type)}
                />
              ))}
            </Steps>
          )}

          {stages.length > 0 && (
            <Card title={`Stage ${currentStage + 1} Setup`} size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <div className="mb-2">
                    <Text strong>Stage Type</Text>
                  </div>
                  <Select
                    value={stages[currentStage]?.stage_type}
                    onChange={(value) => updateStage(currentStage, { stage_type: value })}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="AGREEMENT">Agreement</Select.Option>
                    <Select.Option value="APPROVAL">Approval</Select.Option>
                    <Select.Option value="REFERENCE">Reference</Select.Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <div className="mb-2">
                    <Text strong>Approval Mode</Text>
                  </div>
                  <Select
                    value={stages[currentStage]?.mode}
                    onChange={(value) => updateStage(currentStage, { mode: value })}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="ALL">All Approval</Select.Option>
                    <Select.Option value="ANY">Partial Approval</Select.Option>
                    <Select.Option value="SEQUENTIAL">Sequential Approval</Select.Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <div className="mb-2">
                    <Text strong>Actions</Text>
                  </div>
                  <Button
                    danger
                    onClick={() => removeStage(currentStage)}
                    disabled={stages.length <= 1}
                  >
                    Delete Stage
                  </Button>
                </Col>
              </Row>

              <Divider />

              <div className="mb-2">
                <Text strong>Approver List</Text>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Card title="Select Users" size="small">
                    <List
                      dataSource={users}
                      renderItem={(user: User) => (
                        <List.Item
                          actions={[
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => addApproverToStage(currentStage, user)}
                              disabled={stages[currentStage]?.approvers.some(
                                (a) => a.user_id === user.id
                              )}
                            >
                              Add
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<Avatar icon={<UserOutlined />} />}
                            title={user.name}
                            description={`${user.title || user.role} (${user.email})`}
                          />
                        </List.Item>
                      )}
                      style={{ maxHeight: 300, overflowY: 'auto' }}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="Selected Approvers" size="small">
                    {stages[currentStage]?.approvers.length > 0 ? (
                      <List
                        dataSource={stages[currentStage].approvers}
                        renderItem={(approver, index) => (
                          <List.Item
                            actions={[
                              <Button
                                danger
                                size="small"
                                onClick={() => removeApproverFromStage(currentStage, index)}
                              >
                                Remove
                              </Button>,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={<Avatar icon={<UserOutlined />} />}
                              title={approver.user?.name}
                              description={`${approver.user?.title || ''} (${approver.user?.email})`}
                            />
                          </List.Item>
                        )}
                        style={{ maxHeight: 300, overflowY: 'auto' }}
                      />
                    ) : (
                      <Empty description="Please select approvers" />
                    )}
                  </Card>
                </Col>
              </Row>
            </Card>
          )}
        </Form>
      </Modal>
    </div>
  );
};