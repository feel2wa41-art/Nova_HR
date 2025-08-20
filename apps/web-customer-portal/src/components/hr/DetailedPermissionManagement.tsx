import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Space, message, Tag, Descriptions, Divider } from 'antd';
import { SettingOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  scope: PermissionScope;
  createdAt: string;
  updatedAt: string;
}

interface PermissionScope {
  type: 'GLOBAL' | 'DEPARTMENT' | 'TEAM' | 'SELF' | 'CUSTOM';
  conditions?: {
    departments?: string[];
    teams?: string[];
    roles?: string[];
    customRules?: string[];
  };
  restrictions?: {
    timeRestriction?: boolean;
    locationRestriction?: boolean;
    ipRestriction?: boolean;
    deviceRestriction?: boolean;
  };
  limits?: {
    maxActions?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
  };
}

export const DetailedPermissionManagement = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [viewingPermission, setViewingPermission] = useState<Permission | null>(null);
  const [form] = Form.useForm();

  // Mock categories
  const permissionCategories = [
    { value: 'ATTENDANCE', label: '출퇴근 관리' },
    { value: 'LEAVE', label: '휴가 관리' },
    { value: 'USER', label: '사용자 관리' },
    { value: 'ADMIN', label: '관리자 기능' },
    { value: 'APPROVAL', label: '결재 관리' },
    { value: 'REPORT', label: '리포트' },
    { value: 'SYSTEM', label: '시스템 관리' },
  ];

  // Mock scope types
  const scopeTypes = [
    { value: 'GLOBAL', label: '전체 권한' },
    { value: 'DEPARTMENT', label: '부서별 권한' },
    { value: 'TEAM', label: '팀별 권한' },
    { value: 'SELF', label: '본인만' },
    { value: 'CUSTOM', label: '사용자 정의' },
  ];

  // Mock departments and roles
  const departments = ['IT팀', 'HR팀', '개발팀', '디자인팀', '영업팀'];
  const roles = ['EMPLOYEE', 'HR_MANAGER', 'SUPER_ADMIN'];

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = () => {
    const stored = localStorage.getItem('nova_hr_detailed_permissions');
    if (stored) {
      setPermissions(JSON.parse(stored));
    } else {
      // Initialize with default permissions
      const defaultPermissions: Permission[] = [
        {
          id: 'view_own_attendance',
          name: 'view_own_attendance',
          displayName: '본인 출퇴근 조회',
          description: '본인의 출퇴근 기록을 조회할 수 있는 권한',
          category: 'ATTENDANCE',
          scope: {
            type: 'SELF',
            restrictions: {
              timeRestriction: false,
              locationRestriction: false,
            },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'view_all_attendance',
          name: 'view_all_attendance',
          displayName: '전체 출퇴근 조회',
          description: '모든 직원의 출퇴근 기록을 조회할 수 있는 권한',
          category: 'ATTENDANCE',
          scope: {
            type: 'DEPARTMENT',
            conditions: {
              departments: ['HR팀'],
              roles: ['HR_MANAGER', 'SUPER_ADMIN'],
            },
            restrictions: {
              timeRestriction: true,
              locationRestriction: true,
            },
            limits: {
              dailyLimit: 100,
            },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'manage_users',
          name: 'manage_users',
          displayName: '사용자 관리',
          description: '사용자 계정을 생성, 수정, 삭제할 수 있는 권한',
          category: 'USER',
          scope: {
            type: 'GLOBAL',
            conditions: {
              roles: ['HR_MANAGER', 'SUPER_ADMIN'],
            },
            restrictions: {
              timeRestriction: true,
              ipRestriction: true,
            },
            limits: {
              maxActions: 50,
              dailyLimit: 20,
            },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'system_admin',
          name: 'system_admin',
          displayName: '시스템 관리',
          description: '시스템 전체를 관리할 수 있는 최고 권한',
          category: 'SYSTEM',
          scope: {
            type: 'GLOBAL',
            conditions: {
              roles: ['SUPER_ADMIN'],
            },
            restrictions: {
              timeRestriction: true,
              locationRestriction: true,
              ipRestriction: true,
              deviceRestriction: true,
            },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setPermissions(defaultPermissions);
      localStorage.setItem('nova_hr_detailed_permissions', JSON.stringify(defaultPermissions));
    }
  };

  const savePermissions = (newPermissions: Permission[]) => {
    setPermissions(newPermissions);
    localStorage.setItem('nova_hr_detailed_permissions', JSON.stringify(newPermissions));
  };

  const handleEdit = (permission?: Permission) => {
    setEditingPermission(permission || null);
    if (permission) {
      form.setFieldsValue({
        ...permission,
        'scope.type': permission.scope.type,
        'scope.conditions.departments': permission.scope.conditions?.departments || [],
        'scope.conditions.roles': permission.scope.conditions?.roles || [],
        'scope.restrictions': permission.scope.restrictions || {},
        'scope.limits': permission.scope.limits || {},
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleView = (permission: Permission) => {
    setViewingPermission(permission);
    setViewModalOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      const permissionData: Permission = {
        id: values.name,
        name: values.name,
        displayName: values.displayName,
        description: values.description,
        category: values.category,
        scope: {
          type: values['scope.type'],
          conditions: {
            departments: values['scope.conditions.departments'] || [],
            roles: values['scope.conditions.roles'] || [],
          },
          restrictions: values['scope.restrictions'] || {},
          limits: values['scope.limits'] || {},
        },
        createdAt: editingPermission?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let updatedPermissions;
      if (editingPermission) {
        updatedPermissions = permissions.map(p => 
          p.id === editingPermission.id ? permissionData : p
        );
      } else {
        if (permissions.some(p => p.id === permissionData.id)) {
          message.error('이미 존재하는 권한 이름입니다.');
          return;
        }
        updatedPermissions = [...permissions, permissionData];
      }

      savePermissions(updatedPermissions);
      setIsModalOpen(false);
      setEditingPermission(null);
      form.resetFields();
      message.success('권한이 저장되었습니다.');
    } catch (error) {
      message.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = (permissionId: string) => {
    Modal.confirm({
      title: '권한 삭제',
      content: '이 권한을 삭제하시겠습니까? 이 권한을 사용하는 사용자들의 접근이 제한될 수 있습니다.',
      onOk: () => {
        const updatedPermissions = permissions.filter(p => p.id !== permissionId);
        savePermissions(updatedPermissions);
        message.success('권한이 삭제되었습니다.');
      },
    });
  };

  const getScopeDescription = (scope: PermissionScope) => {
    const scopeType = scopeTypes.find(s => s.value === scope.type)?.label || scope.type;
    let description = scopeType;
    
    if (scope.conditions?.departments?.length) {
      description += ` (부서: ${scope.conditions.departments.join(', ')})`;
    }
    if (scope.conditions?.roles?.length) {
      description += ` (역할: ${scope.conditions.roles.join(', ')})`;
    }
    
    return description;
  };

  const getRestrictionTags = (restrictions?: PermissionScope['restrictions']) => {
    if (!restrictions) return null;
    
    const tags = [];
    if (restrictions.timeRestriction) tags.push(<Tag key="time" color="orange">시간 제한</Tag>);
    if (restrictions.locationRestriction) tags.push(<Tag key="location" color="blue">위치 제한</Tag>);
    if (restrictions.ipRestriction) tags.push(<Tag key="ip" color="red">IP 제한</Tag>);
    if (restrictions.deviceRestriction) tags.push(<Tag key="device" color="purple">디바이스 제한</Tag>);
    
    return tags.length > 0 ? <Space wrap>{tags}</Space> : <Tag color="green">제한 없음</Tag>;
  };

  const columns: ColumnsType<Permission> = [
    {
      title: '권한명',
      key: 'permission',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.displayName}</div>
          <code className="text-xs bg-gray-100 px-1 rounded">{record.name}</code>
        </div>
      ),
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category) => {
        const cat = permissionCategories.find(c => c.value === category);
        return <Tag color="blue">{cat?.label || category}</Tag>;
      },
    },
    {
      title: '범위',
      key: 'scope',
      render: (_, record) => (
        <div>
          <div>{getScopeDescription(record.scope)}</div>
          <div className="mt-1">{getRestrictionTags(record.scope.restrictions)}</div>
        </div>
      ),
    },
    {
      title: '제한',
      key: 'limits',
      render: (_, record) => {
        const limits = record.scope.limits;
        if (!limits) return <Tag color="green">제한 없음</Tag>;
        
        const limitTags = [];
        if (limits.maxActions) limitTags.push(`최대 ${limits.maxActions}회`);
        if (limits.dailyLimit) limitTags.push(`일 ${limits.dailyLimit}회`);
        if (limits.monthlyLimit) limitTags.push(`월 ${limits.monthlyLimit}회`);
        
        return limitTags.length > 0 ? (
          <div className="text-sm text-gray-600">
            {limitTags.join(', ')}
          </div>
        ) : <Tag color="green">제한 없음</Tag>;
      },
    },
    {
      title: '액션',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            상세
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            편집
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <SettingOutlined />
            상세 권한 관리
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleEdit()}
          >
            권한 추가
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Edit Modal */}
      <Modal
        title={editingPermission ? "권한 편집" : "권한 추가"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            label="권한 이름 (시스템 내부용)"
            name="name"
            rules={[{ required: true, message: '권한 이름을 입력해주세요' }]}
          >
            <Input placeholder="예: manage_users" disabled={!!editingPermission} />
          </Form.Item>

          <Form.Item
            label="표시 이름"
            name="displayName"
            rules={[{ required: true, message: '표시 이름을 입력해주세요' }]}
          >
            <Input placeholder="예: 사용자 관리" />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
            rules={[{ required: true, message: '설명을 입력해주세요' }]}
          >
            <Input.TextArea rows={3} placeholder="이 권한의 기능과 용도를 설명해주세요" />
          </Form.Item>

          <Form.Item
            label="카테고리"
            name="category"
            rules={[{ required: true, message: '카테고리를 선택해주세요' }]}
          >
            <Select options={permissionCategories} />
          </Form.Item>

          <Divider>권한 범위 설정</Divider>

          <Form.Item
            label="범위 타입"
            name="scope.type"
            rules={[{ required: true, message: '범위 타입을 선택해주세요' }]}
          >
            <Select options={scopeTypes} />
          </Form.Item>

          <Form.Item
            label="적용 부서"
            name="scope.conditions.departments"
          >
            <Select
              mode="multiple"
              placeholder="적용할 부서를 선택하세요"
              options={departments.map(dept => ({ label: dept, value: dept }))}
            />
          </Form.Item>

          <Form.Item
            label="적용 역할"
            name="scope.conditions.roles"
          >
            <Select
              mode="multiple"
              placeholder="적용할 역할을 선택하세요"
              options={roles.map(role => ({ label: role, value: role }))}
            />
          </Form.Item>

          <Divider>접근 제한</Divider>

          <Form.Item
            label="시간 제한"
            name="scope.restrictions.timeRestriction"
            valuePropName="checked"
          >
            <input type="checkbox" /> 근무 시간 내에만 사용 가능
          </Form.Item>

          <Form.Item
            label="위치 제한"
            name="scope.restrictions.locationRestriction"
            valuePropName="checked"
          >
            <input type="checkbox" /> 회사 내에서만 사용 가능
          </Form.Item>

          <Form.Item
            label="IP 제한"
            name="scope.restrictions.ipRestriction"
            valuePropName="checked"
          >
            <input type="checkbox" /> 허용된 IP에서만 사용 가능
          </Form.Item>

          <Form.Item
            label="디바이스 제한"
            name="scope.restrictions.deviceRestriction"
            valuePropName="checked"
          >
            <input type="checkbox" /> 등록된 디바이스에서만 사용 가능
          </Form.Item>

          <Divider>사용 제한</Divider>

          <Form.Item
            label="최대 실행 횟수"
            name="scope.limits.maxActions"
          >
            <Input type="number" placeholder="무제한 시 비워두세요" />
          </Form.Item>

          <Form.Item
            label="일일 사용 제한"
            name="scope.limits.dailyLimit"
          >
            <Input type="number" placeholder="무제한 시 비워두세요" />
          </Form.Item>

          <Form.Item
            label="월간 사용 제한"
            name="scope.limits.monthlyLimit"
          >
            <Input type="number" placeholder="무제한 시 비워두세요" />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>
                취소
              </Button>
              <Button type="primary" htmlType="submit">
                저장
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="권한 상세 정보"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={
          <Button type="primary" onClick={() => setViewModalOpen(false)}>
            확인
          </Button>
        }
        width={700}
      >
        {viewingPermission && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="권한 이름">
              <code>{viewingPermission.name}</code>
            </Descriptions.Item>
            <Descriptions.Item label="표시 이름">
              {viewingPermission.displayName}
            </Descriptions.Item>
            <Descriptions.Item label="설명">
              {viewingPermission.description}
            </Descriptions.Item>
            <Descriptions.Item label="카테고리">
              <Tag color="blue">
                {permissionCategories.find(c => c.value === viewingPermission.category)?.label || viewingPermission.category}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="범위">
              {getScopeDescription(viewingPermission.scope)}
            </Descriptions.Item>
            <Descriptions.Item label="접근 제한">
              {getRestrictionTags(viewingPermission.scope.restrictions)}
            </Descriptions.Item>
            <Descriptions.Item label="사용 제한">
              {viewingPermission.scope.limits ? (
                <div>
                  {viewingPermission.scope.limits.maxActions && <div>최대 실행: {viewingPermission.scope.limits.maxActions}회</div>}
                  {viewingPermission.scope.limits.dailyLimit && <div>일일 제한: {viewingPermission.scope.limits.dailyLimit}회</div>}
                  {viewingPermission.scope.limits.monthlyLimit && <div>월간 제한: {viewingPermission.scope.limits.monthlyLimit}회</div>}
                </div>
              ) : <Tag color="green">제한 없음</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="생성일">
              {new Date(viewingPermission.createdAt).toLocaleString('ko-KR')}
            </Descriptions.Item>
            <Descriptions.Item label="수정일">
              {new Date(viewingPermission.updatedAt).toLocaleString('ko-KR')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};