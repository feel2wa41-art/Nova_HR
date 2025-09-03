import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Popconfirm,
  Tag,
  Typography,
  Card,
  List,
  Avatar,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Text } = Typography;

interface RouteTemplate {
  id: string;
  name: string;
  description?: string;
  stages: RouteStage[];
  is_active: boolean;
  created_at: string;
}

interface RouteStage {
  id: string;
  stage_type: 'AGREEMENT' | 'APPROVAL' | 'REFERENCE';
  name: string;
  order_index: number;
  approvers: Approver[];
}

interface Approver {
  id: string;
  user_id: string;
  user_name: string;
  user_title?: string;
  is_required: boolean;
}

interface RouteTemplateFormData {
  name: string;
  description?: string;
  stages: RouteStage[];
}

export const RouteTemplateManagement = () => {
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RouteTemplate | null>(null);
  const [form] = Form.useForm<RouteTemplateFormData>();

  // 임시 사용자 데이터
  const [users] = useState([
    { id: '1', name: '김팀장', title: '팀장' },
    { id: '2', name: '박부장', title: '부장' },
    { id: '3', name: '이과장', title: '과장' },
    { id: '4', name: '최대리', title: '대리' },
  ]);

  const columns: ColumnsType<RouteTemplate> = [
    {
      title: '템플릿명',
      dataIndex: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
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
      title: '결재 단계',
      dataIndex: 'stages',
      render: (stages: RouteStage[]) => (
        <div className="flex gap-1 flex-wrap">
          {stages.map((stage, index) => (
            <Tag key={stage.id} color={getStageColor(stage.stage_type)}>
              {index + 1}. {getStageTypeName(stage.stage_type)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '승인자 수',
      dataIndex: 'stages',
      width: 100,
      render: (stages: RouteStage[]) => {
        const totalApprovers = stages.reduce((sum, stage) => sum + stage.approvers.length, 0);
        return <Text>{totalApprovers}명</Text>;
      },
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

  const getStageColor = (stageType: string) => {
    switch (stageType) {
      case 'AGREEMENT': return 'blue';
      case 'APPROVAL': return 'green';
      case 'REFERENCE': return 'orange';
      default: return 'default';
    }
  };

  const getStageTypeName = (stageType: string) => {
    switch (stageType) {
      case 'AGREEMENT': return '합의';
      case 'APPROVAL': return '결재';
      case 'REFERENCE': return '참조';
      default: return stageType;
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // TODO: API 호출
      // const response = await api.get('/approval/route-templates');
      // setTemplates(response.data);
      
      // 임시 데이터
      setTemplates([
        {
          id: '1',
          name: '일반 결재선',
          description: '팀장 → 부장 승인',
          is_active: true,
          created_at: new Date().toISOString(),
          stages: [
            {
              id: '1',
              stage_type: 'APPROVAL',
              name: '팀장 승인',
              order_index: 1,
              approvers: [
                {
                  id: '1',
                  user_id: '1',
                  user_name: '김팀장',
                  user_title: '팀장',
                  is_required: true,
                },
              ],
            },
            {
              id: '2',
              stage_type: 'APPROVAL',
              name: '부장 승인',
              order_index: 2,
              approvers: [
                {
                  id: '2',
                  user_id: '2',
                  user_name: '박부장',
                  user_title: '부장',
                  is_required: true,
                },
              ],
            },
          ],
        },
      ]);
    } catch (error) {
      message.error('템플릿 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (template: RouteTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      stages: template.stages,
    });
    setModalVisible(true);
  };

  const handleSubmit = async (_values: RouteTemplateFormData) => {
    try {
      if (editingTemplate) {
        // TODO: API 호출 - 수정
        // await api.put(`/approval/route-templates/${editingTemplate.id}`, values);
        message.success('템플릿이 수정되었습니다.');
      } else {
        // TODO: API 호출 - 생성
        // await api.post('/approval/route-templates', values);
        message.success('템플릿이 생성되었습니다.');
      }

      setModalVisible(false);
      fetchTemplates();
    } catch (error) {
      message.error('작업 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (_id: string) => {
    try {
      // TODO: API 호출
      // await api.delete(`/approval/route-templates/${id}`);
      message.success('템플릿이 삭제되었습니다.');
      fetchTemplates();
    } catch (error) {
      message.error('삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">결재선 템플릿 관리</h3>
          <p className="text-gray-600">자주 사용하는 결재선을 템플릿으로 저장하여 관리합니다.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          템플릿 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `총 ${total}개`,
        }}
        expandable={{
          expandedRowRender: (record) => (
            <div className="p-4">
              <h4 className="mb-4">결재 단계 상세</h4>
              <div className="grid gap-4">
                {record.stages.map((stage, index) => (
                  <Card key={stage.id} size="small">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Tag color={getStageColor(stage.stage_type)}>
                          {index + 1}단계
                        </Tag>
                        <Text strong>{getStageTypeName(stage.stage_type)}</Text>
                        <Text type="secondary">- {stage.name}</Text>
                      </div>
                    </div>
                    <List
                      dataSource={stage.approvers}
                      renderItem={(approver) => (
                        <List.Item className="border-0 py-1">
                          <div className="flex items-center gap-2">
                            <Avatar size="small" icon={<UserOutlined />} />
                            <Text>{approver.user_name}</Text>
                            {approver.user_title && (
                              <Text type="secondary">({approver.user_title})</Text>
                            )}
                            {approver.is_required && (
                              <Tag color="red">필수</Tag>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </Card>
                ))}
              </div>
            </div>
          ),
        }}
      />

      <Modal
        title={editingTemplate ? '템플릿 수정' : '템플릿 추가'}
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
            label="템플릿명"
            rules={[{ required: true, message: '템플릿명을 입력해주세요' }]}
          >
            <Input placeholder="예: 일반 결재선" />
          </Form.Item>

          <Form.Item
            name="description"
            label="설명"
          >
            <TextArea rows={2} placeholder="템플릿에 대한 설명을 입력해주세요" />
          </Form.Item>

          <div className="bg-gray-50 p-4 rounded-lg">
            <Text strong>결재선 구성</Text>
            <p className="text-gray-600 text-sm mt-1 mb-4">
              결재 단계와 승인자를 설정해주세요. 복잡한 결재선 설정은 추후 구현 예정입니다.
            </p>
            
            <div className="space-y-4">
              <div className="p-3 bg-white rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Tag color="green">1단계</Tag>
                  <Text>팀장 승인</Text>
                </div>
                <Select
                  placeholder="승인자 선택"
                  style={{ width: '100%' }}
                  options={users.map(user => ({
                    value: user.id,
                    label: `${user.name} (${user.title})`,
                  }))}
                />
              </div>
              
              <div className="p-3 bg-white rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Tag color="green">2단계</Tag>
                  <Text>부장 승인</Text>
                </div>
                <Select
                  placeholder="승인자 선택"
                  style={{ width: '100%' }}
                  options={users.map(user => ({
                    value: user.id,
                    label: `${user.name} (${user.title})`,
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setModalVisible(false)}>
              취소
            </Button>
            <Button type="primary" htmlType="submit">
              {editingTemplate ? '수정' : '생성'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};