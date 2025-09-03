import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Space,
  Tag,
  Typography,
  Divider,
  Alert,
  Popconfirm,
  App,
  Tabs,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SettingOutlined,
  CalendarOutlined,
  UserOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  is_annual_leave: boolean; // 연차 여부
  annual_days?: number; // 연간 지정 일수
  is_paid: boolean; // 유급/무급
  requires_approval: boolean; // 승인 필요 여부
  advance_notice_days: number; // 사전 신청 일수
  max_consecutive_days?: number; // 최대 연속 사용 일수
  deduct_from_annual?: boolean; // 연차에서 차감 여부 (병가 등)
  parent_leave_type_id?: string; // 상위 휴가 타입 (병가의 경우 연차 ID)
  sick_leave_options?: {
    deduct_from_annual: boolean;
    unpaid_option: boolean;
  };
  // 반차 관련 설정
  allow_half_day: boolean; // 반차 허용 여부
  half_day_options?: {
    morning_only: boolean; // 오전 반차만 허용
    afternoon_only: boolean; // 오후 반차만 허용
    both_allowed: boolean; // 오전/오후 모두 허용
    time_slots?: {
      morning_start: string; // 오전 시작 시간 (예: "09:00")
      morning_end: string;   // 오전 종료 시간 (예: "13:00")
      afternoon_start: string; // 오후 시작 시간 (예: "13:00")
      afternoon_end: string;   // 오후 종료 시간 (예: "18:00")
    };
  };
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface LeavePolicy {
  id: string;
  name: string;
  annual_leave_days: number; // 기본 연차 일수
  probation_leave_days: number; // 수습기간 연차 일수
  max_carryover_days: number; // 최대 이월 일수
  carryover_expire_months: number; // 이월 휴가 만료 개월
  is_active: boolean;
}

