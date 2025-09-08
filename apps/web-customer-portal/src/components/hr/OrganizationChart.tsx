import { useState, useEffect } from 'react';
import { Card, Tree, Avatar, Tag, Space, Tooltip, Input, Button, Modal, Form, Select, message, Divider } from 'antd';
import { UserOutlined, SearchOutlined, TeamOutlined, CrownOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DragOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';
import { useQuery } from '@tanstack/react-query';

const { Search } = Input;

// DB 스키마에 맞는 인터페이스
interface OrgUnit {
  id: string;
  company_id: string;
  parent_id?: string;
  name: string;
  code?: string;
  description?: string;
  order_index: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  title?: string;
  role: string;
  org_id?: string;
  status: string;
  employee_profile?: {
    id: string;
    user_id: string;
    emp_no?: string;
    department?: string;
    hire_date?: string;
    employment_type: string;
  };
  avatar_url?: string;
}

interface OrganizationNode extends TreeDataNode {
  key: string;
  title: React.ReactNode;
  children?: OrganizationNode[];
  orgUnit?: OrgUnit;
  user?: User;
  type: 'orgUnit' | 'user';
}

export const OrganizationChart = () => {
  const [orgData, setOrgData] = useState<OrganizationNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  
  // 조직 단위 데이터 조회 - 실제 API 연동 필요
  const { data: orgUnits, isLoading: orgUnitsLoading } = useQuery({
    queryKey: ['org-units'],
    queryFn: async () => {
      // TODO: 실제 API 호출로 대체
      // return companyApi.getOrgUnits();
      
      // 임시 목업 데이터 (DB 스키마에 맞춤)
      return [
        {
          id: '93edb297-288e-4b97-94cb-b7bd2947c020',
          company_id: 'company-demo',
          parent_id: null,
          name: 'Nova HR',
          code: 'HQ',
          description: '본사',
          order_index: 0,
          status: 'ACTIVE',
          created_at: '2025-09-04T07:59:10.058Z',
          updated_at: '2025-09-04T07:59:10.058Z'
        },
        {
          id: '56afdc01-42fc-4b5c-a821-75403fa45b79',
          company_id: 'company-demo',
          parent_id: '93edb297-288e-4b97-94cb-b7bd2947c020',
          name: '개발팀',
          code: 'DEV',
          description: '소프트웨어 개발팀',
          order_index: 1,
          status: 'ACTIVE',
          created_at: '2025-09-04T07:59:10.058Z',
          updated_at: '2025-09-04T07:59:10.058Z'
        },
        {
          id: 'hr-team-id',
          company_id: 'company-demo',
          parent_id: '93edb297-288e-4b97-94cb-b7bd2947c020',
          name: 'HR팀',
          code: 'HR',
          description: '인사팀',
          order_index: 2,
          status: 'ACTIVE',
          created_at: '2025-09-04T07:59:10.058Z',
          updated_at: '2025-09-04T07:59:10.058Z'
        }
      ] as OrgUnit[];
    },
    retry: 1,
  });
  
  // 사용자 데이터 조회 - 실제 API 연동 필요
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users-org'],
    queryFn: async () => {
      // TODO: 실제 API 호출로 대체
      // return userApi.getUsersWithOrgInfo();
      
      // 임시 목업 데이터 (DB 스키마에 맞춤)
      return [
        {
          id: '2631f2a6-ace9-486e-8a61-8bf6fe2e553f',
          email: 'admin@nova-hr.com',
          name: '시스템 관리자',
          title: 'IT 관리자',
          role: 'SUPER_ADMIN',
          org_id: '56afdc01-42fc-4b5c-a821-75403fa45b79',
          status: 'ACTIVE',
          employee_profile: {
            id: 'e226833b-c69a-40c2-b9c3-788f986f3ed5',
            user_id: '2631f2a6-ace9-486e-8a61-8bf6fe2e553f',
            emp_no: 'EMP001',
            department: '개발팀',
            hire_date: '2020-01-01T00:00:00.000Z',
            employment_type: 'FULL_TIME'
          }
        },
        {
          id: 'hr-user-id',
          email: 'hr@nova-hr.com',
          name: '김인사',
          title: 'HR 매니저',
          role: 'HR_MANAGER',
          org_id: 'hr-team-id',
          status: 'ACTIVE',
          employee_profile: {
            id: 'hr-profile-id',
            user_id: 'hr-user-id',
            emp_no: 'EMP002',
            department: 'HR팀',
            hire_date: '2020-01-01T00:00:00.000Z',
            employment_type: 'FULL_TIME'
          }
        },
        {
          id: 'employee-user-id',
          email: 'employee@nova-hr.com',
          name: '홍길동',
          title: '시니어 개발자',
          role: 'EMPLOYEE',
          org_id: '56afdc01-42fc-4b5c-a821-75403fa45b79',
          status: 'ACTIVE',
          employee_profile: {
            id: 'employee-profile-id',
            user_id: 'employee-user-id',
            emp_no: 'EMP003',
            department: '개발팀',
            hire_date: '2021-01-01T00:00:00.000Z',
            employment_type: 'FULL_TIME'
          }
        }
      ] as User[];
    },
    retry: 1,
  });

  useEffect(() => {
    if (orgUnits && users) {
      const organizationTree = buildOrganizationTree(orgUnits, users);
      setOrgData(organizationTree);
      // Auto expand all nodes initially
      const allKeys = getAllNodeKeys(organizationTree);
      setExpandedKeys(allKeys);
    }
  }, [orgUnits, users]);

  const buildOrganizationTree = (orgUnits: OrgUnit[], users: User[]): OrganizationNode[] => {
    // Create org unit hierarchy first
    const rootOrgUnits = orgUnits.filter(org => !org.parent_id);
    
    const buildOrgNode = (orgUnit: OrgUnit): OrganizationNode => {
      // Find child org units
      const childOrgUnits = orgUnits.filter(org => org.parent_id === orgUnit.id);
      
      // Find users in this org unit
      const usersInOrg = users.filter(user => user.org_id === orgUnit.id);
      
      const children: OrganizationNode[] = [];
      
      // Add child org units
      childOrgUnits.forEach(childOrg => {
        children.push(buildOrgNode(childOrg));
      });
      
      // Add users in this org unit
      usersInOrg.forEach(user => {
        children.push({
          key: `user-${user.id}`,
          title: renderUserNode(user),
          user: user,
          type: 'user' as const,
        });
      });
      
      return {
        key: `org-${orgUnit.id}`,
        title: renderOrgUnitNode(orgUnit),
        orgUnit: orgUnit,
        type: 'orgUnit' as const,
        children: children.length > 0 ? children : undefined
      };
    };

    return rootOrgUnits.map(buildOrgNode);
  };

  const renderOrgUnitNode = (orgUnit: OrgUnit) => {
    return (
      <div className="flex items-center justify-between w-full py-2">
        <div className="flex items-center gap-3">
          <Avatar 
            size="small" 
            icon={<TeamOutlined className="text-green-600" />}
            className="bg-green-100"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-green-700">{orgUnit.name}</span>
              <Tag color="green">{orgUnit.code || '조직'}</Tag>
            </div>
            <div className="text-sm text-gray-500">
              {orgUnit.description}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUserNode = (user: User) => {
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
            icon={getRoleIcon(user.role)}
            src={user.avatar_url}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{user.name}</span>
              <Tag color={getRoleColor(user.role)}>
                {getRoleLabel(user.role)}
              </Tag>
            </div>
            <div className="text-sm text-gray-500">
              {user.title} • {user.employee_profile?.department || '부서미지정'}
              {user.employee_profile?.emp_no && ` • ${user.employee_profile.emp_no}`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <Tooltip title={user.email}>
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
    if (!value || !users) {
      setExpandedKeys(getAllNodeKeys(orgData));
      setSearchValue('');
      setAutoExpandParent(false);
      return;
    }

    const matchingUsers = users
      .filter(user => 
        user.name.toLowerCase().includes(value.toLowerCase()) || 
        (user.title && user.title.toLowerCase().includes(value.toLowerCase())) ||
        (user.employee_profile?.department && user.employee_profile.department.toLowerCase().includes(value.toLowerCase()))
      )
      .map(user => `user-${user.id}`);

    setExpandedKeys(matchingUsers);
    setSearchValue(value);
    setAutoExpandParent(true);
  };

  const getDepartmentStats = () => {
    if (!users) return {};
    
    const departments = users.reduce((acc, user) => {
      const dept = user.employee_profile?.department || '부서미지정';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return departments;
  };

  const departmentStats = getDepartmentStats();

  if (orgUnitsLoading || usersLoading) {
    return (
      <div className="space-y-6">
        <Card title="조직도">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-lg mb-2">조직도를 불러오는 중...</div>
              <div className="text-gray-500">잠시만 기다려주세요.</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

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
            <TeamOutlined className="text-green-600" />
            <Tag color="green">조직</Tag>
            <span className="text-sm text-gray-500">부서/팀 단위</span>
          </div>
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