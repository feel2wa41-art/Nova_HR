import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Card, Button, Space, Avatar, Tag, Tree, message, Divider, Radio, Tooltip, Tabs, Select, Typography, Row, Col, List, Empty } from 'antd';
import { UserOutlined, TeamOutlined, ArrowRightOutlined, DeleteOutlined, PlusOutlined, SettingOutlined, SwapOutlined, CheckCircleOutlined, SaveOutlined, FileTextOutlined, UserSwitchOutlined, CrownOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, approvalApi } from '../../lib/api';

interface ApprovalStep {
  id: string;
  order: number;
  approverId: string;
  approverName: string;
  approverTitle: string;
  organizationName: string;
  type: 'COOPERATION' | 'APPROVAL' | 'REFERENCE' | 'RECEPTION' | 'CIRCULATION';
  isRequired: boolean;
  finalOrder?: number;
}

interface ApprovalRoute {
  id: string;
  type: 'APPROVAL';
  userId: string;
  steps: ApprovalStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalRouteModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (route: ApprovalRoute) => void;
  userId: string;
  existingRoute?: ApprovalRoute;
}

interface Employee {
  id: string;
  name: string;
  title: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

export const ApprovalRouteModal = ({
  open,
  onCancel,
  onSave,
  userId,
  existingRoute
}: ApprovalRouteModalProps) => {
  const [selectedSteps, setSelectedSteps] = useState<ApprovalStep[]>([]);
  const [orgTreeData, setOrgTreeData] = useState<TreeDataNode[]>([]);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [approvalMode, setApprovalMode] = useState<'auto' | 'manual' | 'template'>('template');
  const [showRoleSelector, setShowRoleSelector] = useState<string | null>(null);
  const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null);
  const [finalApprovalOrder, setFinalApprovalOrder] = useState<ApprovalStep[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const queryClient = useQueryClient();

  // Fetch users from API
  const { data: users = [], isLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
    enabled: open,
    retry: 2
  });