export const LeaveSettings = () => {
  const { message } = App.useApp();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [policyModalVisible, setPolicyModalVisible] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [form] = Form.useForm();
  const [policyForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('leave-types');

  // 색상 옵션
  const colorOptions = [
    { value: '#1890ff', label: '파란색', color: '#1890ff' },
    { value: '#52c41a', label: '초록색', color: '#52c41a' },
    { value: '#fa8c16', label: '주황색', color: '#fa8c16' },
    { value: '#eb2f96', label: '분홍색', color: '#eb2f96' },
    { value: '#722ed1', label: '보라색', color: '#722ed1' },
    { value: '#13c2c2', label: '청록색', color: '#13c2c2' },
    { value: '#faad14', label: '노란색', color: '#faad14' },
    { value: '#f5222d', label: '빨간색', color: '#f5222d' },
  ];

  const leaveTypeColumns: ColumnsType<LeaveType> = [
    {
      title: '순서',
      dataIndex: 'order_index',
      width: 80,
      sorter: (a, b) => a.order_index - b.order_index,
    },
    {
      title: '휴가 타입',
      dataIndex: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: record.color }}
          />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '타입',
      key: 'type',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.is_annual_leave && (
            <Tag color="blue">연차 ({record.annual_days}일)</Tag>
          )}
          {record.deduct_from_annual && (
            <Tag color="orange">연차 차감</Tag>
          )}
          <Tag color={record.is_paid ? 'green' : 'default'}>
            {record.is_paid ? '유급' : '무급'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '설정',
      key: 'settings',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.requires_approval && <Tag>승인필요</Tag>}
          {record.advance_notice_days > 0 && (
            <Tag>사전신청 {record.advance_notice_days}일</Tag>
          )}
          {record.max_consecutive_days && (
            <Tag>최대 {record.max_consecutive_days}일 연속</Tag>
          )}
          {record.allow_half_day && (
            <Tag color="purple">
              반차허용 
              {record.half_day_options?.morning_only && ' (오전만)'}
              {record.half_day_options?.afternoon_only && ' (오후만)'}
              {record.half_day_options?.both_allowed && ' (오전/오후)'}
            </Tag>
          )}
        </Space>
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
            onClick={() => handleEditLeaveType(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDeleteLeaveType(record.id)}
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

  const fetchLeaveTypes = async () => {
    setLoading(true);
    try {
      // TODO: API 호출
      // const response = await api.get('/leave/types');
      // setLeaveTypes(response.data);
      
      // 임시 데이터
      setLeaveTypes([
        {
          id: '1',
          name: '연차',
          code: 'ANNUAL_LEAVE',
          description: '연간 휴가',
          color: '#1890ff',
          is_annual_leave: true,
          annual_days: 15,
          is_paid: true,
          requires_approval: true,
          advance_notice_days: 1,
          max_consecutive_days: 10,
          allow_half_day: true,
          half_day_options: {
            morning_only: false,
            afternoon_only: false,
            both_allowed: true,
            time_slots: {
              morning_start: '09:00',
              morning_end: '13:00',
              afternoon_start: '13:00',
              afternoon_end: '18:00',
            },
          },
          is_active: true,
          order_index: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: '병가',
          code: 'SICK_LEAVE',
          description: '질병으로 인한 휴가',
          color: '#f5222d',
          is_annual_leave: false,
          is_paid: true,
          requires_approval: true,
          advance_notice_days: 0,
          deduct_from_annual: true,
          parent_leave_type_id: '1',
          sick_leave_options: {
            deduct_from_annual: true,
            unpaid_option: true,
          },
          allow_half_day: true,
          half_day_options: {
            morning_only: false,
            afternoon_only: false,
            both_allowed: true,
            time_slots: {
              morning_start: '09:00',
              morning_end: '13:00',
              afternoon_start: '13:00',
              afternoon_end: '18:00',
            },
          },
          is_active: true,
          order_index: 2,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: '경조사',
          code: 'FAMILY_EVENT',
          description: '경조사 휴가',
          color: '#722ed1',
          is_annual_leave: false,
          is_paid: true,
          requires_approval: true,
          advance_notice_days: 3,
          max_consecutive_days: 5,
          allow_half_day: false, // 경조사는 반차 불허
          is_active: true,
          order_index: 3,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      message.error('휴가 타입 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeavePolicies = async () => {
    try {
      // TODO: API 호출
      // const response = await api.get('/leave/policies');
      // setLeavePolicies(response.data);
      
      // 임시 데이터
      setLeavePolicies([
        {
          id: '1',
          name: '기본 휴가 정책',
          annual_leave_days: 15,
          probation_leave_days: 11,
          max_carryover_days: 5,
          carryover_expire_months: 12,
          is_active: true,
        },
      ]);
    } catch (error) {
      message.error('휴가 정책을 불러오는데 실패했습니다.');
    }
  };

  const handleAddLeaveType = () => {
    setEditingLeaveType(null);
    form.resetFields();
    form.setFieldsValue({
      is_active: true,
      order_index: leaveTypes.length + 1,
      color: '#1890ff',
      is_paid: true,
      requires_approval: true,
      advance_notice_days: 1,
      allow_half_day: false,
      half_day_morning_only: false,
      half_day_afternoon_only: false,
      half_day_both_allowed: false,
      half_day_morning_start: '09:00',
      half_day_morning_end: '13:00',
      half_day_afternoon_start: '13:00',
      half_day_afternoon_end: '18:00',
    });
    setModalVisible(true);
  };

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    form.setFieldsValue({
      name: leaveType.name,
      code: leaveType.code,
      description: leaveType.description,
      color: leaveType.color,
      is_annual_leave: leaveType.is_annual_leave,
      annual_days: leaveType.annual_days,
      is_paid: leaveType.is_paid,
      requires_approval: leaveType.requires_approval,
      advance_notice_days: leaveType.advance_notice_days,
      max_consecutive_days: leaveType.max_consecutive_days,
      deduct_from_annual: leaveType.deduct_from_annual,
      parent_leave_type_id: leaveType.parent_leave_type_id,
      sick_leave_deduct_from_annual: leaveType.sick_leave_options?.deduct_from_annual,
      sick_leave_unpaid_option: leaveType.sick_leave_options?.unpaid_option,
      // 반차 관련 필드
      allow_half_day: leaveType.allow_half_day,
      half_day_morning_only: leaveType.half_day_options?.morning_only,
      half_day_afternoon_only: leaveType.half_day_options?.afternoon_only,
      half_day_both_allowed: leaveType.half_day_options?.both_allowed,
      half_day_morning_start: leaveType.half_day_options?.time_slots?.morning_start,
      half_day_morning_end: leaveType.half_day_options?.time_slots?.morning_end,
      half_day_afternoon_start: leaveType.half_day_options?.time_slots?.afternoon_start,
      half_day_afternoon_end: leaveType.half_day_options?.time_slots?.afternoon_end,
      is_active: leaveType.is_active,
      order_index: leaveType.order_index,
    });
    setModalVisible(true);
  };

  const handleSubmitLeaveType = async (values: any) => {
    try {
      const leaveTypeData = {
        name: values.name,
        code: values.code.toUpperCase(),
        description: values.description,
        color: values.color,
        is_annual_leave: values.is_annual_leave || false,
        annual_days: values.is_annual_leave ? values.annual_days : undefined,
        is_paid: values.is_paid,
        requires_approval: values.requires_approval,
        advance_notice_days: values.advance_notice_days || 0,
        max_consecutive_days: values.max_consecutive_days,
        deduct_from_annual: values.deduct_from_annual || false,
        parent_leave_type_id: values.parent_leave_type_id,
        sick_leave_options: (values.code === 'SICK_LEAVE' || values.deduct_from_annual) ? {
          deduct_from_annual: values.sick_leave_deduct_from_annual || false,
          unpaid_option: values.sick_leave_unpaid_option || false,
        } : undefined,
        // 반차 설정 데이터
        allow_half_day: values.allow_half_day || false,
        half_day_options: values.allow_half_day ? {
          morning_only: values.half_day_morning_only || false,
          afternoon_only: values.half_day_afternoon_only || false,
          both_allowed: values.half_day_both_allowed || false,
          time_slots: {
            morning_start: values.half_day_morning_start || '09:00',
            morning_end: values.half_day_morning_end || '13:00',
            afternoon_start: values.half_day_afternoon_start || '13:00',
            afternoon_end: values.half_day_afternoon_end || '18:00',
          },
        } : undefined,
        is_active: values.is_active,
        order_index: values.order_index,
      };

      if (editingLeaveType) {
        // TODO: API 호출 - 수정
        // await api.put(`/leave/types/${editingLeaveType.id}`, leaveTypeData);
        message.success('휴가 타입이 수정되었습니다.');
      } else {
        // TODO: API 호출 - 생성
        // await api.post('/leave/types', leaveTypeData);
        message.success('휴가 타입이 생성되었습니다.');
      }

      setModalVisible(false);
      fetchLeaveTypes();
    } catch (error) {
      message.error('작업 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteLeaveType = async (id: string) => {
    try {
      // TODO: API 호출
      // await api.delete(`/leave/types/${id}`);
      message.success('휴가 타입이 삭제되었습니다.');
      fetchLeaveTypes();
    } catch (error) {
      message.error('삭제 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
    fetchLeavePolicies();
  }, []);

  // 연차 타입 목록 (병가 등의 상위 타입으로 사용)
  const annualLeaveTypes = leaveTypes.filter(lt => lt.is_annual_leave);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">휴가 설정</h3>
        <p className="text-gray-600">회사의 휴가 정책과 휴가 종류를 설정합니다.</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'leave-types',
            label: (
              <span>
                <CalendarOutlined />
                휴가 종류 관리
              </span>
            ),
            children: (
              <Card
                title="휴가 종류"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddLeaveType}
                  >
                    휴가 종류 추가
                  </Button>
                }
              >
                <Alert
                  message="휴가 종류 설정 안내"
                  description={
                    <div>
                      <p>• <strong>연차</strong>: 연간 지정 일수가 적용되는 기본 휴가입니다.</p>
                      <p>• <strong>병가</strong>: 연차에서 차감하거나 무급 처리할 수 있습니다.</p>
                      <p>• <strong>기타 휴가</strong>: 경조사, 공가 등 특별 휴가를 설정할 수 있습니다.</p>
                    </div>
                  }
                  type="info"
                  showIcon
                  className="mb-4"
                />

                <Table
                  columns={leaveTypeColumns}
                  dataSource={leaveTypes}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `총 ${total}개`,
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'leave-policy',
            label: (
              <span>
                <SettingOutlined />
                휴가 정책
              </span>
            ),
            children: (
              <Card title="휴가 정책 설정">
                <Alert
                  message="휴가 정책 안내"
                  description="직원의 연차 지급 및 이월 정책을 설정합니다."
                  type="info"
                  showIcon
                  className="mb-4"
                />
                
                {/* 휴가 정책 설정 폼 */}
                <Form
                  layout="vertical"
                  initialValues={leavePolicies[0]}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                      name="annual_leave_days"
                      label="기본 연차 일수"
                      rules={[{ required: true, message: '연차 일수를 입력해주세요' }]}
                    >
                      <InputNumber
                        min={0}
                        max={30}
                        addonAfter="일"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="probation_leave_days"
                      label="수습기간 연차 일수"
                      rules={[{ required: true, message: '수습기간 연차 일수를 입력해주세요' }]}
                    >
                      <InputNumber
                        min={0}
                        max={20}
                        addonAfter="일"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="max_carryover_days"
                      label="최대 이월 일수"
                    >
                      <InputNumber
                        min={0}
                        max={10}
                        addonAfter="일"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="carryover_expire_months"
                      label="이월 휴가 만료 기간"
                    >
                      <InputNumber
                        min={1}
                        max={24}
                        addonAfter="개월"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </div>

                  <Form.Item>
                    <Button type="primary" size="large">
                      정책 저장
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
        ]}
      />

      {/* 휴가 종류 추가/수정 모달 */}
      <Modal
        title={editingLeaveType ? '휴가 종류 수정' : '휴가 종류 추가'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitLeaveType}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="휴가 종류명"
              rules={[{ required: true, message: '휴가 종류명을 입력해주세요' }]}
            >
              <Input placeholder="예: 연차, 병가, 경조사" />
            </Form.Item>

            <Form.Item
              name="code"
              label="코드"
              rules={[{ required: true, message: '코드를 입력해주세요' }]}
            >
              <Input placeholder="예: ANNUAL_LEAVE" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="설명"
          >
            <TextArea rows={2} placeholder="휴가 종류에 대한 설명" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="color"
              label="색상"
              rules={[{ required: true, message: '색상을 선택해주세요' }]}
            >
              <Select placeholder="색상을 선택하세요">
                {colorOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: option.color }}
                      />
                      {option.label}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="order_index"
              label="표시 순서"
              rules={[{ required: true, message: '순서를 입력해주세요' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Divider>휴가 타입 설정</Divider>

          <Form.Item
            name="is_annual_leave"
            label="연차 여부"
            valuePropName="checked"
          >
            <Switch checkedChildren="연차" unCheckedChildren="기타" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.is_annual_leave !== currentValues.is_annual_leave
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('is_annual_leave') ? (
                <Form.Item
                  name="annual_days"
                  label="연간 지정 일수"
                  rules={[{ required: true, message: '연간 일수를 입력해주세요' }]}
                >
                  <InputNumber
                    min={1}
                    max={30}
                    addonAfter="일"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="is_paid"
              label="유급/무급"
              valuePropName="checked"
            >
              <Switch checkedChildren="유급" unCheckedChildren="무급" />
            </Form.Item>

            <Form.Item
              name="requires_approval"
              label="승인 필요"
              valuePropName="checked"
            >
              <Switch checkedChildren="필요" unCheckedChildren="불필요" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="advance_notice_days"
              label="사전 신청 일수"
            >
              <InputNumber
                min={0}
                max={30}
                addonAfter="일"
                style={{ width: '100%' }}
                placeholder="0은 당일 신청 가능"
              />
            </Form.Item>

            <Form.Item
              name="max_consecutive_days"
              label="최대 연속 사용 일수"
            >
              <InputNumber
                min={1}
                max={365}
                addonAfter="일"
                style={{ width: '100%' }}
                placeholder="제한 없으면 비워두세요"
              />
            </Form.Item>
          </div>

          <Divider>병가 등 특별 설정</Divider>

          <Form.Item
            name="deduct_from_annual"
            label="연차에서 차감"
            valuePropName="checked"
          >
            <Switch checkedChildren="차감" unCheckedChildren="별도" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.deduct_from_annual !== currentValues.deduct_from_annual
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('deduct_from_annual') ? (
                <div className="space-y-4">
                  <Form.Item
                    name="parent_leave_type_id"
                    label="차감할 연차 종류"
                    rules={[{ required: true, message: '연차 종류를 선택해주세요' }]}
                  >
                    <Select placeholder="연차 종류를 선택하세요">
                      {annualLeaveTypes.map(lt => (
                        <Option key={lt.id} value={lt.id}>
                          {lt.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                      name="sick_leave_deduct_from_annual"
                      label="연차 차감 기본 설정"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="차감" unCheckedChildren="선택" />
                    </Form.Item>

                    <Form.Item
                      name="sick_leave_unpaid_option"
                      label="무급 옵션 제공"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="제공" unCheckedChildren="미제공" />
                    </Form.Item>
                  </div>
                </div>
              ) : null
            }
          </Form.Item>

          <Divider>반차 설정</Divider>

          <Form.Item
            name="allow_half_day"
            label="반차 허용"
            valuePropName="checked"
          >
            <Switch checkedChildren="허용" unCheckedChildren="불허" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.allow_half_day !== currentValues.allow_half_day
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('allow_half_day') ? (
                <div className="space-y-4">
                  <Alert
                    message="반차 사용 옵션"
                    description="오전 반차(09:00-13:00), 오후 반차(13:00-18:00) 중 사용 가능한 옵션을 선택하세요. 반차 사용 시 0.5일로 계산됩니다."
                    type="info"
                    showIcon
                    className="mb-4"
                  />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <Form.Item
                      name="half_day_morning_only"
                      label="오전 반차만 허용"
                      valuePropName="checked"
                    >
                      <Switch size="small" />
                    </Form.Item>

                    <Form.Item
                      name="half_day_afternoon_only"
                      label="오후 반차만 허용"
                      valuePropName="checked"
                    >
                      <Switch size="small" />
                    </Form.Item>

                    <Form.Item
                      name="half_day_both_allowed"
                      label="오전/오후 모두 허용"
                      valuePropName="checked"
                    >
                      <Switch size="small" />
                    </Form.Item>
                  </div>

                  <div className="bg-gray-50 p-4 rounded">
                    <Text strong className="block mb-3">반차 시간 설정</Text>
                    <Alert
                      message="자동 설정 안내"
                      description="반차 시간은 사용자의 근무시간 설정에 따라 자동으로 적용됩니다. 오전 반차는 근무 시작시간부터 중간 시점까지, 오후 반차는 중간 시점부터 근무 종료시간까지로 설정됩니다."
                      type="info"
                      showIcon
                      className="mb-4"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Text className="block mb-2">오전 반차 시간</Text>
                        <div className="flex gap-2">
                          <Form.Item name="half_day_morning_start" className="mb-0" style={{ flex: 1 }}>
                            <Input placeholder="자동 설정 (근무시간 기준)" disabled />
                          </Form.Item>
                          <span className="self-center">~</span>
                          <Form.Item name="half_day_morning_end" className="mb-0" style={{ flex: 1 }}>
                            <Input placeholder="자동 설정 (근무시간 기준)" disabled />
                          </Form.Item>
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          * 사용자의 근무시간 설정에 따라 자동으로 적용됩니다
                        </Text>
                      </div>
                      
                      <div>
                        <Text className="block mb-2">오후 반차 시간</Text>
                        <div className="flex gap-2">
                          <Form.Item name="half_day_afternoon_start" className="mb-0" style={{ flex: 1 }}>
                            <Input placeholder="자동 설정 (근무시간 기준)" disabled />
                          </Form.Item>
                          <span className="self-center">~</span>
                          <Form.Item name="half_day_afternoon_end" className="mb-0" style={{ flex: 1 }}>
                            <Input placeholder="자동 설정 (근무시간 기준)" disabled />
                          </Form.Item>
                        </div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          * 사용자의 근무시간 설정에 따라 자동으로 적용됩니다
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="is_active"
            label="활성화"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalVisible(false)}>
              취소
            </Button>
            <Button type="primary" htmlType="submit">
              {editingLeaveType ? '수정' : '생성'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};