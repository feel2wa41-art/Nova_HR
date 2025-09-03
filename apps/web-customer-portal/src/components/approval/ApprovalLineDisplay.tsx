import React from 'react';
import { Card, Tag, Avatar, Space, Button, Empty, Divider } from 'antd';
import { SettingOutlined, UserOutlined, ArrowRightOutlined } from '@ant-design/icons';

interface ApprovalStep {
  type: string;
  approverId: string;
  approverName: string;
  isRequired: boolean;
}

interface ApprovalRoute {
  steps: ApprovalStep[];
}

interface ApprovalLineDisplayProps {
  approvalRoute: ApprovalRoute | null;
  onEdit?: () => void;
  compact?: boolean;
}

export const ApprovalLineDisplay: React.FC<ApprovalLineDisplayProps> = ({
  approvalRoute,
  onEdit,
  compact = false,
}) => {
  const getStepTypeInfo = (type: string) => {
    switch (type) {
      case 'COOPERATION':
        return { label: '협조', color: 'orange', icon: '🤝' };
      case 'APPROVAL':
        return { label: '결재', color: 'green', icon: '✓' };
      case 'REFERENCE':
        return { label: '참조', color: 'blue', icon: '👁' };
      case 'RECEPTION':
        return { label: '수신', color: 'purple', icon: '📨' };
      case 'CIRCULATION':
        return { label: '공람', color: 'cyan', icon: '🔄' };
      default:
        return { label: type, color: 'default', icon: '📄' };
    }
  };

  const groupStepsByType = (steps: ApprovalStep[]) => {
    const groups: { [key: string]: ApprovalStep[] } = {};
    steps.forEach(step => {
      if (!groups[step.type]) {
        groups[step.type] = [];
      }
      groups[step.type].push(step);
    });
    return groups;
  };

  if (!approvalRoute || !approvalRoute.steps || approvalRoute.steps.length === 0) {
    return (
      <Card 
        size="small" 
        title={
          <div className="flex items-center justify-between">
            <span>결재 라인</span>
            {onEdit && (
              <Button 
                size="small" 
                type="primary" 
                icon={<SettingOutlined />}
                onClick={onEdit}
              >
                설정
              </Button>
            )}
          </div>
        }
        className="border border-dashed"
      >
        <div className="text-center py-3">
          <div className="text-gray-500 text-sm mb-2">결재 라인이 설정되지 않았습니다</div>
          {onEdit && (
            <Button type="primary" size="small" onClick={onEdit}>
              결재 라인 설정
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const stepGroups = groupStepsByType(approvalRoute.steps);
  const typeOrder = ['COOPERATION', 'APPROVAL', 'REFERENCE', 'RECEPTION', 'CIRCULATION'];

  if (compact) {
    return (
      <Card 
        size="small" 
        className="border-l-4 border-l-green-500"
        title={
          <div className="flex items-center justify-between">
            <span className="text-sm">결재 라인</span>
            {onEdit && (
              <Button 
                size="small" 
                type="text" 
                icon={<SettingOutlined />}
                onClick={onEdit}
                className="text-xs"
              >
                수정
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-2">
          {typeOrder.map(type => {
            const steps = stepGroups[type];
            if (!steps) return null;
            
            const typeInfo = getStepTypeInfo(type);
            return (
              <div key={type} className="text-xs">
                <Tag color={typeInfo.color}>
                  {typeInfo.icon} {typeInfo.label}
                </Tag>
                <div className="ml-2 mt-1">
                  {steps.map((step, index) => (
                    <span key={step.approverId} className="text-gray-700">
                      {step.approverName}
                      {index < steps.length - 1 && ' → '}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      size="small"
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm">결재 라인</span>
            <Tag color="blue">{approvalRoute.steps.length}단계</Tag>
          </div>
          {onEdit && (
            <Button 
              size="small" 
              type="text" 
              icon={<SettingOutlined />}
              onClick={onEdit}
              className="text-xs"
            >
              수정
            </Button>
          )}
        </div>
      }
      className="border-l-4 border-l-green-500"
    >
      <div className="space-y-2">
        {typeOrder.map((type, typeIndex) => {
          const steps = stepGroups[type];
          if (!steps) return null;
          
          const typeInfo = getStepTypeInfo(type);
          
          return (
            <div key={type} className="text-sm">
              <div className="flex items-center space-x-2 mb-1">
                <Tag color={typeInfo.color}>
                  {typeInfo.icon} {typeInfo.label}
                </Tag>
                <span className="text-xs text-gray-500">
                  {steps.length}명
                </span>
              </div>
              
              <div className="flex items-center flex-wrap gap-1 ml-2">
                {steps.map((step, index) => (
                  <React.Fragment key={step.approverId}>
                    <div className="flex items-center space-x-1 bg-gray-50 px-2 py-1 rounded text-xs">
                      <Avatar 
                        size={16} 
                        icon={<UserOutlined />}
                        className="bg-gray-400"
                      />
                      <span className="font-medium">
                        {step.approverName}
                      </span>
                      {step.isRequired && (
                        <Tag color="red" className="text-xs">필수</Tag>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRightOutlined className="text-gray-400 text-xs" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};