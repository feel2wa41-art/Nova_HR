import { useState, useEffect } from 'react';
import { Modal, Card, Button, Space, Avatar, Tag, Tree, message, Divider, Radio, Tooltip } from 'antd';
import { UserOutlined, TeamOutlined, ArrowRightOutlined, DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';

interface ApprovalStep {
  id: string;
  order: number;
  approverId: string;
  approverName: string;
  approverTitle: string;
  organizationName: string;
  isRequired: boolean;
}

interface ApprovalSettings {
  id: string;
  type: 'LEAVE' | 'LATE_ATTENDANCE';
  userId: string;
  steps: ApprovalStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalSettingsModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (settings: ApprovalSettings) => void;
  type: 'LEAVE' | 'LATE_ATTENDANCE';
  userId: string;
  existingSettings?: ApprovalSettings;
}

interface Employee {
  id: string;
  name: string;
  title: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

export const ApprovalSettingsModal = ({
  open,
  onCancel,
  onSave,
  type,
  userId,
  existingSettings
}: ApprovalSettingsModalProps) => {
  const [selectedSteps, setSelectedSteps] = useState<ApprovalStep[]>([]);
  const [orgTreeData, setOrgTreeData] = useState<TreeDataNode[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [approvalMode, setApprovalMode] = useState<'auto' | 'manual'>('auto');

  // Mock organization and employee data
  const mockOrganizations = [
    { id: 'org_1', name: 'Nova HR', level: 0, parentId: undefined },
    { id: 'org_2', name: 'IT팀', level: 1, parentId: 'org_1' },
    { id: 'org_3', name: 'HR팀', level: 1, parentId: 'org_1' },
    { id: 'org_4', name: '개발팀', level: 2, parentId: 'org_2' },
    { id: 'org_5', name: '디자인팀', level: 2, parentId: 'org_2' },
    { id: 'org_6', name: '영업팀', level: 1, parentId: 'org_1' },
  ];

  const mockEmployees: Employee[] = [
    {
      id: '3',
      name: '시스템 관리자',
      title: 'IT 관리자',
      organizationId: 'org_2',
      organizationName: 'IT팀',
      role: 'SUPER_ADMIN',
    },
    {
      id: '2',
      name: '김인사',
      title: 'HR 매니저',
      organizationId: 'org_3',
      organizationName: 'HR팀',
      role: 'HR_MANAGER',
    },
    {
      id: '1',
      name: '홍길동',
      title: '시니어 개발자',
      organizationId: 'org_4',
      organizationName: '개발팀',
      role: 'EMPLOYEE',
    },
    {
      id: '4',
      name: '이개발',
      title: '주니어 개발자',
      organizationId: 'org_4',
      organizationName: '개발팀',
      role: 'EMPLOYEE',
    },
    {
      id: '5',
      name: '박디자인',
      title: '시니어 디자이너',
      organizationId: 'org_5',
      organizationName: '디자인팀',
      role: 'EMPLOYEE',
    },
    {
      id: '6',
      name: '최영업',
      title: '영업 담당자',
      organizationId: 'org_6',
      organizationName: '영업팀',
      role: 'EMPLOYEE',
    }
  ];

  useEffect(() => {
    if (open) {
      buildOrganizationTree();
      if (existingSettings) {
        setSelectedSteps(existingSettings.steps);
        setApprovalMode('manual');
      } else {
        // Auto-generate approval steps based on organization hierarchy
        generateAutoApprovalSteps();
      }
    }
  }, [open, existingSettings, userId]);

  const buildOrganizationTree = () => {
    const buildNode = (org: any): TreeDataNode => {
      const childOrgs = mockOrganizations.filter(o => o.parentId === org.id);
      const orgEmployees = mockEmployees.filter(emp => emp.organizationId === org.id);
      
      const children: TreeDataNode[] = [];
      
      // Add child organizations
      childOrgs.forEach(childOrg => {
        children.push(buildNode(childOrg));
      });
      
      // Add employees
      orgEmployees.forEach(emp => {
        if (emp.id !== userId) { // Exclude current user
          children.push({
            key: `emp_${emp.id}`,
            title: renderEmployeeNode(emp),
            isLeaf: true,
            selectable: true,
          });
        }
      });

      return {
        key: `org_${org.id}`,
        title: renderOrgNode(org),
        children: children.length > 0 ? children : undefined,
        selectable: false,
      };
    };

    const rootOrgs = mockOrganizations.filter(org => org.level === 0);
    const treeData = rootOrgs.map(buildNode);
    setOrgTreeData(treeData);
  };

  const renderOrgNode = (org: any) => (
    <div className="flex items-center gap-2 py-1">
      <TeamOutlined className="text-blue-500" />
      <span className="font-medium text-blue-800">{org.name}</span>
      <Tag color="blue" size="small">Level {org.level}</Tag>
    </div>
  );

  const renderEmployeeNode = (emp: Employee) => {
    const getRoleColor = (role: string) => {
      switch (role) {
        case 'SUPER_ADMIN':
          return 'purple';
        case 'HR_MANAGER':
          return 'orange';
        default:
          return 'green';
      }
    };

    const isSelected = selectedApprovers.includes(emp.id);

    return (
      <div 
        className={`flex items-center justify-between w-full py-2 px-2 rounded cursor-pointer hover:bg-blue-50 ${
          isSelected ? 'bg-blue-100 border border-blue-300' : ''
        }`}
        onClick={() => handleEmployeeSelect(emp)}
      >
        <div className="flex items-center gap-3">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{emp.name}</span>
              <Tag color={getRoleColor(emp.role)} size="small">
                {emp.role === 'SUPER_ADMIN' ? '관리자' : emp.role === 'HR_MANAGER' ? 'HR' : '직원'}
              </Tag>
            </div>
            <div className="text-sm text-gray-500">{emp.title}</div>
          </div>
        </div>
        {isSelected && (
          <Tag color="blue" size="small">
            {selectedSteps.findIndex(step => step.approverId === emp.id) + 1}순위
          </Tag>
        )}
      </div>
    );
  };

  const handleEmployeeSelect = (emp: Employee) => {
    if (selectedApprovers.includes(emp.id)) {
      // Remove from selection
      setSelectedApprovers(prev => prev.filter(id => id !== emp.id));
      setSelectedSteps(prev => prev.filter(step => step.approverId !== emp.id));
    } else {
      // Add to selection
      const newStep: ApprovalStep = {
        id: `step_${Date.now()}`,
        order: selectedSteps.length + 1,
        approverId: emp.id,
        approverName: emp.name,
        approverTitle: emp.title,
        organizationName: emp.organizationName,
        isRequired: true,
      };
      
      setSelectedApprovers(prev => [...prev, emp.id]);
      setSelectedSteps(prev => [...prev, newStep]);
    }
  };

  const generateAutoApprovalSteps = () => {
    // Get current user's organization and find managers up the hierarchy
    const currentUser = mockEmployees.find(emp => emp.id === userId);
    if (!currentUser) return;

    const steps: ApprovalStep[] = [];
    let order = 1;

    // Find immediate manager in the same organization with higher role
    const immediateManagers = mockEmployees.filter(emp => 
      emp.organizationId === currentUser.organizationId && 
      emp.id !== userId &&
      (emp.role === 'HR_MANAGER' || emp.role === 'SUPER_ADMIN')
    );

    immediateManagers.forEach(manager => {
      steps.push({
        id: `step_${order}`,
        order: order++,
        approverId: manager.id,
        approverName: manager.name,
        approverTitle: manager.title,
        organizationName: manager.organizationName,
        isRequired: true,
      });
    });

    // Add HR team manager if not already included
    const hrManager = mockEmployees.find(emp => 
      emp.organizationName === 'HR팀' && emp.role === 'HR_MANAGER'
    );
    
    if (hrManager && !steps.some(step => step.approverId === hrManager.id)) {
      steps.push({
        id: `step_${order}`,
        order: order++,
        approverId: hrManager.id,
        approverName: hrManager.name,
        approverTitle: hrManager.title,
        organizationName: hrManager.organizationName,
        isRequired: true,
      });
    }

    setSelectedSteps(steps);
    setSelectedApprovers(steps.map(step => step.approverId));
  };

  const moveStepUp = (stepId: string) => {
    const stepIndex = selectedSteps.findIndex(step => step.id === stepId);
    if (stepIndex > 0) {
      const newSteps = [...selectedSteps];
      [newSteps[stepIndex - 1], newSteps[stepIndex]] = [newSteps[stepIndex], newSteps[stepIndex - 1]];
      
      // Update order numbers
      newSteps.forEach((step, index) => {
        step.order = index + 1;
      });
      
      setSelectedSteps(newSteps);
    }
  };

  const moveStepDown = (stepId: string) => {
    const stepIndex = selectedSteps.findIndex(step => step.id === stepId);
    if (stepIndex < selectedSteps.length - 1) {
      const newSteps = [...selectedSteps];
      [newSteps[stepIndex], newSteps[stepIndex + 1]] = [newSteps[stepIndex + 1], newSteps[stepIndex]];
      
      // Update order numbers
      newSteps.forEach((step, index) => {
        step.order = index + 1;
      });
      
      setSelectedSteps(newSteps);
    }
  };

  const removeStep = (stepId: string) => {
    const step = selectedSteps.find(s => s.id === stepId);
    if (step) {
      setSelectedSteps(prev => prev.filter(s => s.id !== stepId));
      setSelectedApprovers(prev => prev.filter(id => id !== step.approverId));
    }
  };

  const handleSave = () => {
    if (selectedSteps.length === 0) {
      message.warning('최소 1명의 승인자를 선택해주세요.');
      return;
    }

    const settings: ApprovalSettings = {
      id: existingSettings?.id || `approval_${Date.now()}`,
      type,
      userId,
      steps: selectedSteps.map((step, index) => ({
        ...step,
        order: index + 1,
      })),
      isActive: true,
      createdAt: existingSettings?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(settings);
    message.success('승인자 설정이 저장되었습니다.');
  };

  const getTitle = () => {
    return type === 'LEAVE' ? '휴가 승인자 설정' : '지각 승인자 설정';
  };

  return (
    <Modal
      title={getTitle()}
      open={open}
      onCancel={onCancel}
      width={900}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-6">
        {/* Approval Mode Selection */}
        <Card size="small" title="승인자 설정 방식">
          <Radio.Group
            value={approvalMode}
            onChange={(e) => {
              setApprovalMode(e.target.value);
              if (e.target.value === 'auto') {
                generateAutoApprovalSteps();
              }
            }}
          >
            <Space direction="vertical">
              <Radio value="auto">
                자동 설정 (조직도 기반 상급자 자동 선택)
              </Radio>
              <Radio value="manual">
                수동 설정 (직접 승인자 선택)
              </Radio>
            </Space>
          </Radio.Group>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          {/* Organization Tree */}
          {approvalMode === 'manual' && (
            <Card title="조직도에서 승인자 선택" size="small">
              <div className="max-h-96 overflow-y-auto">
                <Tree
                  treeData={orgTreeData}
                  defaultExpandAll
                  showIcon={false}
                />
              </div>
            </Card>
          )}

          {/* Selected Approval Steps */}
          <Card 
            title={
              <div className="flex items-center gap-2">
                <SettingOutlined />
                승인 순서 ({selectedSteps.length}단계)
              </div>
            } 
            size="small"
            className={approvalMode === 'manual' ? '' : 'col-span-2'}
          >
            <div className="space-y-3">
              {selectedSteps.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  승인자를 선택해주세요
                </div>
              ) : (
                selectedSteps.map((step, index) => (
                  <div key={step.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                          {step.order}
                        </div>
                        <Avatar size="small" icon={<UserOutlined />} />
                        <div>
                          <div className="font-medium">{step.approverName}</div>
                          <div className="text-sm text-gray-500">
                            {step.approverTitle} • {step.organizationName}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Tooltip title="위로 이동">
                          <Button
                            type="text"
                            size="small"
                            onClick={() => moveStepUp(step.id)}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                        </Tooltip>
                        <Tooltip title="아래로 이동">
                          <Button
                            type="text"
                            size="small"
                            onClick={() => moveStepDown(step.id)}
                            disabled={index === selectedSteps.length - 1}
                          >
                            ↓
                          </Button>
                        </Tooltip>
                        <Tooltip title="제거">
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeStep(step.id)}
                          />
                        </Tooltip>
                      </div>
                    </div>
                    
                    {index < selectedSteps.length - 1 && (
                      <div className="flex justify-center mt-2">
                        <ArrowRightOutlined className="text-gray-400 rotate-90" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Summary */}
        {selectedSteps.length > 0 && (
          <Card size="small" className="bg-blue-50">
            <div className="text-sm text-blue-800">
              <strong>승인 프로세스 요약:</strong>
              <div className="mt-2">
                {selectedSteps.map((step, index) => (
                  <span key={step.id}>
                    {step.approverName}
                    {index < selectedSteps.length - 1 && ' → '}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-blue-600">
                총 {selectedSteps.length}단계 승인 과정이 필요합니다.
              </div>
            </div>
          </Card>
        )}

        <Divider />

        {/* Footer Actions */}
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>
            취소
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            disabled={selectedSteps.length === 0}
          >
            저장
          </Button>
        </div>
      </div>
    </Modal>
  );
};