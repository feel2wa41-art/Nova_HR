import { useState, useEffect } from 'react';
import { Card, Tree, Avatar, Tag, Space, Tooltip, Input, Button, Modal, Form, Select, message, Divider, Table } from 'antd';
import { UserOutlined, SearchOutlined, TeamOutlined, CrownOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import type { TreeDataNode, ColumnsType } from 'antd/es/table';

const { Search } = Input;

interface Organization {
  id: string;
  name: string;
  level: number;
  parentId?: string;
  order: number;
  description?: string;
  isActive: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  organizationId: string;
  managerId?: string;
  order: number;
  avatar?: string;
}

interface OrganizationNode extends TreeDataNode {
  key: string;
  title: React.ReactNode;
  children?: OrganizationNode[];
  organization?: Organization;
  employee?: Employee;
  type: 'organization' | 'employee';
}

export const EnhancedOrganizationChart = () => {
  const [orgData, setOrgData] = useState<OrganizationNode[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgForm] = Form.useForm();

  // Mock organization data
  const mockOrganizations: Organization[] = [
    {
      id: 'org_1',
      name: 'Nova HR',
      level: 0,
      order: 0,
      description: '본사',
      isActive: true,
    },
    {
      id: 'org_2',
      name: 'IT팀',
      level: 1,
      parentId: 'org_1',
      order: 0,
      description: '정보기술팀',
      isActive: true,
    },
    {
      id: 'org_3',
      name: 'HR팀',
      level: 1,
      parentId: 'org_1',
      order: 1,
      description: '인사팀',
      isActive: true,
    },
    {
      id: 'org_4',
      name: '개발팀',
      level: 2,
      parentId: 'org_2',
      order: 0,
      description: '소프트웨어 개발팀',
      isActive: true,
    },
    {
      id: 'org_5',
      name: '디자인팀',
      level: 2,
      parentId: 'org_2',
      order: 1,
      description: 'UI/UX 디자인팀',
      isActive: true,
    },
    {
      id: 'org_6',
      name: '영업팀',
      level: 1,
      parentId: 'org_1',
      order: 2,
      description: '영업 및 마케팅팀',
      isActive: true,
    },
  ];

  // Mock employee data
  const mockEmployees: Employee[] = [
    {
      id: '3',
      name: '시스템 관리자',
      email: 'admin@nova-hr.com',
      role: 'SUPER_ADMIN',
      title: 'IT 관리자',
      organizationId: 'org_2',
      order: 0,
    },
    {
      id: '2',
      name: '김인사',
      email: 'hr@nova-hr.com',
      role: 'HR_MANAGER',
      title: 'HR 매니저',
      organizationId: 'org_3',
      managerId: '3',
      order: 0,
    },
    {
      id: '1',
      name: '홍길동',
      email: 'employee@nova-hr.com',
      role: 'EMPLOYEE',
      title: '시니어 개발자',
      organizationId: 'org_4',
      managerId: '3',
      order: 0,
    },
    {
      id: '4',
      name: '이개발',
      email: 'dev2@nova-hr.com',
      role: 'EMPLOYEE',
      title: '주니어 개발자',
      organizationId: 'org_4',
      managerId: '1',
      order: 1,
    },
    {
      id: '5',
      name: '박디자인',
      email: 'design@nova-hr.com',
      role: 'EMPLOYEE',
      title: '시니어 디자이너',
      organizationId: 'org_5',
      managerId: '2',
      order: 0,
    },
    {
      id: '6',
      name: '최영업',
      email: 'sales@nova-hr.com',
      role: 'EMPLOYEE',
      title: '영업 담당자',
      organizationId: 'org_6',
      managerId: '2',
      order: 0,
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load from localStorage or use mock data
    const storedOrgs = localStorage.getItem('nova_hr_organizations');
    const storedEmps = localStorage.getItem('nova_hr_employees');
    
    const orgs = storedOrgs ? JSON.parse(storedOrgs) : mockOrganizations;
    const emps = storedEmps ? JSON.parse(storedEmps) : mockEmployees;
    
    setOrganizations(orgs);
    setEmployees(emps);
    
    // Save to localStorage if not exists
    if (!storedOrgs) {
      localStorage.setItem('nova_hr_organizations', JSON.stringify(mockOrganizations));
    }
    if (!storedEmps) {
      localStorage.setItem('nova_hr_employees', JSON.stringify(mockEmployees));
    }
    
    const organizationTree = buildOrganizationTree(orgs, emps);
    setOrgData(organizationTree);
    
    // Auto expand all nodes initially
    const allKeys = getAllNodeKeys(organizationTree);
    setExpandedKeys(allKeys);
  };

  const saveData = (orgs: Organization[], emps: Employee[]) => {
    setOrganizations(orgs);
    setEmployees(emps);
    localStorage.setItem('nova_hr_organizations', JSON.stringify(orgs));
    localStorage.setItem('nova_hr_employees', JSON.stringify(emps));
    
    const organizationTree = buildOrganizationTree(orgs, emps);
    setOrgData(organizationTree);
  };

  const buildOrganizationTree = (orgs: Organization[], emps: Employee[]): OrganizationNode[] => {
    // Sort organizations by level and order
    const sortedOrgs = [...orgs].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.order - b.order;
    });

    // Sort employees by order within each organization
    const sortedEmps = [...emps].sort((a, b) => a.order - b.order);

    const buildOrgNode = (org: Organization): OrganizationNode => {
      // Get child organizations
      const childOrgs = sortedOrgs.filter(o => o.parentId === org.id);
      
      // Get employees in this organization
      const orgEmployees = sortedEmps.filter(emp => emp.organizationId === org.id);
      
      const children: OrganizationNode[] = [];
      
      // Add child organizations
      childOrgs.forEach(childOrg => {
        children.push(buildOrgNode(childOrg));
      });
      
      // Add employees
      orgEmployees.forEach(emp => {
        children.push({
          key: `emp_${emp.id}`,
          title: renderEmployeeNode(emp),
          type: 'employee',
          employee: emp,
        });
      });

      return {
        key: `org_${org.id}`,
        title: renderOrganizationNode(org),
        type: 'organization',
        organization: org,
        children: children.length > 0 ? children : undefined,
      };
    };

    // Get root organizations (level 0)
    const rootOrgs = sortedOrgs.filter(org => org.level === 0);
    return rootOrgs.map(buildOrgNode);
  };

  const renderOrganizationNode = (org: Organization) => {
    const empCount = employees.filter(emp => emp.organizationId === org.id).length;
    
    return (
      <div className="flex items-center justify-between w-full py-1">
        <div className="flex items-center gap-3">
          <TeamOutlined className="text-blue-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-800">{org.name}</span>
              <Tag color="blue" size="small">Level {org.level}</Tag>
              {empCount > 0 && <Tag color="green" size="small">{empCount}명</Tag>}
            </div>
            {org.description && (
              <div className="text-sm text-gray-500">{org.description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleOrgEdit(org);
            }}
          />
          <Button 
            type="text" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleOrgDelete(org.id);
            }}
          />
        </div>
      </div>
    );
  };

  const renderEmployeeNode = (employee: Employee) => {
    const getRoleIcon = (role: string) => {
      switch (role) {
        case 'SUPER_ADMIN':
          return <CrownOutlined className="text-purple-500" />;
        case 'HR_MANAGER':
          return <TeamOutlined className="text-blue-500" />;
        default:
          return <UserOutlined className="text-gray-500" />;
      }
    };

    const getRoleColor = (role: string) => {
      switch (role) {
        case 'SUPER_ADMIN':
          return 'purple';
        case 'HR_MANAGER':
          return 'blue';
        default:
          return 'default';
      }
    };

    const getRoleLabel = (role: string) => {
      switch (role) {
        case 'SUPER_ADMIN':
          return '시스템 관리자';
        case 'HR_MANAGER':
          return 'HR 관리자';
        case 'EMPLOYEE':
          return '직원';
        default:
          return role;
      }
    };

    return (
      <div className="flex items-center justify-between w-full py-2">
        <div className="flex items-center gap-3">
          <Avatar 
            size="small" 
            icon={getRoleIcon(employee.role)}
            src={employee.avatar}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{employee.name}</span>
              <Tag color={getRoleColor(employee.role)} size="small">
                {getRoleLabel(employee.role)}
              </Tag>
            </div>
            <div className="text-sm text-gray-500">
              {employee.title}
            </div>
          </div>
        </div>
        <div className="text-right">
          <Tooltip title={employee.email}>
            <Button type="text" size="small" icon={<UserOutlined />}>
              상세
            </Button>
          </Tooltip>
        </div>
      </div>
    );
  };

  const getAllNodeKeys = (nodes: OrganizationNode[]): string[] => {
    let keys: string[] = [];
    nodes.forEach(node => {
      keys.push(node.key);
      if (node.children) {
        keys = keys.concat(getAllNodeKeys(node.children));
      }
    });
    return keys;
  };

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
    setAutoExpandParent(false);
  };

  const onSearch = (value: string) => {
    if (!value) {
      setExpandedKeys(getAllNodeKeys(orgData));
      setSearchValue('');
      setAutoExpandParent(false);
      return;
    }

    const expandedKeys = employees
      .filter(emp => emp.name.toLowerCase().includes(value.toLowerCase()) || 
                    emp.title.toLowerCase().includes(value.toLowerCase()))
      .map(emp => `emp_${emp.id}`);

    const orgKeys = organizations
      .filter(org => org.name.toLowerCase().includes(value.toLowerCase()))
      .map(org => `org_${org.id}`);

    setExpandedKeys([...expandedKeys, ...orgKeys]);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const handleOrgEdit = (org?: Organization) => {
    setEditingOrg(org || null);
    if (org) {
      orgForm.setFieldsValue(org);
    } else {
      orgForm.resetFields();
    }
    setOrgModalOpen(true);
  };

  const handleOrgSave = async (values: any) => {
    try {
      const orgData: Organization = {
        id: editingOrg?.id || `org_${Date.now()}`,
        name: values.name,
        level: values.level,
        parentId: values.parentId,
        order: values.order || 0,
        description: values.description,
        isActive: true,
      };

      let updatedOrgs;
      if (editingOrg) {
        updatedOrgs = organizations.map(org => 
          org.id === editingOrg.id ? orgData : org
        );
      } else {
        updatedOrgs = [...organizations, orgData];
      }

      saveData(updatedOrgs, employees);
      setOrgModalOpen(false);
      setEditingOrg(null);
      orgForm.resetFields();
      message.success('조직이 저장되었습니다.');
    } catch (error) {
      message.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleOrgDelete = (orgId: string) => {
    Modal.confirm({
      title: '조직 삭제',
      content: '이 조직을 삭제하시겠습니까? 하위 조직과 직원들도 함께 이동됩니다.',
      onOk: () => {
        const updatedOrgs = organizations.filter(org => org.id !== orgId);
        saveData(updatedOrgs, employees);
        message.success('조직이 삭제되었습니다.');
      },
    });
  };

  const getOrganizationStats = () => {
    const stats = organizations.reduce((acc, org) => {
      const empCount = employees.filter(emp => emp.organizationId === org.id).length;
      acc[org.name] = empCount;
      return acc;
    }, {} as Record<string, number>);

    return stats;
  };

  const getAvailableParents = () => {
    const maxLevel = editingOrg ? editingOrg.level - 1 : 2; // Prevent circular reference
    return organizations
      .filter(org => org.id !== editingOrg?.id && org.level < maxLevel)
      .map(org => ({ label: `${org.name} (Level ${org.level})`, value: org.id }));
  };

  const organizationStats = getOrganizationStats();

  // Organization management table columns
  const orgColumns: ColumnsType<Organization> = [
    {
      title: '조직명',
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
      title: '레벨',
      dataIndex: 'level',
      key: 'level',
      render: (level) => <Tag color="blue">Level {level}</Tag>,
    },
    {
      title: '상위 조직',
      dataIndex: 'parentId',
      key: 'parentId',
      render: (parentId) => {
        const parent = organizations.find(org => org.id === parentId);
        return parent ? parent.name : '-';
      },
    },
    {
      title: '순서',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: '인원수',
      key: 'employeeCount',
      render: (_, record) => {
        const count = employees.filter(emp => emp.organizationId === record.id).length;
        return <Tag color="green">{count}명</Tag>;
      },
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
            onClick={() => handleOrgEdit(record)}
          >
            편집
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleOrgDelete(record.id)}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Organization Tree */}
      <Card title="조직도" extra={
        <Space>
          <Search
            placeholder="이름, 직책, 조직 검색"
            allowClear
            onSearch={onSearch}
            style={{ width: 250 }}
            enterButton
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOrgEdit()}
          >
            조직 추가
          </Button>
        </Space>
      }>
        <div className="space-y-4">
          {/* Organization Statistics */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TeamOutlined />
              조직별 현황
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(organizationStats).map(([orgName, count]) => (
                <div key={orgName} className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{count}명</div>
                  <div className="text-sm text-gray-600">{orgName}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Organization Tree */}
          <Tree
            showLine
            showIcon={false}
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            treeData={orgData}
            className="organization-tree"
          />
        </div>
      </Card>

      {/* Organization Management Table */}
      <Card title="조직 관리" extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOrgEdit()}
        >
          조직 추가
        </Button>
      }>
        <Table
          columns={orgColumns}
          dataSource={organizations.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.order - b.order;
          })}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Organization Edit Modal */}
      <Modal
        title={editingOrg ? "조직 편집" : "조직 추가"}
        open={orgModalOpen}
        onCancel={() => setOrgModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form
          form={orgForm}
          layout="vertical"
          onFinish={handleOrgSave}
        >
          <Form.Item
            label="조직명"
            name="name"
            rules={[{ required: true, message: '조직명을 입력해주세요' }]}
          >
            <Input placeholder="예: 개발팀" />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
          >
            <Input.TextArea rows={2} placeholder="조직에 대한 설명을 입력하세요" />
          </Form.Item>

          <Form.Item
            label="레벨"
            name="level"
            rules={[{ required: true, message: '레벨을 선택해주세요' }]}
          >
            <Select placeholder="조직 레벨을 선택하세요">
              <Select.Option value={0}>Level 0 (최상위)</Select.Option>
              <Select.Option value={1}>Level 1</Select.Option>
              <Select.Option value={2}>Level 2</Select.Option>
              <Select.Option value={3}>Level 3</Select.Option>
              <Select.Option value={4}>Level 4</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="상위 조직"
            name="parentId"
          >
            <Select 
              placeholder="상위 조직을 선택하세요 (최상위 조직인 경우 비워두세요)"
              allowClear
              options={getAvailableParents()}
            />
          </Form.Item>

          <Form.Item
            label="표시 순서"
            name="order"
            initialValue={0}
          >
            <Input type="number" min={0} placeholder="같은 레벨 내에서의 표시 순서" />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => setOrgModalOpen(false)}>
                취소
              </Button>
              <Button type="primary" htmlType="submit">
                저장
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Legend */}
      <Card title="범례" size="small">
        <Space wrap>
          <div className="flex items-center gap-2">
            <CrownOutlined className="text-purple-500" />
            <Tag color="purple" size="small">시스템 관리자</Tag>
            <span className="text-sm text-gray-500">전체 시스템 관리 권한</span>
          </div>
          <div className="flex items-center gap-2">
            <TeamOutlined className="text-blue-500" />
            <Tag color="blue" size="small">HR 관리자</Tag>
            <span className="text-sm text-gray-500">인사 관리 권한</span>
          </div>
          <div className="flex items-center gap-2">
            <UserOutlined className="text-gray-500" />
            <Tag size="small">직원</Tag>
            <span className="text-sm text-gray-500">일반 사용자</span>
          </div>
        </Space>
      </Card>
    </div>
  );
};