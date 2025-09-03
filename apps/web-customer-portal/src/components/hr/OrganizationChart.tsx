import { useState, useEffect } from 'react';
import { Card, Tree, Avatar, Tag, Space, Tooltip, Input, Button, Modal, Form, Select, message, Divider } from 'antd';
import { UserOutlined, SearchOutlined, TeamOutlined, CrownOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';

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
  manager?: string; // for backward compatibility
  department?: string;
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

export const OrganizationChart = () => {
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
    const organizationTree = buildOrganizationTree(mockEmployees);
    setOrgData(organizationTree);
    // Auto expand all nodes initially
    const allKeys = getAllNodeKeys(organizationTree);
    setExpandedKeys(allKeys);
  }, []);

  const buildOrganizationTree = (employees: Employee[]): OrganizationNode[] => {
    const employeeMap = new Map<string, Employee>();
    employees.forEach(emp => employeeMap.set(emp.id, emp));

    const rootEmployees = employees.filter(emp => !emp.managerId && !emp.manager);
    
    const buildNode = (employee: Employee): OrganizationNode => {
      const children = employees.filter(emp => emp.managerId === employee.id || emp.manager === employee.id);
      
      return {
        key: employee.id,
        title: renderEmployeeNode(employee),
        employee: employee,
        type: 'employee' as const,
        children: children.length > 0 ? children.map(buildNode) : undefined
      };
    };

    return rootEmployees.map(buildNode);
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
              <Tag color={getRoleColor(employee.role)}>
                {getRoleLabel(employee.role)}
              </Tag>
            </div>
            <div className="text-sm text-gray-500">
              {employee.title} • {employee.department}
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

    const expandedKeys = mockEmployees
      .filter(emp => emp.name.toLowerCase().includes(value.toLowerCase()) || 
                    emp.title.toLowerCase().includes(value.toLowerCase()) ||
                    emp.department.toLowerCase().includes(value.toLowerCase()))
      .map(emp => emp.id);

    setExpandedKeys(expandedKeys);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const getDepartmentStats = () => {
    const departments = mockEmployees.reduce((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return departments;
  };

  const departmentStats = getDepartmentStats();

  return (
    <div className="space-y-6">
      <Card title="조직도" extra={
        <Search
          placeholder="이름, 직책, 부서 검색"
          allowClear
          onSearch={onSearch}
          style={{ width: 250 }}
          enterButton
        />
      }>
        <div className="space-y-4">
          {/* Department Statistics */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TeamOutlined />
              부서별 현황
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(departmentStats).map(([dept, count]) => (
                <div key={dept} className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{count}명</div>
                  <div className="text-sm text-gray-600">{dept}</div>
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

      {/* Legend */}
      <Card title="범례" size="small">
        <Space wrap>
          <div className="flex items-center gap-2">
            <CrownOutlined className="text-purple-500" />
            <Tag color="purple">시스템 관리자</Tag>
            <span className="text-sm text-gray-500">전체 시스템 관리 권한</span>
          </div>
          <div className="flex items-center gap-2">
            <TeamOutlined className="text-blue-500" />
            <Tag color="blue">HR 관리자</Tag>
            <span className="text-sm text-gray-500">인사 관리 권한</span>
          </div>
          <div className="flex items-center gap-2">
            <UserOutlined className="text-gray-500" />
            <Tag>직원</Tag>
            <span className="text-sm text-gray-500">일반 사용자</span>
          </div>
        </Space>
      </Card>
    </div>
  );
};