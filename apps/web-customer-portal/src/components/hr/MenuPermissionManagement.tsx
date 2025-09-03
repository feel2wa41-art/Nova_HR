import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Select, Switch, Space, message, Tag, Divider, Input } from 'antd';
import { SettingOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface MenuPermission {
  id: string;
  menuKey: string;
  menuName: string;
  rolePermissions: {
    [roleId: string]: boolean;
  };
  userPermissions: {
    [userId: string]: boolean;
  };
  description?: string;
}

interface MenuRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    roles: string[];
    permissions: string[];
    departments: string[];
  };
  allowedMenus: string[];
}

export const MenuPermissionManagement = () => {
  const [menuPermissions, setMenuPermissions] = useState<MenuPermission[]>([]);
  const [menuRules, setMenuRules] = useState<MenuRule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuPermission | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MenuRule | null>(null);
  const [form] = Form.useForm();
  const [ruleForm] = Form.useForm();

  // Mock data for menus
  const availableMenus = [
    { key: '/', name: '대시보드', description: '메인 대시보드 화면' },
    { key: '/attendance', name: '출퇴근', description: '출퇴근 관리' },
    { key: '/leave', name: '휴가', description: '휴가 신청 및 관리' },
    { key: '/approval', name: '전자결재', description: '결재 문서 관리' },
    { key: '/settings', name: '설정', description: '개인 설정' },
    { key: '/hr-management', name: 'HR 관리', description: 'HR 관리자 기능' },
    { key: '/admin/users', name: '사용자 관리', description: '사용자 계정 관리' },
    { key: '/admin/company', name: '회사 설정', description: '회사 설정 관리' },
  ];

  // Mock roles
  const availableRoles = [
    { id: 'EMPLOYEE', name: '직원' },
    { id: 'HR_MANAGER', name: 'HR 관리자' },
    { id: 'SUPER_ADMIN', name: '시스템 관리자' },
  ];

  // Mock users
  const availableUsers = [
    { id: '1', name: '홍길동', role: 'EMPLOYEE' },
    { id: '2', name: '김인사', role: 'HR_MANAGER' },
    { id: '3', name: '시스템 관리자', role: 'SUPER_ADMIN' },
  ];

  // Mock permissions
  const availablePermissions = [
    'view_own_attendance',
    'apply_leave',
    'view_own_profile',
    'manage_users',
    'view_all_attendance',
    'manage_leaves',
    'manage_company_settings',
    'view_reports',
    'system_admin',
  ];

  // Mock departments
  const availableDepartments = [
    'IT팀',
    'HR팀',
    '개발팀',
    '디자인팀',
    '영업팀',
  ];

  useEffect(() => {
    loadMenuPermissions();
    loadMenuRules();
  }, []);

  const loadMenuPermissions = () => {
    const stored = localStorage.getItem('nova_hr_menu_permissions');
    if (stored) {
      setMenuPermissions(JSON.parse(stored));
    } else {
      // Initialize with default permissions
      const defaultPermissions: MenuPermission[] = availableMenus.map(menu => ({
        id: menu.key,
        menuKey: menu.key,
        menuName: menu.name,
        rolePermissions: {
          'EMPLOYEE': ['/', '/attendance', '/leave', '/approval', '/settings'].includes(menu.key),
          'HR_MANAGER': true,
          'SUPER_ADMIN': true,
        },
        userPermissions: {},
        description: menu.description,
      }));
      setMenuPermissions(defaultPermissions);
      localStorage.setItem('nova_hr_menu_permissions', JSON.stringify(defaultPermissions));
    }
  };

  const loadMenuRules = () => {
    const stored = localStorage.getItem('nova_hr_menu_rules');
    if (stored) {
      setMenuRules(JSON.parse(stored));
    } else {
      // Initialize with default rules
      const defaultRules: MenuRule[] = [
        {
          id: 'rule_1',
          name: '기본 직원 권한',
          description: '일반 직원이 사용할 수 있는 기본 메뉴',
          conditions: {
            roles: ['EMPLOYEE'],
            permissions: ['view_own_attendance', 'apply_leave'],
            departments: [],
          },
          allowedMenus: ['/', '/attendance', '/leave', '/settings'],
        },
        {
          id: 'rule_2',
          name: 'HR 관리자 권한',
          description: 'HR 관리자가 사용할 수 있는 확장 메뉴',
          conditions: {
            roles: ['HR_MANAGER'],
            permissions: ['manage_users', 'manage_leaves'],
            departments: ['HR팀'],
          },
          allowedMenus: ['/', '/attendance', '/leave', '/approval', '/settings', '/hr-management'],
        },
      ];
      setMenuRules(defaultRules);
      localStorage.setItem('nova_hr_menu_rules', JSON.stringify(defaultRules));
    }
  };

  const saveMenuPermissions = (permissions: MenuPermission[]) => {
    setMenuPermissions(permissions);
    localStorage.setItem('nova_hr_menu_permissions', JSON.stringify(permissions));
  };

  const saveMenuRules = (rules: MenuRule[]) => {
    setMenuRules(rules);
    localStorage.setItem('nova_hr_menu_rules', JSON.stringify(rules));
  };

  const handleEdit = (record: MenuPermission) => {
    setEditingItem(record);
    form.setFieldsValue({
      menuName: record.menuName,
      description: record.description,
      rolePermissions: record.rolePermissions,
      userPermissions: record.userPermissions,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      const updatedPermissions = menuPermissions.map(item => 
        item.id === editingItem?.id
          ? { ...item, ...values }
          : item
      );
      
      saveMenuPermissions(updatedPermissions);
      setIsModalOpen(false);
      setEditingItem(null);
      form.resetFields();
      message.success('메뉴 권한이 저장되었습니다.');
    } catch (error) {
      message.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleRuleEdit = (record?: MenuRule) => {
    setEditingRule(record || null);
    if (record) {
      ruleForm.setFieldsValue(record);
    } else {
      ruleForm.resetFields();
    }
    setRuleModalOpen(true);
  };

  const handleRuleSave = async (values: any) => {
    try {
      let updatedRules;
      if (editingRule) {
        updatedRules = menuRules.map(rule => 
          rule.id === editingRule.id ? { ...rule, ...values } : rule
        );
      } else {
        const newRule: MenuRule = {
          id: `rule_${Date.now()}`,
          ...values,
        };
        updatedRules = [...menuRules, newRule];
      }
      
      saveMenuRules(updatedRules);
      setRuleModalOpen(false);
      setEditingRule(null);
      ruleForm.resetFields();
      message.success('메뉴 규칙이 저장되었습니다.');
    } catch (error) {
      message.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleRuleDelete = (ruleId: string) => {
    Modal.confirm({
      title: '규칙 삭제',
      content: '이 규칙을 삭제하시겠습니까?',
      onOk: () => {
        const updatedRules = menuRules.filter(rule => rule.id !== ruleId);
        saveMenuRules(updatedRules);
        message.success('규칙이 삭제되었습니다.');
      },
    });
  };

  const columns: ColumnsType<MenuPermission> = [
    {
      title: '메뉴명',
      dataIndex: 'menuName',
      key: 'menuName',
      render: (name, record) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">{record.description}</div>
        </div>
      ),
    },
    {
      title: '메뉴 경로',
      dataIndex: 'menuKey',
      key: 'menuKey',
      render: (path) => <code className="bg-gray-100 px-2 py-1 rounded">{path}</code>,
    },
    {
      title: '역할별 권한',
      key: 'rolePermissions',
      render: (_, record) => (
        <Space wrap>
          {availableRoles.map(role => (
            <Tag 
              key={role.id}
              color={record.rolePermissions[role.id] ? 'green' : 'red'}
            >
              {role.name}: {record.rolePermissions[role.id] ? '허용' : '차단'}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '액션',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          편집
        </Button>
      ),
    },
  ];

  const ruleColumns: ColumnsType<MenuRule> = [
    {
      title: '규칙명',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">{record.description}</div>
        </div>
      ),
    },
    {
      title: '적용 조건',
      key: 'conditions',
      render: (_, record) => (
        <div className="space-y-1">
          {record.conditions.roles.length > 0 && (
            <div>
              <span className="text-sm font-medium">역할: </span>
              {record.conditions.roles.map(role => (
                <Tag key={role}>{availableRoles.find(r => r.id === role)?.name || role}</Tag>
              ))}
            </div>
          )}
          {record.conditions.permissions.length > 0 && (
            <div>
              <span className="text-sm font-medium">권한: </span>
              {record.conditions.permissions.map(perm => (
                <Tag key={perm} color="blue">{perm}</Tag>
              ))}
            </div>
          )}
          {record.conditions.departments.length > 0 && (
            <div>
              <span className="text-sm font-medium">부서: </span>
              {record.conditions.departments.map(dept => (
                <Tag key={dept} color="orange">{dept}</Tag>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '허용 메뉴',
      dataIndex: 'allowedMenus',
      key: 'allowedMenus',
      render: (menus) => (
        <Space wrap>
          {menus.map((menuKey: string) => {
            const menu = availableMenus.find(m => m.key === menuKey);
            return (
              <Tag key={menuKey} color="green">
                {menu?.name || menuKey}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '액션',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleRuleEdit(record)}
          >
            편집
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleRuleDelete(record.id)}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Menu Permissions Table */}
      <Card 
        title={
          <div className="flex items-center gap-2">
            <SettingOutlined />
            메뉴 권한 관리
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={menuPermissions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Menu Rules */}
      <Card 
        title="메뉴 규칙 관리"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleRuleEdit()}
          >
            규칙 추가
          </Button>
        }
      >
        <Table
          columns={ruleColumns}
          dataSource={menuRules}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Permission Edit Modal */}
      <Modal
        title="메뉴 권한 편집"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            label="메뉴명"
            name="menuName"
            rules={[{ required: true, message: '메뉴명을 입력해주세요' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>역할별 권한</Divider>
          {availableRoles.map(role => (
            <Form.Item
              key={role.id}
              label={role.name}
              name={['rolePermissions', role.id]}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          ))}

          <Divider>사용자별 개별 권한</Divider>
          {availableUsers.map(user => (
            <Form.Item
              key={user.id}
              label={`${user.name} (${availableRoles.find(r => r.id === user.role)?.name})`}
              name={['userPermissions', user.id]}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          ))}

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

      {/* Rule Edit Modal */}
      <Modal
        title={editingRule ? "메뉴 규칙 편집" : "메뉴 규칙 추가"}
        open={ruleModalOpen}
        onCancel={() => setRuleModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form
          form={ruleForm}
          layout="vertical"
          onFinish={handleRuleSave}
        >
          <Form.Item
            label="규칙명"
            name="name"
            rules={[{ required: true, message: '규칙명을 입력해주세요' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>적용 조건</Divider>
          
          <Form.Item
            label="역할"
            name={['conditions', 'roles']}
          >
            <Select
              mode="multiple"
              placeholder="적용할 역할을 선택하세요"
              options={availableRoles.map(role => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="권한"
            name={['conditions', 'permissions']}
          >
            <Select
              mode="multiple"
              placeholder="필요한 권한을 선택하세요"
              options={availablePermissions.map(perm => ({
                label: perm,
                value: perm,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="부서"
            name={['conditions', 'departments']}
          >
            <Select
              mode="multiple"
              placeholder="적용할 부서를 선택하세요"
              options={availableDepartments.map(dept => ({
                label: dept,
                value: dept,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="허용 메뉴"
            name="allowedMenus"
            rules={[{ required: true, message: '허용할 메뉴를 선택해주세요' }]}
          >
            <Select
              mode="multiple"
              placeholder="허용할 메뉴를 선택하세요"
              options={availableMenus.map(menu => ({
                label: menu.name,
                value: menu.key,
              }))}
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setRuleModalOpen(false)}>
                취소
              </Button>
              <Button type="primary" htmlType="submit">
                저장
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};