  useEffect(() => {
    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      message.error('사용자 정보를 불러오는데 실패했습니다.');
    }
  }, [usersError]);

  // Fetch user's personal approval route templates
  const { data: userTemplates = [], error: userTemplatesError } = useQuery({
    queryKey: ['userApprovalRoutes', userId],
    queryFn: () => approvalApi.getUserApprovalRoutes ? approvalApi.getUserApprovalRoutes() : Promise.resolve([]),
    enabled: open,
    retry: 2
  });

  useEffect(() => {
    if (userTemplatesError) {
      console.error('Failed to fetch user templates:', userTemplatesError);
    }
  }, [userTemplatesError]);

  // Fetch admin-configured approval route templates
  const { data: adminTemplates = [], error: adminTemplatesError } = useQuery({
    queryKey: ['adminApprovalTemplates'],
    queryFn: () => approvalApi.getAdminApprovalTemplates ? approvalApi.getAdminApprovalTemplates() : Promise.resolve([]),
    enabled: open,
    retry: 2
  });

  useEffect(() => {
    if (adminTemplatesError) {
      console.error('Failed to fetch admin templates:', adminTemplatesError);
    }
  }, [adminTemplatesError]);

  // Save user template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: (data: any) => approvalApi.saveUserApprovalRoute ? approvalApi.saveUserApprovalRoute(data) : Promise.reject('Method not implemented')
  });

  useEffect(() => {
    if (saveTemplateMutation.isSuccess) {
      message.success('결재선 템플릿이 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['userApprovalRoutes'] });
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
    }
  }, [saveTemplateMutation.isSuccess, queryClient]);

  useEffect(() => {
    if (saveTemplateMutation.isError) {
      message.error('템플릿 저장에 실패했습니다.');
    }
  }, [saveTemplateMutation.isError]);

  // Transform API users to Employee interface format (memoized to prevent infinite re-renders)
  const employees: Employee[] = useMemo(() => {
    console.log('Transforming users to employees:', {
      usersLength: users.length,
      rawUsers: users
    });
    
    const transformed = users.map(user => ({
      id: user.id,
      name: user.name,
      title: user.title || '',
      organizationId: user.employee_profile?.department || 'unknown',
      organizationName: user.employee_profile?.department || 'Unknown',
      role: user.role,
    }));

    console.log('Transformed employees:', {
      employeesLength: transformed.length,
      employees: transformed
    });

    return transformed;
  }, [users]);

  // Simple organization data based on departments (memoized)
  const organizations = useMemo(() => [
    { id: 'HR팀', name: 'HR팀', level: 1, parentId: undefined },
    { id: '개발팀', name: '개발팀', level: 1, parentId: undefined },
    { id: '경영진', name: '경영진', level: 1, parentId: undefined },
    { id: 'unknown', name: '기타', level: 1, parentId: undefined },
  ], []);

  useEffect(() => {
    if (open && !isLoading) {
      console.log('ApprovalRouteModal opened with data:', {
        usersCount: users.length,
        employeesCount: employees.length,
        userTemplatesCount: userTemplates.length,
        adminTemplatesCount: adminTemplates.length
      });
      
      buildOrganizationTree();
      if (existingRoute) {
        setSelectedSteps(existingRoute.steps);
        setApprovalMode('manual');
      } else {
        // Start with template mode to show saved templates
        setApprovalMode('template');
      }
    }
  }, [open, existingRoute, userId, isLoading]);

  useEffect(() => {
    console.log('selectedSteps changed:', selectedSteps.length, selectedSteps);
    updateFinalApprovalOrder();
  }, [selectedSteps]);

  // Separate effect to handle template loading when in template mode
  useEffect(() => {
    if (!open || isLoading) return;
    
    if (approvalMode === 'template' && userTemplates.length === 0 && adminTemplates.length === 0) {
      // No templates available, show info message only once
      console.log('No templates available');
      return;
    }

    if (approvalMode === 'template' && (userTemplates.length > 0 || adminTemplates.length > 0) && selectedSteps.length === 0 && selectedTemplate === null) {
      // Load default user template if exists
      const defaultTemplate = userTemplates.find((t: any) => t.is_default);
      if (defaultTemplate) {
        console.log('Auto-loading default user template:', defaultTemplate);
        if (defaultTemplate.steps) {
          const steps = defaultTemplate.steps.map((step: any, index: number) => ({
            id: `step_${Date.now()}_${index}`,
            order: step.order,
            approverId: step.approverId,
            approverName: step.approverName,
            approverTitle: step.approverTitle,
            organizationName: step.organizationName,
            type: step.type,
            isRequired: step.isRequired,
          }));
          
          setSelectedSteps(steps);
          setSelectedApprovers(steps.map((s: any) => s.approverId));
          setSelectedTemplate(defaultTemplate.id);
          updateFinalApprovalOrder(steps);
        }
        return;
      }

      // Load default admin template if exists
      const defaultAdminTemplate = adminTemplates.find((t: any) => t.is_default);
      if (defaultAdminTemplate && defaultAdminTemplate.stages) {
        console.log('Auto-loading default admin template:', defaultAdminTemplate);
        const steps: ApprovalStep[] = [];
        let stepId = 0;
        
        defaultAdminTemplate.stages.forEach((stage: any) => {
          if (stage.approvers && stage.approvers.length > 0) {
            stage.approvers.forEach((approver: any) => {
              let user = approver.user;
              if (!user) {
                user = employees.find(emp => emp.id === approver.user_id);
              }
              
              if (user) {
                let stepType = 'APPROVAL';
                switch (stage.type) {
                  case 'CONSENT':
                    stepType = 'COOPERATION';
                    break;
                  case 'APPROVAL':
                    stepType = 'APPROVAL';
                    break;
                  case 'CC':
                    stepType = 'REFERENCE';
                    break;
                  default:
                    stepType = 'APPROVAL';
                }
                
                steps.push({
                  id: `step_${++stepId}`,
                  order: approver.order_index || 1,
                  approverId: user.id,
                  approverName: user.name,
                  approverTitle: user.title || '',
                  organizationName: user.organizationName || '',
                  type: stepType as 'COOPERATION' | 'APPROVAL' | 'REFERENCE' | 'RECEPTION' | 'CIRCULATION',
                  isRequired: stepType === 'APPROVAL',
                });
              }
            });
          }
        });

        if (steps.length > 0) {
          steps.sort((a, b) => a.order - b.order);
          setSelectedSteps(steps);
          setSelectedApprovers(steps.map(s => s.approverId));
          setSelectedTemplate(defaultAdminTemplate.id);
          updateFinalApprovalOrder(steps);
        }
      }
    }
  }, [open, approvalMode, userTemplates, adminTemplates, employees, isLoading, selectedTemplate]);

  const buildOrganizationTree = () => {
    if (employees.length === 0) return;

    const buildNode = (org: any): TreeDataNode => {
      const childOrgs = organizations.filter(o => o.parentId === org.id);
      const orgEmployees = employees.filter(emp => emp.organizationId === org.id);
      
      const children: TreeDataNode[] = [];
      
      // Add child organizations
      childOrgs.forEach(childOrg => {
        children.push(buildNode(childOrg));
      });
      
      // Add employees
      orgEmployees.forEach(emp => {
        // 자기 자신도 결재선에 추가할 수 있도록 조건 제거
        children.push({
          key: `emp_${emp.id}`,
          title: renderEmployeeNode(emp),
          isLeaf: true,
          selectable: true,
        });
      });

      return {
        key: `org_${org.id}`,
        title: renderOrgNode(org),
        children: children.length > 0 ? children : undefined,
        selectable: false,
      };
    };

    const rootOrgs = organizations.filter(org => org.level === 1);
    const treeData = rootOrgs.map(buildNode);
    setOrgTreeData(treeData);
  };

  const renderOrgNode = (org: any) => (
    <div className="flex items-center gap-2 py-1">
      <TeamOutlined className="text-blue-500" />
      <span className="font-medium text-blue-800">{org.name}</span>
      <Tag color="blue">Level {org.level}</Tag>
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
    const selectedStep = selectedSteps.find(step => step.approverId === emp.id);

    return (
      <div 
        className={`flex items-center justify-between w-full py-2 px-2 rounded ${
          isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-blue-50'
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isSelected) {
            handleEmployeeSelect(emp);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{emp.name}</span>
              <Tag color={getRoleColor(emp.role)}>
                {emp.role === 'SUPER_ADMIN' ? '관리자' : emp.role === 'HR_MANAGER' ? 'HR' : '직원'}
              </Tag>
            </div>
            <div className="text-sm text-gray-500">{emp.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSelected && selectedStep && (
            <Tag color={getTypeColor(selectedStep.type)}>
              {getTypeTitle(selectedStep.type)}
            </Tag>
          )}
          <Button 
            type={isSelected ? "default" : "primary"}
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isSelected) {
                handleEmployeeSelect(emp);
              } else {
                setPendingEmployee(emp);
                setShowRoleSelector(emp.id);
              }
            }}
          >
            {isSelected ? '제거' : '선택'}
          </Button>
        </div>
      </div>
    );
  };

  const handleEmployeeSelect = (emp: Employee) => {
    if (selectedApprovers.includes(emp.id)) {
      // Remove from selection
      const updatedSteps = selectedSteps.filter(step => step.approverId !== emp.id);
      
      // Reorder remaining steps of each type
      const reorderedSteps = updatedSteps.map(step => {
        const sameTypeSteps = updatedSteps.filter(s => s.type === step.type);
        const index = sameTypeSteps.findIndex(s => s.id === step.id);
        return {
          ...step,
          order: index + 1
        };
      });
      
      setSelectedApprovers(prev => prev.filter(id => id !== emp.id));
      setSelectedSteps(reorderedSteps);
      
      // Update final approval order
      updateFinalApprovalOrder(reorderedSteps);
    }
  };

  const handleRoleSelect = (roleType: 'COOPERATION' | 'APPROVAL' | 'REFERENCE' | 'RECEPTION' | 'CIRCULATION') => {
    if (!pendingEmployee) return;

    // Calculate correct order for this type
    const sameTypeSteps = selectedSteps.filter(step => step.type === roleType);
    const newOrder = sameTypeSteps.length + 1;

    console.log(`Adding ${roleType} user:`, {
      currentSteps: selectedSteps,
      sameTypeSteps: sameTypeSteps,
      newOrder: newOrder,
      employeeName: pendingEmployee.name
    });

    const newStep: ApprovalStep = {
      id: `step_${Date.now()}`,
      order: newOrder,
      approverId: pendingEmployee.id,
      approverName: pendingEmployee.name,
      approverTitle: pendingEmployee.title,
      organizationName: pendingEmployee.organizationName,
      type: roleType,
      isRequired: roleType === 'APPROVAL',
    };
    
    const updatedSteps = [...selectedSteps, newStep];
    
    console.log('Updated steps:', updatedSteps);
    
    setSelectedApprovers(prev => [...prev, pendingEmployee.id]);
    setSelectedSteps(updatedSteps);
    setShowRoleSelector(null);
    setPendingEmployee(null);
    
    // Update final approval order
    updateFinalApprovalOrder(updatedSteps);
  };

  const updateFinalApprovalOrder = (steps?: ApprovalStep[]) => {
    const stepsToProcess = steps || selectedSteps;
    
    const cooperationSteps = stepsToProcess.filter(step => step.type === 'COOPERATION').sort((a, b) => a.order - b.order);
    const approvalSteps = stepsToProcess.filter(step => step.type === 'APPROVAL').sort((a, b) => a.order - b.order);
    
    const finalOrder = [...cooperationSteps, ...approvalSteps].map((step, index) => ({
      ...step,
      finalOrder: index + 1
    }));
    
    setFinalApprovalOrder(finalOrder);
  };

  const moveFinalOrderUp = (stepId: string) => {
    const currentIndex = finalApprovalOrder.findIndex(step => step.id === stepId);
    if (currentIndex > 0) {
      const newOrder = [...finalApprovalOrder];
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
      
      // Update final order numbers
      newOrder.forEach((step, index) => {
        step.finalOrder = index + 1;
      });
      
      setFinalApprovalOrder(newOrder);
    }
  };

  const moveFinalOrderDown = (stepId: string) => {
    const currentIndex = finalApprovalOrder.findIndex(step => step.id === stepId);
    if (currentIndex < finalApprovalOrder.length - 1) {
      const newOrder = [...finalApprovalOrder];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      
      // Update final order numbers
      newOrder.forEach((step, index) => {
        step.finalOrder = index + 1;
      });
      
      setFinalApprovalOrder(newOrder);
    }
  };

  const loadDefaultTemplate = () => {
    console.log('loadDefaultTemplate called with:', {
      userTemplatesLength: userTemplates.length,
      adminTemplatesLength: adminTemplates.length,
      userTemplates: userTemplates.map((t: any) => ({ id: t.id, name: t.name, isDefault: t.is_default })),
      adminTemplates: adminTemplates.map((t: any) => ({ id: t.id, name: t.name, isDefault: t.is_default }))
    });

    // Clear previous selections first
    setSelectedSteps([]);
    setSelectedApprovers([]);
    setSelectedTemplate(null);

    // Set a flag to indicate we need to load templates
    // This will be handled by a separate useEffect
    setApprovalMode('template');
  };

  const applyTemplate = (template: any) => {
    if (!template.steps || template.steps.length === 0) {
      console.warn('Template has no steps:', template);
      console.log('Creating default approval line for template:', template.name);
      
      // 기본 결재선 생성 (HR 매니저 → 관리자)
      const defaultSteps = [];
      
      // HR 매니저 추가 (협조)
      const hrManager = employees.find(emp => emp.role === 'HR_MANAGER');
      if (hrManager) {
        defaultSteps.push({
          id: `step_${Date.now()}_1`,
          order: 1,
          approverId: hrManager.id,
          approverName: hrManager.name,
          approverTitle: hrManager.title,
          organizationName: hrManager.organizationName,
          type: 'COOPERATION',
          isRequired: true,
        });
      }
      
      // 관리자 추가 (결재)
      const admin = employees.find(emp => emp.role === 'SUPER_ADMIN');
      if (admin) {
        defaultSteps.push({
          id: `step_${Date.now()}_2`,
          order: 1,
          approverId: admin.id,
          approverName: admin.name,
          approverTitle: admin.title,
          organizationName: admin.organizationName,
          type: 'APPROVAL',
          isRequired: true,
        });
      }
      
      console.log('Generated default steps:', defaultSteps);
      
      setSelectedSteps(defaultSteps);
      setSelectedApprovers(defaultSteps.map((s: any) => s.approverId));
      setSelectedTemplate(template.id);
      updateFinalApprovalOrder(defaultSteps);
      return;
    }
    
    console.log('Applying template:', template.name, 'with steps:', template.steps);
    
    const steps = template.steps.map((step: any, index: number) => ({
      id: `step_${Date.now()}_${index}`,
      order: step.order,
      approverId: step.approverId,
      approverName: step.approverName,
      approverTitle: step.approverTitle,
      organizationName: step.organizationName,
      type: step.type,
      isRequired: step.isRequired,
    }));
    
    console.log('Generated steps:', steps);
    
    setSelectedSteps(steps);
    setSelectedApprovers(steps.map((s: ApprovalStep) => s.approverId));
    setSelectedTemplate(template.id);
    updateFinalApprovalOrder(steps);
  };

  const applyAdminTemplate = (template: any) => {
    if (!template.stages || template.stages.length === 0) {
      console.warn('Admin template has no stages:', template);
      console.log('Creating default approval line for admin template:', template.name);
      
      // 기본 결재선 생성 (HR 매니저 → 관리자)
      const defaultSteps = [];
      
      // HR 매니저 추가 (협조)
      const hrManager = employees.find(emp => emp.role === 'HR_MANAGER');
      if (hrManager) {
        defaultSteps.push({
          id: `step_${Date.now()}_1`,
          order: 1,
          approverId: hrManager.id,
          approverName: hrManager.name,
          approverTitle: hrManager.title,
          organizationName: hrManager.organizationName,
          type: 'COOPERATION',
          isRequired: true,
        });
      }
      
      // 관리자 추가 (결재)
      const admin = employees.find(emp => emp.role === 'SUPER_ADMIN');
      if (admin) {
        defaultSteps.push({
          id: `step_${Date.now()}_2`,
          order: 1,
          approverId: admin.id,
          approverName: admin.name,
          approverTitle: admin.title,
          organizationName: admin.organizationName,
          type: 'APPROVAL',
          isRequired: true,
        });
      }
      
      console.log('Generated default admin steps:', defaultSteps);
      
      setSelectedSteps(defaultSteps);
      setSelectedApprovers(defaultSteps.map((s: any) => s.approverId));
      setSelectedTemplate(template.id);
      updateFinalApprovalOrder(defaultSteps);
      return;
    }
    
    console.log('Applying admin template:', template.name, 'with stages:', template.stages);
    
    const steps: ApprovalStep[] = [];
    let stepId = 0;
    
    template.stages.forEach((stage: any) => {
      if (stage.approvers && stage.approvers.length > 0) {
        stage.approvers.forEach((approver: any) => {
          // Use user information from API response or fallback to employees lookup
          let user = approver.user;
          if (!user) {
            user = employees.find(emp => emp.id === approver.user_id);
          }
          
          if (user) {
            // Map stage types correctly
            let stepType = 'APPROVAL';
            switch (stage.type) {
              case 'CONSENT':
                stepType = 'COOPERATION';
                break;
              case 'APPROVAL':
                stepType = 'APPROVAL';
                break;
              case 'CC':
                stepType = 'REFERENCE';
                break;
              default:
                stepType = 'APPROVAL';
            }
            
            steps.push({
              id: `step_${Date.now()}_${stepId++}`,
              order: (stage.order_index * 100) + approver.order_index + 1, // Ensure proper ordering
              approverId: user.id,
              approverName: user.name,
              approverTitle: user.title || '',
              organizationName: user.organizationName || 'Unknown',
              type: stepType as 'COOPERATION' | 'APPROVAL' | 'REFERENCE' | 'RECEPTION' | 'CIRCULATION',
              isRequired: approver.is_required !== false,
            });
          }
        });
      }
    });
    
    // Sort by order
    steps.sort((a, b) => a.order - b.order);
    
    console.log('Admin template generated steps:', steps);
    
    setSelectedSteps(steps);
    setSelectedApprovers(steps.map(s => s.approverId));
    setSelectedTemplate(template.id);
    updateFinalApprovalOrder(steps);
  };

  const generateAutoApprovalSteps = () => {
    console.log('generateAutoApprovalSteps called with:', {
      employeesLength: employees.length,
      userId,
      employees: employees.map(e => ({ id: e.id, name: e.name, role: e.role, orgName: e.organizationName }))
    });

    if (employees.length === 0) {
      message.warning('직원 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    // Get current user's organization and find managers up the hierarchy
    const currentUser = employees.find(emp => emp.id === userId);
    console.log('Current user found:', currentUser);
    
    if (!currentUser) {
      message.warning('현재 사용자 정보를 찾을 수 없습니다. 로그인을 확인해주세요.');
      return;
    }

    const steps: ApprovalStep[] = [];
    let approvalOrder = 1;
    let cooperationOrder = 1;
    let referenceOrder = 1;

    console.log('Auto-generating approval steps for user:', currentUser);

    // 1. Add immediate supervisor in same organization (cooperation step)
    const immediateSupervisor = employees.find(emp => 
      emp.organizationId === currentUser.organizationId && 
      emp.id !== userId &&
      emp.role === 'HR_MANAGER'
    );

    if (immediateSupervisor) {
      steps.push({
        id: `coop_${cooperationOrder}`,
        order: cooperationOrder++,
        approverId: immediateSupervisor.id,
        approverName: immediateSupervisor.name,
        approverTitle: immediateSupervisor.title,
        organizationName: immediateSupervisor.organizationName,
        type: 'COOPERATION',
        isRequired: true,
      });
      console.log('Added immediate supervisor:', immediateSupervisor.name);
    }

    // 2. Add department/organization manager (approval step)
    const departmentManagers = employees.filter(emp => 
      emp.organizationId === currentUser.organizationId && 
      emp.id !== userId &&
      emp.role === 'HR_MANAGER' &&
      emp.id !== immediateSupervisor?.id
    );

    departmentManagers.forEach(manager => {
      steps.push({
        id: `approval_${approvalOrder}`,
        order: approvalOrder++,
        approverId: manager.id,
        approverName: manager.name,
        approverTitle: manager.title,
        organizationName: manager.organizationName,
        type: 'APPROVAL',
        isRequired: true,
      });
      console.log('Added department manager:', manager.name);
    });

    // 3. Add HR team manager if not in HR team and not already included
    const hrManager = employees.find(emp => 
      emp.organizationName === 'HR팀' && 
      emp.role === 'HR_MANAGER' &&
      !steps.some(step => step.approverId === emp.id)
    );
    
    if (hrManager && currentUser.organizationName !== 'HR팀') {
      steps.push({
        id: `approval_${approvalOrder}`,
        order: approvalOrder++,
        approverId: hrManager.id,
        approverName: hrManager.name,
        approverTitle: hrManager.title,
        organizationName: hrManager.organizationName,
        type: 'APPROVAL',
        isRequired: true,
      });
      console.log('Added HR manager:', hrManager.name);
    }

    // 4. Add super admin as final approver if exists and not already included
    const superAdmin = employees.find(emp => 
      emp.role === 'SUPER_ADMIN' &&
      !steps.some(step => step.approverId === emp.id)
    );
    
    if (superAdmin) {
      steps.push({
        id: `approval_${approvalOrder}`,
        order: approvalOrder++,
        approverId: superAdmin.id,
        approverName: superAdmin.name,
        approverTitle: superAdmin.title,
        organizationName: superAdmin.organizationName,
        type: 'APPROVAL',
        isRequired: true,
      });
      console.log('Added super admin:', superAdmin.name);
    }

    // 5. Add HR team members as reference (if not the requester's team)
    if (currentUser.organizationName !== 'HR팀') {
      const hrTeamMembers = employees.filter(emp => 
        emp.organizationName === 'HR팀' && 
        emp.role === 'EMPLOYEE' &&
        !steps.some(step => step.approverId === emp.id)
      ).slice(0, 2); // Limit to 2 reference members

      hrTeamMembers.forEach(member => {
        steps.push({
          id: `ref_${referenceOrder}`,
          order: referenceOrder++,
          approverId: member.id,
          approverName: member.name,
          approverTitle: member.title,
          organizationName: member.organizationName,
          type: 'REFERENCE',
          isRequired: false,
        });
        console.log('Added HR reference:', member.name);
      });
    }

    console.log('Generated auto approval steps:', steps);

    if (steps.length === 0) {
      message.warning('자동 결재선을 생성할 수 없습니다. 상급자가 등록되지 않았거나 조직 구조를 확인해주세요.');
      return;
    }

    setSelectedSteps(steps);
    setSelectedApprovers(steps.map(step => step.approverId));
    updateFinalApprovalOrder(steps);
    message.success(`자동으로 ${steps.length}명의 결재선이 생성되었습니다.`);
  };

  const handleSaveAsTemplate = () => {
    if (selectedSteps.length === 0) {
      message.warning('저장할 결재선이 없습니다.');
      return;
    }
    setShowSaveTemplateModal(true);
  };

  const confirmSaveTemplate = () => {
    if (!templateName.trim()) {
      message.warning('템플릿 이름을 입력해주세요.');
      return;
    }

    saveTemplateMutation.mutate({
      name: templateName,
      description: templateDescription,
      steps: selectedSteps,
      isDefault: false,
    });
  };

  const moveStepUp = (stepId: string, type: string) => {
    const typeSteps = selectedSteps.filter(step => step.type === type);
    const otherSteps = selectedSteps.filter(step => step.type !== type);
    
    const stepIndex = typeSteps.findIndex(step => step.id === stepId);
    if (stepIndex > 0) {
      const newTypeSteps = [...typeSteps];
      [newTypeSteps[stepIndex - 1], newTypeSteps[stepIndex]] = [newTypeSteps[stepIndex], newTypeSteps[stepIndex - 1]];
      
      // Update order numbers
      newTypeSteps.forEach((step, index) => {
        step.order = index + 1;
      });
      
      setSelectedSteps([...otherSteps, ...newTypeSteps]);
      setTimeout(() => updateFinalApprovalOrder(), 100);
    }
  };

  const moveStepDown = (stepId: string, type: string) => {
    const typeSteps = selectedSteps.filter(step => step.type === type);
    const otherSteps = selectedSteps.filter(step => step.type !== type);
    
    const stepIndex = typeSteps.findIndex(step => step.id === stepId);
    if (stepIndex < typeSteps.length - 1) {
      const newTypeSteps = [...typeSteps];
      [newTypeSteps[stepIndex], newTypeSteps[stepIndex + 1]] = [newTypeSteps[stepIndex + 1], newTypeSteps[stepIndex]];
      
      // Update order numbers
      newTypeSteps.forEach((step, index) => {
        step.order = index + 1;
      });
      
      setSelectedSteps([...otherSteps, ...newTypeSteps]);
      setTimeout(() => updateFinalApprovalOrder(), 100);
    }
  };

  const removeStep = (stepId: string) => {
    const step = selectedSteps.find(s => s.id === stepId);
    if (step) {
      setSelectedSteps(prev => prev.filter(s => s.id !== stepId));
      setSelectedApprovers(prev => prev.filter(id => id !== step.approverId));
      setTimeout(() => updateFinalApprovalOrder(), 100);
    }
  };

  const handleSave = () => {
    const approvalSteps = selectedSteps.filter(step => step.type === 'APPROVAL');
    if (approvalSteps.length === 0) {
      message.warning('최소 1명의 결재자를 선택해주세요.');
      return;
    }

    console.log('Saving route with steps:', selectedSteps);

    const route: ApprovalRoute = {
      id: existingRoute?.id || `route_${Date.now()}`,
      type: 'APPROVAL',
      userId,
      steps: selectedSteps, // Keep original order numbers for each type
      isActive: true,
      createdAt: existingRoute?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Final route to save:', route);

    onSave(route);
    message.success('결재선 설정이 저장되었습니다.');
  };

  const getStepsByType = (type: string) => {
    return selectedSteps.filter(step => step.type === type).sort((a, b) => a.order - b.order);
  };

  const getTypeTitle = (type: string) => {
    switch (type) {
      case 'COOPERATION':
        return '협조';
      case 'APPROVAL':
        return '결재';
      case 'REFERENCE':
        return '참조';
      case 'RECEPTION':
        return '수신';
      case 'CIRCULATION':
        return '공람';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'COOPERATION':
        return 'orange';
      case 'APPROVAL':
        return 'green';
      case 'REFERENCE':
        return 'blue';
      case 'RECEPTION':
        return 'purple';
      case 'CIRCULATION':
        return 'cyan';
      default:
        return 'default';
    }
  };

  const getTypeColorHex = (type: string) => {
    switch (type) {
      case 'COOPERATION':
        return '#f97316'; // orange-500
      case 'APPROVAL':
        return '#22c55e'; // green-500
      case 'REFERENCE':
        return '#3b82f6'; // blue-500
      case 'RECEPTION':
        return '#a855f7'; // purple-500
      case 'CIRCULATION':
        return '#06b6d4'; // cyan-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const renderStepList = (type: string) => {
    const steps = getStepsByType(type);
    
    return (
      <div className="space-y-3">
        {steps.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {getTypeTitle(type)} 대상자를 선택해주세요
          </div>
        ) : (
          steps.map((step, index) => (
            <div key={step.id} className="border rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold border-2 border-white shadow-md"
                    style={{
                      backgroundColor: getTypeColor(type) === 'orange' ? '#f97316' :
                                      getTypeColor(type) === 'green' ? '#22c55e' :
                                      getTypeColor(type) === 'blue' ? '#3b82f6' :
                                      getTypeColor(type) === 'purple' ? '#a855f7' :
                                      getTypeColor(type) === 'cyan' ? '#06b6d4' : '#6b7280'
                    }}
                  >
                    {step.order}
                  </div>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <div>
                    <div className="font-medium">{step.approverName}</div>
                    <div className="text-sm text-gray-500">
                      {step.approverTitle} • {step.organizationName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getTypeTitle(type)} {step.order}단계
                    </div>
                  </div>
                  <Tag color={getTypeColor(type)}>
                    {getTypeTitle(type)}
                  </Tag>
                </div>
                
                <div className="flex items-center gap-1">
                  <Tooltip title="위로 이동">
                    <Button
                      type="text"
                      size="small"
                      onClick={() => moveStepUp(step.id, type)}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                  </Tooltip>
                  <Tooltip title="아래로 이동">
                    <Button
                      type="text"
                      size="small"
                      onClick={() => moveStepDown(step.id, type)}
                      disabled={index === steps.length - 1}
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
              
              {index < steps.length - 1 && (
                <div className="flex justify-center mt-2">
                  <ArrowRightOutlined className="text-gray-400 rotate-90" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <Modal
      title="결재선 설정"
      open={open}
      onCancel={onCancel}
      width={800}
      footer={null}
      destroyOnHidden
    >
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <Card size="small">
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <div className="text-gray-500">데이터를 불러오는 중...</div>
              </div>
            </div>
          </Card>
        )}

        {/* Error State */}
        {(usersError || userTemplatesError || adminTemplatesError) && (
          <Card size="small" className="border-red-200 bg-red-50">
            <div className="text-red-600">
              <div className="font-medium">데이터 로딩 오류</div>
              <div className="text-sm mt-1">
                {usersError && '• 사용자 정보를 불러오는데 실패했습니다.'}
                {userTemplatesError && '• 개인 템플릿을 불러오는데 실패했습니다.'}
                {adminTemplatesError && '• 관리자 템플릿을 불러오는데 실패했습니다.'}
              </div>
              <div className="text-xs mt-2 text-red-500">
                페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </div>
            </div>
          </Card>
        )}

        {/* Data Summary */}
        {!isLoading && (
          <Card size="small" className="bg-gray-50">
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>📊 로드된 데이터:</span>
                <span>직원 {employees.length}명</span>
                <span>개인 템플릿 {userTemplates.length}개</span>
                <span>관리자 템플릿 {adminTemplates.length}개</span>
                <span>선택된 단계: {selectedSteps.length}개</span>
              </div>
              {/* Debug button */}
              <Button 
                size="small" 
                onClick={() => {
                  console.log('=== DEBUG INFO ===');
                  console.log('userTemplates:', userTemplates);
                  console.log('adminTemplates:', adminTemplates);
                  console.log('selectedSteps:', selectedSteps);
                  console.log('employees:', employees);
                }}
                style={{ marginTop: 8 }}
              >
                디버그 정보 출력
              </Button>
            </div>
          </Card>
        )}

        {/* Approval Mode Selection */}
        <Card size="small" title="결재선 설정 방식">
          <Radio.Group
            value={approvalMode}
            disabled={isLoading}
            onChange={(e) => {
              console.log('Approval mode changed:', e.target.value);
              console.log('Current data state:', {
                employeesLength: employees.length,
                userTemplatesLength: userTemplates.length,
                adminTemplatesLength: adminTemplates.length,
                isLoading
              });
              
              setApprovalMode(e.target.value);
              try {
                if (e.target.value === 'auto') {
                  console.log('Switching to auto mode');
                  generateAutoApprovalSteps();
                } else if (e.target.value === 'template') {
                  console.log('Switching to template mode');
                  loadDefaultTemplate();
                } else if (e.target.value === 'manual') {
                  console.log('Switching to manual mode');
                  setSelectedSteps([]);
                  setSelectedApprovers([]);
                  setSelectedTemplate(null);
                }
              } catch (error) {
                console.error('Error in approval mode change:', error);
                message.error('설정 변경 중 오류가 발생했습니다.');
              }
            }}
          >
            <Space direction="vertical">
              <Radio value="template" disabled={isLoading || (userTemplates.length === 0 && adminTemplates.length === 0)}>
                <Space>
                  <FileTextOutlined />
                  <div>
                    <div>템플릿 선택 (저장된 결재선 템플릿 사용)</div>
                    <div className="text-xs text-gray-500">
                      {isLoading ? '템플릿 로딩 중...' : 
                       (userTemplates.length === 0 && adminTemplates.length === 0) ? '사용 가능한 템플릿이 없습니다' :
                       `${userTemplates.length + adminTemplates.length}개 템플릿 사용 가능`}
                    </div>
                  </div>
                </Space>
              </Radio>
              <Radio value="auto" disabled={isLoading || employees.length === 0}>
                <Space>
                  <SettingOutlined />
                  <div>
                    <div>자동 설정 (조직도 기반 상급자 자동 선택)</div>
                    <div className="text-xs text-gray-500">
                      {isLoading ? '직원 데이터 로딩 중...' :
                       employees.length === 0 ? '직원 데이터가 없습니다' :
                       `${employees.length}명의 직원 데이터 기반`}
                    </div>
                  </div>
                </Space>
              </Radio>
              <Radio value="manual" disabled={isLoading || employees.length === 0}>
                <Space>
                  <UserOutlined />
                  <div>
                    <div>수동 설정 (직접 결재선 구성)</div>
                    <div className="text-xs text-gray-500">
                      {isLoading ? '직원 데이터 로딩 중...' :
                       employees.length === 0 ? '직원 데이터가 없습니다' :
                       '조직도에서 직접 결재자를 선택'}
                    </div>
                  </div>
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </Card>

        {/* Template Selection - Compact */}
        {approvalMode === 'template' && (
          <Card title="결재선 템플릿 선택" size="small">
            <div className="space-y-3">
              {userTemplates.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">내 템플릿</div>
                  <div className="space-y-1">
                    {userTemplates.slice(0, 3).map((template: any) => (
                      <div
                        key={template.id}
                        className={`p-2 rounded cursor-pointer text-sm border ${
                          selectedTemplate === template.id 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('=== USER TEMPLATE CLICKED ===');
                          console.log('Template clicked:', template.name, template);
                          console.log('Current selectedSteps before:', selectedSteps.length);
                          applyTemplate(template);
                        }}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{template.name}</span>
                          {template.is_default && <Tag color="green">기본</Tag>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.steps?.length || 0}명의 결재자
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {adminTemplates.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">관리자 템플릿</div>
                  <div className="space-y-1">
                    {adminTemplates.slice(0, 3).map((template: any) => (
                      <div
                        key={template.id}
                        className={`p-2 rounded cursor-pointer text-sm border ${
                          selectedTemplate === template.id 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('=== ADMIN TEMPLATE CLICKED ===');
                          console.log('Admin template clicked:', template.name, template);
                          console.log('Current selectedSteps before:', selectedSteps.length);
                          applyAdminTemplate(template);
                        }}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{template.name}</span>
                          {template.is_default && <Tag color="green">기본</Tag>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.stages?.length || 0}개 단계
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {userTemplates.length === 0 && adminTemplates.length === 0 && (
                <Empty 
                  description="사용 가능한 템플릿이 없습니다" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  className="py-4"
                />
              )}
            </div>
          </Card>
        )}

        {/* Organization Tree */}
        {approvalMode === 'manual' && (
          <Card title="조직도에서 대상자 선택" size="small">
            <div className="max-h-60 overflow-y-auto">
              <Tree
                treeData={orgTreeData}
                defaultExpandAll
                showIcon={false}
                onSelect={(selectedKeys, info) => {
                  // Handle tree node selection if needed
                  if (info.node.key?.toString().startsWith('emp_')) {
                    const empId = info.node.key.toString().replace('emp_', '');
                    const emp = employees.find(e => e.id === empId);
                    if (emp && !selectedApprovers.includes(emp.id)) {
                      setPendingEmployee(emp);
                      setShowRoleSelector(emp.id);
                    }
                  }
                }}
              />
            </div>
            
            {/* Role Selection Modal */}
            {showRoleSelector && pendingEmployee && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <Card className="w-80">
                  <div className="text-center mb-4">
                    <Avatar size="large" icon={<UserOutlined />} className="mb-2" />
                    <div className="font-medium">{pendingEmployee.name}</div>
                    <div className="text-sm text-gray-500">{pendingEmployee.title}</div>
                    <div className="text-sm text-gray-500">{pendingEmployee.organizationName}</div>
                  </div>
                  
                  <Typography.Text strong className="block mb-3">역할을 선택하세요:</Typography.Text>
                  
                  <Space direction="vertical" className="w-full">
                    <Button
                      block
                      onClick={() => handleRoleSelect('COOPERATION')}
                      className="text-left"
                    >
                      <Tag color="orange">협조</Tag>
                      검토 후 의견 제시
                    </Button>
                    <Button
                      block
                      onClick={() => handleRoleSelect('APPROVAL')}
                      className="text-left"
                    >
                      <Tag color="green">결재</Tag>
                      승인/반려 권한
                    </Button>
                    <Button
                      block
                      onClick={() => handleRoleSelect('REFERENCE')}
                      className="text-left"
                    >
                      <Tag color="blue">참조</Tag>
                      문서 열람
                    </Button>
                    <Button
                      block
                      onClick={() => handleRoleSelect('RECEPTION')}
                      className="text-left"
                    >
                      <Tag color="purple">수신</Tag>
                      문서 수신
                    </Button>
                    <Button
                      block
                      onClick={() => handleRoleSelect('CIRCULATION')}
                      className="text-left"
                    >
                      <Tag color="cyan">공람</Tag>
                      문서 공람
                    </Button>
                  </Space>
                  
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => {
                      setShowRoleSelector(null);
                      setPendingEmployee(null);
                    }}>
                      취소
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </Card>
        )}

        {/* Selected Routes - Compact */}
        {selectedSteps.length > 0 && (
          <Card 
            title={`결재선 구성 (${selectedSteps.length}명)`} 
            size="small"
          >
            <div className="space-y-2">
              {getStepsByType('COOPERATION').length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-orange-600">협조: </span>
                  {getStepsByType('COOPERATION').map(step => step.approverName).join(' → ')}
                </div>
              )}
              {getStepsByType('APPROVAL').length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-green-600">결재: </span>
                  {getStepsByType('APPROVAL').map(step => step.approverName).join(' → ')}
                </div>
              )}
              {getStepsByType('REFERENCE').length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-blue-600">참조: </span>
                  {getStepsByType('REFERENCE').map(step => step.approverName).join(', ')}
                </div>
              )}
            </div>
          </Card>
        )}


        <Divider />

        {/* Footer Actions */}
        <div className="flex justify-between">
          <div>
            {selectedSteps.length > 0 && approvalMode === 'manual' && (
              <Button 
                icon={<SaveOutlined />}
                onClick={handleSaveAsTemplate}
              >
                템플릿으로 저장
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={onCancel}>
              취소
            </Button>
            <Button
              type="primary"
              onClick={() => {
                console.log('Apply button clicked, selectedSteps:', selectedSteps);
                if (selectedSteps.length === 0) {
                  console.warn('No steps selected, but applying anyway');
                  message.warning('결재선을 먼저 설정해주세요.');
                  return;
                }
                handleSave();
              }}
              // disabled={selectedSteps.length === 0} // 임시로 비활성화 조건 제거
            >
              적용 ({selectedSteps.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      <Modal
        title="결재선 템플릿 저장"
        open={showSaveTemplateModal}
        onCancel={() => {
          setShowSaveTemplateModal(false);
          setTemplateName('');
          setTemplateDescription('');
        }}
        onOk={confirmSaveTemplate}
        confirmLoading={saveTemplateMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">템플릿 이름 *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="예: 기본 결재선"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">설명 (선택)</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md"
              placeholder="템플릿 설명을 입력하세요"
              rows={3}
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
            />
          </div>
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="text-sm text-blue-800">
              <strong>저장될 결재선:</strong>
              <div className="mt-2 space-y-1">
                {selectedSteps.map((step, index) => (
                  <div key={step.id}>
                    {index + 1}. {step.approverName} ({getTypeTitle(step.type)})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};