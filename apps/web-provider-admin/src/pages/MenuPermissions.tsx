import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Switch, 
  Button, 
  message, 
  Spin, 
  Select,
  Space,
  Typography,
  Alert,
  Tag,
  Tooltip
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  EyeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { apiClient } from '../lib/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface MenuPermission {
  id: string;
  config_id: string;
  role: string;
  menu_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  scope: string;
  custom_rules?: any;
}

const MenuPermissionsPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<MenuPermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [hasChanges, setHasChanges] = useState(false);

  const roles = [
    { value: 'ALL', label: 'All Roles' },
    { value: 'ADMIN', label: 'Admin', color: 'red' },
    { value: 'HR_MANAGER', label: 'HR Manager', color: 'orange' },
    { value: 'TEAM_LEADER', label: 'Team Leader', color: 'blue' },
    { value: 'EMPLOYEE', label: 'Employee', color: 'green' }
  ];

  const menus = [
    { key: 'attendance', name: 'Attendance', icon: '📅' },
    { key: 'leave', name: 'Leave', icon: '🏖️' },
    { key: 'approval', name: 'Approval', icon: '✅' },
    { key: 'hr_community', name: 'HR Community', icon: '👥' },
    { key: 'calendar', name: 'Calendar', icon: '📆' },
    { key: 'reports', name: 'Reports', icon: '📊' },
    { key: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  const scopes = [
    { value: 'SELF', label: 'Self Only', color: 'default' },
    { value: 'TEAM', label: 'Team', color: 'blue' },
    { value: 'DEPARTMENT', label: 'Department', color: 'orange' },
    { value: 'COMPANY', label: 'Company', color: 'green' }
  ];

  useEffect(() => {
    fetchMenuPermissions();
  }, [companyId, selectedRole]);

  const fetchMenuPermissions = async () => {
    try {
      setLoading(true);
      const params = selectedRole !== 'ALL' ? `?role=${selectedRole}` : '';
      const response = await apiClient.get(`/feature-config/company/${companyId}/menu-permissions${params}`);
      setPermissions(response.data);
      setOriginalPermissions(JSON.parse(JSON.stringify(response.data)));
      setHasChanges(false);
    } catch (error) {
      message.error('Failed to load menu permissions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (id: string, field: string, value: any) => {
    const updatedPermissions = permissions.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    setPermissions(updatedPermissions);
    
    // Check if there are changes
    const hasChanges = JSON.stringify(updatedPermissions) !== JSON.stringify(originalPermissions);
    setHasChanges(hasChanges);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const changedPermissions = permissions.filter((p, index) => {
        const original = originalPermissions[index];
        return JSON.stringify(p) !== JSON.stringify(original);
      });

      const permissionsToUpdate = changedPermissions.map(p => ({
        role: p.role,
        menu_key: p.menu_key,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_approve: p.can_approve,
        can_export: p.can_export,
        scope: p.scope,
        custom_rules: p.custom_rules
      }));

      await apiClient.put(`/feature-config/company/${companyId}/menu-permissions`, {
        permissions: permissionsToUpdate
      });
      
      message.success('Menu permissions saved successfully');
      await fetchMenuPermissions();
    } catch (error) {
      message.error('Failed to save menu permissions');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Menu',
      dataIndex: 'menu_key',
      key: 'menu_key',
      fixed: 'left' as const,
      width: 150,
      render: (menu_key: string) => {
        const menu = menus.find(m => m.key === menu_key);
        return (
          <Space>
            <span>{menu?.icon}</span>
            <Text strong>{menu?.name || menu_key}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => {
        const roleConfig = roles.find(r => r.value === role);
        return <Tag color={roleConfig?.color}>{roleConfig?.label}</Tag>;
      }
    },
    {
      title: <Tooltip title="View Permission"><EyeOutlined /></Tooltip>,
      dataIndex: 'can_view',
      key: 'can_view',
      width: 80,
      align: 'center' as const,
      render: (value: boolean, record: MenuPermission) => (
        <Switch
          size="small"
          checked={value}
          onChange={(checked) => handlePermissionChange(record.id, 'can_view', checked)}
        />
      )
    },
    {
      title: <Tooltip title="Create Permission"><PlusOutlined /></Tooltip>,
      dataIndex: 'can_create',
      key: 'can_create',
      width: 80,
      align: 'center' as const,
      render: (value: boolean, record: MenuPermission) => (
        <Switch
          size="small"
          checked={value}
          onChange={(checked) => handlePermissionChange(record.id, 'can_create', checked)}
        />
      )
    },
    {
      title: <Tooltip title="Edit Permission"><EditOutlined /></Tooltip>,
      dataIndex: 'can_edit',
      key: 'can_edit',
      width: 80,
      align: 'center' as const,
      render: (value: boolean, record: MenuPermission) => (
        <Switch
          size="small"
          checked={value}
          onChange={(checked) => handlePermissionChange(record.id, 'can_edit', checked)}
        />
      )
    },
    {
      title: <Tooltip title="Delete Permission"><DeleteOutlined /></Tooltip>,
      dataIndex: 'can_delete',
      key: 'can_delete',
      width: 80,
      align: 'center' as const,
      render: (value: boolean, record: MenuPermission) => (
        <Switch
          size="small"
          checked={value}
          onChange={(checked) => handlePermissionChange(record.id, 'can_delete', checked)}
        />
      )
    },
    {
      title: <Tooltip title="Approve Permission"><CheckOutlined /></Tooltip>,
      dataIndex: 'can_approve',
      key: 'can_approve',
      width: 80,
      align: 'center' as const,
      render: (value: boolean, record: MenuPermission) => (
        <Switch
          size="small"
          checked={value}
          onChange={(checked) => handlePermissionChange(record.id, 'can_approve', checked)}
        />
      )
    },
    {
      title: <Tooltip title="Export Permission"><ExportOutlined /></Tooltip>,
      dataIndex: 'can_export',
      key: 'can_export',
      width: 80,
      align: 'center' as const,
      render: (value: boolean, record: MenuPermission) => (
        <Switch
          size="small"
          checked={value}
          onChange={(checked) => handlePermissionChange(record.id, 'can_export', checked)}
        />
      )
    },
    {
      title: 'Scope',
      dataIndex: 'scope',
      key: 'scope',
      width: 150,
      render: (scope: string, record: MenuPermission) => (
        <Select
          size="small"
          value={scope}
          style={{ width: '100%' }}
          onChange={(value) => handlePermissionChange(record.id, 'scope', value)}
        >
          {scopes.map(s => (
            <Option key={s.value} value={s.value}>
              <Tag color={s.color}>{s.label}</Tag>
            </Option>
          ))}
        </Select>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate('/companies')}
            >
              Back
            </Button>
            <Title level={3} style={{ margin: 0 }}>Menu Permissions</Title>
          </Space>
          <Space>
            <Select
              value={selectedRole}
              style={{ width: 150 }}
              onChange={setSelectedRole}
            >
              {roles.map(role => (
                <Option key={role.value} value={role.value}>
                  {role.label}
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
          </Space>
        </div>

        <Alert
          message="Permission Guide"
          description={
            <Space direction="vertical">
              <Text>• View: Can see the menu and access the page</Text>
              <Text>• Create: Can create new records</Text>
              <Text>• Edit: Can modify existing records</Text>
              <Text>• Delete: Can remove records</Text>
              <Text>• Approve: Can approve requests (for approval workflows)</Text>
              <Text>• Export: Can export data to files</Text>
              <Text>• Scope: Determines data access level (Self/Team/Department/Company)</Text>
            </Space>
          }
          type="info"
          showIcon
        />

        <Card>
          <Table
            columns={columns}
            dataSource={permissions}
            rowKey="id"
            pagination={false}
            scroll={{ x: 1200 }}
            size="small"
          />
        </Card>
      </Space>
    </div>
  );
};

export default MenuPermissionsPage;