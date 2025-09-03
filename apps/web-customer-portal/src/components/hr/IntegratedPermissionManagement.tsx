import { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Tree, 
  Checkbox, 
  Space, 
  message, 
  Tag, 
  Table,
  Descriptions,
  Steps,
  Alert,
  Typography
} from 'antd';
import { 
  SettingOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  FolderOutlined,
  FileOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';

const { Title, Text } = Typography;
const { Step } = Steps;

// 메뉴 권한 인터페이스
interface MenuPermission {
  id: string;
  name: string;           // 권한명 (예: "휴가관리자권한")
  displayName: string;    // 표시명 (예: "휴가 관리자")
  description: string;    // 설명
  menuTree: MenuTreeNode[];
  createdAt: string;
  updatedAt: string;
}

// 메뉴 트리 노드
interface MenuTreeNode {
  key: string;
  title: string;
  children?: MenuTreeNode[];
  permissions: {
    read: boolean;    // 조회
    write: boolean;   // 저장
    delete: boolean;  // 삭제
  };
}

// 시스템 메뉴 구조
const SYSTEM_MENU_TREE: MenuTreeNode[] = [
  {
    key: 'dashboard',
    title: '대시보드',
    permissions: { read: true, write: false, delete: false },
  },
  {
    key: 'attendance',
    title: '출퇴근 관리',
    permissions: { read: false, write: false, delete: false },
    children: [
      {
        key: 'attendance-view',
        title: '출퇴근 현황',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'attendance-manage',
        title: '출퇴근 승인',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'attendance-reports',
        title: '출퇴근 리포트',
        permissions: { read: false, write: false, delete: false },
      },
    ],
  },
  {
    key: 'leave',
    title: '휴가 관리',
    permissions: { read: false, write: false, delete: false },
    children: [
      {
        key: 'leave-apply',
        title: '휴가 신청',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'leave-approve',
        title: '휴가 승인',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'leave-calendar',
        title: '휴가 캘린더',
        permissions: { read: false, write: false, delete: false },
      },
    ],
  },
  {
    key: 'approval',
    title: '전자결재',
    permissions: { read: false, write: false, delete: false },
    children: [
      {
        key: 'approval-inbox',
        title: '결재함',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'approval-draft',
        title: '기안함',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'approval-template',
        title: '결재양식 관리',
        permissions: { read: false, write: false, delete: false },
      },
    ],
  },
  {
    key: 'user',
    title: '사용자 관리',
    permissions: { read: false, write: false, delete: false },
    children: [
      {
        key: 'user-list',
        title: '사용자 목록',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'user-roles',
        title: '역할 관리',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'organization',
        title: '조직도 관리',
        permissions: { read: false, write: false, delete: false },
      },
    ],
  },
  {
    key: 'system',
    title: '시스템 관리',
    permissions: { read: false, write: false, delete: false },
    children: [
      {
        key: 'system-settings',
        title: '시스템 설정',
        permissions: { read: false, write: false, delete: false },
      },
      {
        key: 'system-logs',
        title: '시스템 로그',
        permissions: { read: false, write: false, delete: false },
      },
    ],
  },
];

export const IntegratedPermissionManagement = () => {
  const [permissions, setPermissions] = useState<MenuPermission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<MenuPermission | null>(null);
  const [viewingPermission, setViewingPermission] = useState<MenuPermission | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  
  // 메뉴 트리 상태
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = () => {
    const stored = localStorage.getItem('nova_hr_integrated_permissions');
    if (stored) {
      setPermissions(JSON.parse(stored));
    } else {
      // 기본 권한 템플릿
      const defaultPermissions: MenuPermission[] = [
        {
          id: 'system_admin',
          name: '시스템관리자권한',
          displayName: '시스템 관리자',
          description: '모든 설정 및 메뉴의 저장/수정/삭제를 통괄하는 최고 권한',
          menuTree: JSON.parse(JSON.stringify(SYSTEM_MENU_TREE)).map((menu: MenuTreeNode) => {
            // 모든 메뉴에 대해 전체 권한 부여
            const setFullPermissions = (node: MenuTreeNode): MenuTreeNode => {
              const updated = {
                ...node,
                permissions: { read: true, write: true, delete: true }
              };
              if (updated.children) {
                updated.children = updated.children.map(setFullPermissions);
              }
              return updated;
            };
            return setFullPermissions(menu);
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'basic_employee',
          name: '기본직원권한',
          displayName: '기본 직원',
          description: '일반 직원이 사용할 수 있는 기본 기능만 포함',
          menuTree: [
            {
              key: 'dashboard',
              title: '대시보드',
              permissions: { read: true, write: false, delete: false },
            },
            {
              key: 'leave',
              title: '휴가 관리',
              permissions: { read: false, write: false, delete: false },
              children: [
                {
                  key: 'leave-apply',
                  title: '휴가 신청',
                  permissions: { read: true, write: true, delete: false },
                },
                {
                  key: 'leave-calendar',
                  title: '휴가 캘린더',
                  permissions: { read: true, write: false, delete: false },
                },
              ],
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'hr_manager',
          name: '휴가관리자권한',
          displayName: '휴가 관리자',
          description: '휴가 관련 모든 기능을 사용할 수 있는 권한',
          menuTree: [
            {
              key: 'dashboard',
              title: '대시보드',
              permissions: { read: true, write: false, delete: false },
            },
            {
              key: 'leave',
              title: '휴가 관리',
              permissions: { read: true, write: true, delete: true },
              children: [
                {
                  key: 'leave-apply',
                  title: '휴가 신청',
                  permissions: { read: true, write: true, delete: true },
                },
                {
                  key: 'leave-approve',
                  title: '휴가 승인',
                  permissions: { read: true, write: true, delete: false },
                },
                {
                  key: 'leave-calendar',
                  title: '휴가 캘린더',
                  permissions: { read: true, write: true, delete: false },
                },
              ],
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setPermissions(defaultPermissions);
      localStorage.setItem('nova_hr_integrated_permissions', JSON.stringify(defaultPermissions));
    }
  };

  const savePermissions = (newPermissions: MenuPermission[]) => {
    setPermissions(newPermissions);
    localStorage.setItem('nova_hr_integrated_permissions', JSON.stringify(newPermissions));
  };

  const handleCreate = () => {
    setEditingPermission(null);
    form.resetFields();
    setMenuTree(JSON.parse(JSON.stringify(SYSTEM_MENU_TREE)));
    setCurrentStep(0);
    setExpandedKeys([]);
    setIsModalOpen(true);
  };

  const handleEdit = (permission: MenuPermission) => {
    setEditingPermission(permission);
    form.setFieldsValue({
      name: permission.name,
      displayName: permission.displayName,
      description: permission.description,
    });
    setMenuTree(JSON.parse(JSON.stringify(permission.menuTree)));
    setCurrentStep(0);
    setExpandedKeys([]);
    setIsModalOpen(true);
  };

  const handleView = (permission: MenuPermission) => {
    setViewingPermission(permission);
    setViewModalOpen(true);
  };

  const handleNextStep = async () => {
    if (currentStep === 0) {
      // 1단계: 기본 정보 검증
      try {
        await form.validateFields(['name', 'displayName', 'description']);
        setCurrentStep(1);
      } catch (error) {
        message.error('필수 정보를 입력해주세요.');
      }
    } else if (currentStep === 1) {
      // 2단계: 메뉴 선택 검증
      const hasSelectedMenus = hasAnyPermissions(menuTree);
      if (!hasSelectedMenus) {
        message.error('최소 하나의 메뉴 권한을 선택해주세요.');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const hasAnyPermissions = (nodes: MenuTreeNode[]): boolean => {
    return nodes.some(node => 
      node.permissions.read || node.permissions.write || node.permissions.delete ||
      (node.children && hasAnyPermissions(node.children))
    );
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const permissionData: MenuPermission = {
        id: editingPermission?.id || `perm_${Date.now()}`,
        name: values.name,
        displayName: values.displayName,
        description: values.description,
        menuTree: menuTree.filter(node => hasNodePermissions(node)),
        createdAt: editingPermission?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let updatedPermissions;
      if (editingPermission) {
        updatedPermissions = permissions.map(p => 
          p.id === editingPermission.id ? permissionData : p
        );
      } else {
        // 권한명 중복 확인
        if (permissions.some(p => p.name === permissionData.name)) {
          message.error('이미 존재하는 권한명입니다.');
          return;
        }
        updatedPermissions = [...permissions, permissionData];
      }

      savePermissions(updatedPermissions);
      setIsModalOpen(false);
      message.success('권한이 저장되었습니다.');
    } catch (error) {
      message.error('저장 중 오류가 발생했습니다.');
    }
  };

  const hasNodePermissions = (node: MenuTreeNode): boolean => {
    const hasOwnPermission = node.permissions.read || node.permissions.write || node.permissions.delete;
    const hasChildPermissions = node.children?.some(child => hasNodePermissions(child)) || false;
    return hasOwnPermission || hasChildPermissions;
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

  // 메뉴 권한 변경 핸들러
  const handlePermissionChange = (
    nodeKey: string, 
    permissionType: 'read' | 'write' | 'delete', 
    checked: boolean,
    nodes: MenuTreeNode[] = menuTree
  ) => {
    const updateNode = (nodes: MenuTreeNode[]): MenuTreeNode[] => {
      return nodes.map(node => {
        if (node.key === nodeKey) {
          return {
            ...node,
            permissions: {
              ...node.permissions,
              [permissionType]: checked
            }
          };
        }
        if (node.children) {
          return {
            ...node,
            children: updateNode(node.children)
          };
        }
        return node;
      });
    };

    setMenuTree(updateNode(nodes));
  };

  // 트리 렌더링
  const renderTreeNode = (nodes: MenuTreeNode[], level = 0): DataNode[] => {
    return nodes.map(node => ({
      key: node.key,
      title: (
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center">
            {node.children ? <FolderOutlined /> : <FileOutlined />}
            <span className="ml-2">{node.title}</span>
          </div>
          <div className="flex gap-2">
            <Checkbox
              checked={node.permissions.read}
              onChange={(e) => handlePermissionChange(node.key, 'read', e.target.checked)}
            >
              조회
            </Checkbox>
            <Checkbox
              checked={node.permissions.write}
              onChange={(e) => handlePermissionChange(node.key, 'write', e.target.checked)}
            >
              저장
            </Checkbox>
            <Checkbox
              checked={node.permissions.delete}
              onChange={(e) => handlePermissionChange(node.key, 'delete', e.target.checked)}
            >
              삭제
            </Checkbox>
          </div>
        </div>
      ),
      children: node.children ? renderTreeNode(node.children, level + 1) : undefined,
    }));
  };

  // 권한 요약 생성
  const generatePermissionSummary = (nodes: MenuTreeNode[], depth = 0): string[] => {
    const summary: string[] = [];
    
    nodes.forEach(node => {
      const permissions = [];
      if (node.permissions.read) permissions.push('조회');
      if (node.permissions.write) permissions.push('저장');
      if (node.permissions.delete) permissions.push('삭제');
      
      if (permissions.length > 0) {
        const indent = '  '.repeat(depth);
        summary.push(`${indent}${node.title}: ${permissions.join(', ')}`);
      }
      
      if (node.children) {
        summary.push(...generatePermissionSummary(node.children, depth + 1));
      }
    });
    
    return summary;
  };

  const columns: ColumnsType<MenuPermission> = [
    {
      title: '권한명',
      key: 'permission',
      render: (_, record) => (
        <div>
          <div className="font-medium text-lg">{record.displayName}</div>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{record.name}</code>
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
      title: '포함 기능',
      key: 'summary',
      render: (_, record) => {
        const summary = generatePermissionSummary(record.menuTree);
        const displaySummary = summary.slice(0, 3);
        return (
          <div>
            {displaySummary.map((item, index) => (
              <Tag key={index} className="mb-1">{item.trim()}</Tag>
            ))}
            {summary.length > 3 && (
              <Text type="secondary">... 외 {summary.length - 3}개</Text>
            )}
          </div>
        );
      },
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('ko-KR'),
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
            통합 권한 관리
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            권한 생성
          </Button>
        }
      >
        <Alert
          message="메뉴 기반 권한 설정"
          description="권한명을 설정하고 메뉴 트리에서 필요한 기능을 선택하여 직관적으로 권한을 관리할 수 있습니다."
          type="info"
          showIcon
          className="mb-4"
        />
        
        <Table
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 권한 생성/편집 모달 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SettingOutlined />
            {editingPermission ? "권한 편집" : "권한 생성"}
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={900}
        style={{ top: 20 }}
      >
        <div className="mb-6">
          <Steps current={currentStep} size="small">
            <Step title="기본 정보" description="권한명 및 설명" />
            <Step title="메뉴 선택" description="메뉴별 권한 설정" />
            <Step title="확인" description="설정 내용 확인" />
          </Steps>
        </div>

        <Form form={form} layout="vertical">
          {/* 1단계: 기본 정보 */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <Alert
                message="1단계: 기본 정보"
                description="새로운 권한의 기본 정보를 입력해주세요."
                type="info"
                showIcon
              />
              
              <Form.Item
                label="권한명 (시스템 내부용)"
                name="name"
                rules={[
                  { required: true, message: '권한명을 입력해주세요' },
                  { pattern: /^[a-zA-Z가-힣0-9_]+$/, message: '영문, 한글, 숫자, 밑줄(_)만 사용 가능합니다' }
                ]}
              >
                <Input 
                  placeholder="예: 휴가관리자권한" 
                  disabled={!!editingPermission}
                  suffix={<Text type="secondary">영문, 한글, 숫자, _ 만 사용</Text>}
                />
              </Form.Item>

              <Form.Item
                label="표시명"
                name="displayName"
                rules={[{ required: true, message: '표시명을 입력해주세요' }]}
              >
                <Input placeholder="예: 휴가 관리자" />
              </Form.Item>

              <Form.Item
                label="설명"
                name="description"
                rules={[{ required: true, message: '설명을 입력해주세요' }]}
              >
                <Input.TextArea 
                  rows={3} 
                  placeholder="이 권한의 용도와 대상을 설명해주세요" 
                />
              </Form.Item>
            </div>
          )}

          {/* 2단계: 메뉴 선택 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Alert
                message="2단계: 메뉴 권한 설정"
                description="메뉴 트리에서 필요한 기능을 선택하고 각 기능별로 조회, 저장, 삭제 권한을 설정해주세요."
                type="info"
                showIcon
              />
              
              <div className="border rounded p-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Tree
                  showLine
                  defaultExpandAll
                  expandedKeys={expandedKeys}
                  onExpand={(keys) => setExpandedKeys(keys as string[])}
                  treeData={renderTreeNode(menuTree)}
                />
              </div>
              
              <Alert
                message="권한 설명"
                description="조회: 해당 메뉴를 볼 수 있는 권한 | 저장: 데이터를 생성/수정할 수 있는 권한 | 삭제: 데이터를 삭제할 수 있는 권한"
                type="info"
              />
            </div>
          )}

          {/* 3단계: 확인 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <Alert
                message="3단계: 설정 내용 확인"
                description="아래 내용을 확인하고 저장해주세요."
                type="success"
                showIcon
              />
              
              <Descriptions column={1} bordered>
                <Descriptions.Item label="권한명">
                  <code>{form.getFieldValue('name')}</code>
                </Descriptions.Item>
                <Descriptions.Item label="표시명">
                  {form.getFieldValue('displayName')}
                </Descriptions.Item>
                <Descriptions.Item label="설명">
                  {form.getFieldValue('description')}
                </Descriptions.Item>
                <Descriptions.Item label="포함 기능">
                  <div className="space-y-2">
                    {generatePermissionSummary(menuTree).map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircleOutlined className="text-green-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </Descriptions.Item>
              </Descriptions>
              
              <Alert
                message="최종 권한명"
                description={`"${form.getFieldValue('displayName')}" - ${generatePermissionSummary(menuTree).length}개 기능 사용`}
                type="success"
                showIcon
              />
            </div>
          )}
        </Form>

        {/* 모달 푸터 */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <div>
            {currentStep > 0 && (
              <Button onClick={handlePrevStep}>
                이전
              </Button>
            )}
          </div>
          
          <Space>
            <Button onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            
            {currentStep < 2 ? (
              <Button type="primary" onClick={handleNextStep}>
                다음
              </Button>
            ) : (
              <Button type="primary" onClick={handleSave}>
                저장
              </Button>
            )}
          </Space>
        </div>
      </Modal>

      {/* 상세 보기 모달 */}
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
          <div className="space-y-4">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="권한명">
                <code>{viewingPermission.name}</code>
              </Descriptions.Item>
              <Descriptions.Item label="표시명">
                {viewingPermission.displayName}
              </Descriptions.Item>
              <Descriptions.Item label="설명">
                {viewingPermission.description}
              </Descriptions.Item>
              <Descriptions.Item label="생성일">
                {new Date(viewingPermission.createdAt).toLocaleString('ko-KR')}
              </Descriptions.Item>
              <Descriptions.Item label="수정일">
                {new Date(viewingPermission.updatedAt).toLocaleString('ko-KR')}
              </Descriptions.Item>
            </Descriptions>
            
            <div>
              <Title level={5}>포함된 기능</Title>
              <div className="bg-gray-50 p-4 rounded">
                {generatePermissionSummary(viewingPermission.menuTree).map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <CheckCircleOutlined className="text-green-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Alert
              message="권한 요약"
              description={`"${viewingPermission.displayName}" - ${generatePermissionSummary(viewingPermission.menuTree).length}개 기능 사용 가능`}
              type="info"
              showIcon
            />
          </div>
        )}
      </Modal>
    </div>
  );
};