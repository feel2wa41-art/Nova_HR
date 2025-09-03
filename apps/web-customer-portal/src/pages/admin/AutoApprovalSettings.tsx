import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Table,
  Tag,
  Modal,
  Popconfirm,
  App,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AutoApprovalRule {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  user_ids?: string[]; // 특정 사용자들에게만 적용
  department_ids?: string[]; // 특정 부서에만 적용
  conditions: any;
  max_amount?: number;
  auto_approve_delay?: number; // 자동 승인까지 대기 시간 (분)
  bypass_approvers?: string[]; // 건너뛸 결재자들
  is_active: boolean;
  created_at: string;
}

interface AutoApprovalSettings {
  enabled: boolean;
  default_approver_id?: string;
  timeout_hours: number;
  notification_enabled: boolean;
}

export const AutoApprovalSettings = () => {
  const { message } = App.useApp();
  const [settings, setSettings] = useState<AutoApprovalSettings>({
    enabled: false,
    timeout_hours: 24,
    notification_enabled: true,
  });
  const [rules, setRules] = useState<AutoApprovalRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoApprovalRule | null>(null);
  const [form] = Form.useForm();

  // 임시 카테고리 데이터
  const [categories] = useState([
    { id: '1', name: '휴가 신청' },
    { id: '2', name: '출장 신청' },
    { id: '3', name: '교육 신청' },
  ]);

  // 임시 사용자 데이터
  const [users] = useState([
    { id: '1', name: '김팀장', title: '팀장' },
    { id: '2', name: '박부장', title: '부장' },
  ]);

  const columns: ColumnsType<AutoApprovalRule> = [
    {
      title: '규칙명',
      dataIndex: 'name',
      width: 200,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.category_name}
          </Text>
        </div>
      ),
    },
    {
      title: '적용 대상',
      key: 'targets',
      render: (_, record) => (
        <div className="space-y-1">
          {record.user_ids && record.user_ids.length > 0 && (
            <div>
              <Tag color="cyan">특정 사용자 {record.user_ids.length}명</Tag>
            </div>
          )}
          {record.department_ids && record.department_ids.length > 0 && (
            <div>
              <Tag color="purple">특정 부서 {record.department_ids.length}개</Tag>
            </div>
          )}
          {!record.user_ids?.length && !record.department_ids?.length && (
            <Tag>전체 적용</Tag>
          )}
        </div>
      ),
    },
    {
      title: '조건',
      dataIndex: 'conditions',
      render: (conditions, record) => (
        <div className="space-y-1">
          {conditions?.max_amount && (
            <Tag color="blue">금액 {conditions.max_amount.toLocaleString()}원 이하</Tag>
          )}
          {conditions?.user_level && (
            <Tag color="green">직급 {conditions.user_level} 이상</Tag>
          )}
          {conditions?.department && (
            <Tag color="orange">부서 {conditions.department}</Tag>
          )}
          {record.auto_approve_delay && (
            <Tag color="yellow">{record.auto_approve_delay}분 후 자동승인</Tag>
          )}
        </div>
      ),
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
            onClick={() => handleEditRule(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDeleteRule(record.id)}
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

  const fetchSettings = async () => {
    try {
      // TODO: API 호출
      // const response = await api.get('/approval/auto-approval-settings');
      // setSettings(response.data);
      
      // 임시 데이터
      setSettings({
        enabled: true,
        default_approver_id: '1',
        timeout_hours: 24,
        notification_enabled: true,
      });
    } catch (error) {
      message.error('설정을 불러오는데 실패했습니다.');
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      // TODO: API 호출
      // const response = await api.get('/approval/auto-approval-rules');
      // setRules(response.data);
      
      // 임시 데이터
      setRules([
        {
          id: '1',
          name: '소액 교육비 자동승인',
          category_id: '3',
          category_name: '교육 신청',
          conditions: { max_amount: 100000 },
          user_ids: ['1', '2'], // 특정 사용자만
          auto_approve_delay: 30, // 30분 후 자동승인
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: '팀장급 휴가 자동승인',
          category_id: '1',
          category_name: '휴가 신청',
          conditions: { user_level: '팀장' },
          department_ids: ['hr', 'dev'], // HR팀과 개발팀만
          bypass_approvers: ['2'], // 박부장 건너뛰기
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: '소액 경비 전체 자동승인',
          category_id: '2',
          category_name: '출장 신청',
          conditions: { max_amount: 50000 },
          auto_approve_delay: 0, // 즉시 자동승인
          is_active: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      message.error('규칙 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (values: AutoApprovalSettings) => {
    try {
      // TODO: API 호출
      // await api.put('/approval/auto-approval-settings', values);
      setSettings(values);
      message.success('설정이 저장되었습니다.');
    } catch (error) {
      message.error('설정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditRule = (rule: AutoApprovalRule) => {
    setEditingRule(rule);
    form.setFieldsValue({
      name: rule.name,
      category_id: rule.category_id,
      user_ids: rule.user_ids,
      department_ids: rule.department_ids,
      max_amount: rule.conditions?.max_amount,
      user_level: rule.conditions?.user_level,
      auto_approve_delay: rule.auto_approve_delay,
      bypass_approvers: rule.bypass_approvers,
      is_active: rule.is_active,
    });
    setModalVisible(true);
  };

  const handleSubmitRule = async (values: any) => {
    try {
      const ruleData = {
        name: values.name,
        category_id: values.category_id,
        user_ids: values.user_ids || [],
        department_ids: values.department_ids || [],
        conditions: {
          ...(values.max_amount && { max_amount: values.max_amount }),
          ...(values.user_level && { user_level: values.user_level }),
        },
        auto_approve_delay: values.auto_approve_delay || 0,
        bypass_approvers: values.bypass_approvers || [],
        is_active: values.is_active ?? true,
      };

      if (editingRule) {
        // TODO: API 호출 - 수정
        // await api.put(`/approval/auto-approval-rules/${editingRule.id}`, ruleData);
        message.success('규칙이 수정되었습니다.');
      } else {
        // TODO: API 호출 - 생성
        // await api.post('/approval/auto-approval-rules', ruleData);
        message.success('규칙이 생성되었습니다.');
      }

      setModalVisible(false);
      fetchRules();
    } catch (error) {
      message.error('작업 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      // TODO: API 호출
      // await api.delete(`/approval/auto-approval-rules/${id}`);
      message.success('규칙이 삭제되었습니다.');
      fetchRules();
    } catch (error) {
      message.error('삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchRules();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">자동 승인 설정</h3>
        <p className="text-gray-600">조건에 맞는 결재 문서를 자동으로 승인하는 기능을 설정합니다.</p>
      </div>

      <Alert
        message="자동 승인 기능 안내"
        description="설정된 조건에 맞는 결재 문서는 자동으로 승인 처리됩니다. 신중하게 설정해주세요."
        type="info"
        showIcon
      />

      {/* 기본 설정 */}
      <Card title={<div className="flex items-center gap-2"><SettingOutlined />기본 설정</div>}>
        <Form
          layout="vertical"
          initialValues={settings}
          onFinish={handleSaveSettings}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="enabled"
              label="자동 승인 활성화"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="notification_enabled"
              label="알림 발송"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="default_approver_id"
              label="기본 승인자"
            >
              <Select
                placeholder="기본 승인자를 선택해주세요"
                options={users.map(user => ({
                  value: user.id,
                  label: `${user.name} (${user.title})`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="timeout_hours"
              label="승인 대기 시간 (시간)"
              rules={[{ required: true, message: '대기 시간을 입력해주세요' }]}
            >
              <InputNumber
                min={1}
                max={168}
                style={{ width: '100%' }}
                addonAfter="시간"
              />
            </Form.Item>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              설정 저장
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 자동 승인 규칙 */}
      <Card
        title="자동 승인 규칙"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddRule}
          >
            규칙 추가
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `총 ${total}개`,
          }}
        />
      </Card>

      {/* 규칙 추가/수정 모달 */}
      <Modal
        title={editingRule ? '규칙 수정' : '규칙 추가'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitRule}
        >
          <Form.Item
            name="name"
            label="규칙명"
            rules={[{ required: true, message: '규칙명을 입력해주세요' }]}
          >
            <Input placeholder="예: 소액 교육비 자동승인" />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="적용 카테고리"
            rules={[{ required: true, message: '카테고리를 선택해주세요' }]}
          >
            <Select
              placeholder="카테고리를 선택해주세요"
              options={categories.map(cat => ({
                value: cat.id,
                label: cat.name,
              }))}
            />
          </Form.Item>

          <Divider>적용 대상 설정</Divider>

          <Form.Item
            name="user_ids"
            label="특정 사용자 선택"
            tooltip="선택하지 않으면 모든 사용자에게 적용됩니다"
          >
            <Select
              mode="multiple"
              placeholder="자동 승인을 적용할 사용자를 선택하세요"
              options={users.map(user => ({
                value: user.id,
                label: `${user.name} (${user.title})`,
              }))}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="department_ids"
            label="특정 부서 선택"
            tooltip="선택하지 않으면 모든 부서에 적용됩니다"
          >
            <Select
              mode="multiple"
              placeholder="자동 승인을 적용할 부서를 선택하세요"
              options={[
                { value: 'hr', label: 'HR팀' },
                { value: 'dev', label: '개발팀' },
                { value: 'sales', label: '영업팀' },
                { value: 'finance', label: '재무팀' },
              ]}
              allowClear
            />
          </Form.Item>

          <Divider>승인 조건</Divider>

          <Form.Item
            name="max_amount"
            label="최대 금액 (원)"
            tooltip="이 금액 이하의 결재만 자동 승인됩니다"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="금액 조건이 있는 경우 입력"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="user_level"
            label="신청자 직급"
            tooltip="선택한 직급 이상만 자동 승인됩니다"
          >
            <Select
              placeholder="직급 조건이 있는 경우 선택"
              options={[
                { value: '사원', label: '사원' },
                { value: '대리', label: '대리' },
                { value: '과장', label: '과장' },
                { value: '팀장', label: '팀장' },
                { value: '부장', label: '부장' },
              ]}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="auto_approve_delay"
            label="자동 승인 대기 시간 (분)"
            tooltip="지정한 시간이 지난 후 자동 승인됩니다"
          >
            <InputNumber
              min={0}
              max={1440}
              style={{ width: '100%' }}
              placeholder="즉시 승인하려면 0을 입력"
              addonAfter="분"
            />
          </Form.Item>

          <Form.Item
            name="bypass_approvers"
            label="건너뛸 결재자"
            tooltip="선택한 결재자를 자동으로 승인 처리합니다"
          >
            <Select
              mode="multiple"
              placeholder="건너뛸 결재자를 선택하세요"
              options={users.map(user => ({
                value: user.id,
                label: `${user.name} (${user.title})`,
              }))}
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="활성화"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalVisible(false)}>
              취소
            </Button>
            <Button type="primary" htmlType="submit">
              {editingRule ? '수정' : '생성'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};