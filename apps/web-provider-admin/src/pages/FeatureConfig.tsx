import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Switch, 
  Button, 
  message, 
  Spin, 
  Tabs, 
  Space, 
  Typography,
  Row,
  Col,
  Divider,
  Alert
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { apiClient } from '../lib/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface FeatureConfig {
  id: string;
  company_id: string;
  attendance_enabled: boolean;
  leave_enabled: boolean;
  approval_enabled: boolean;
  hr_community_enabled: boolean;
  calendar_enabled: boolean;
  geofence_enabled: boolean;
  face_recognition_enabled: boolean;
  qr_checkin_enabled: boolean;
  overtime_enabled: boolean;
  remote_work_enabled: boolean;
  annual_leave_enabled: boolean;
  sick_leave_enabled: boolean;
  special_leave_enabled: boolean;
  leave_calendar_enabled: boolean;
  auto_approval_enabled: boolean;
  dynamic_forms_enabled: boolean;
  parallel_approval_enabled: boolean;
  deputy_approval_enabled: boolean;
  bulk_approval_enabled: boolean;
  company_notice_enabled: boolean;
  team_board_enabled: boolean;
  survey_enabled: boolean;
  anonymous_post_enabled: boolean;
  ai_assistant_enabled: boolean;
  analytics_enabled: boolean;
  custom_reports_enabled: boolean;
  api_access_enabled: boolean;
}

const FeatureConfigPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<FeatureConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchFeatureConfig();
  }, [companyId]);

  const fetchFeatureConfig = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/feature-config/company/${companyId}`);
      setConfig(response.data);
    } catch (error) {
      message.error('Failed to load feature configuration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field: keyof FeatureConfig, value: boolean) => {
    if (config) {
      setConfig({ ...config, [field]: value });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const { id, company_id, ...updateData } = config;
      await apiClient.put(`/feature-config/company/${companyId}`, updateData);
      message.success('Feature configuration saved successfully');
      setHasChanges(false);
    } catch (error) {
      message.error('Failed to save feature configuration');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!config) {
    return <Alert message="Failed to load configuration" type="error" />;
  }

  const FeatureToggle = ({ label, field, description }: { label: string; field: keyof FeatureConfig; description?: string }) => (
    <Row align="middle" style={{ marginBottom: 16 }}>
      <Col span={18}>
        <Space direction="vertical" size={0}>
          <Text strong>{label}</Text>
          {description && <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>}
        </Space>
      </Col>
      <Col span={6} style={{ textAlign: 'right' }}>
        <Switch
          checked={config[field] as boolean}
          onChange={(checked) => handleToggle(field, checked)}
        />
      </Col>
    </Row>
  );

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
            <Title level={3} style={{ margin: 0 }}>Feature Configuration</Title>
          </Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </div>

        <Tabs defaultActiveKey="main">
          <TabPane tab="Main Modules" key="main">
            <Card>
              <FeatureToggle 
                label="Attendance Management" 
                field="attendance_enabled"
                description="Enable attendance tracking and management features"
              />
              <FeatureToggle 
                label="Leave Management" 
                field="leave_enabled"
                description="Enable leave request and approval system"
              />
              <FeatureToggle 
                label="Approval System" 
                field="approval_enabled"
                description="Enable electronic approval workflow"
              />
              <FeatureToggle 
                label="HR Community" 
                field="hr_community_enabled"
                description="Enable company-wide communication board"
              />
              <FeatureToggle 
                label="Calendar" 
                field="calendar_enabled"
                description="Enable company calendar and event management"
              />
            </Card>
          </TabPane>

          <TabPane tab="Attendance Features" key="attendance">
            <Card>
              <FeatureToggle 
                label="Geofence Check-in" 
                field="geofence_enabled"
                description="Require employees to be within designated area for check-in"
              />
              <FeatureToggle 
                label="Face Recognition" 
                field="face_recognition_enabled"
                description="Enable face recognition for attendance verification"
              />
              <FeatureToggle 
                label="QR Code Check-in" 
                field="qr_checkin_enabled"
                description="Allow check-in via QR code scanning"
              />
              <FeatureToggle 
                label="Overtime Management" 
                field="overtime_enabled"
                description="Track and manage overtime hours"
              />
              <FeatureToggle 
                label="Remote Work" 
                field="remote_work_enabled"
                description="Allow remote work attendance tracking"
              />
            </Card>
          </TabPane>

          <TabPane tab="Leave Features" key="leave">
            <Card>
              <FeatureToggle 
                label="Annual Leave" 
                field="annual_leave_enabled"
                description="Enable annual leave tracking"
              />
              <FeatureToggle 
                label="Sick Leave" 
                field="sick_leave_enabled"
                description="Enable sick leave management"
              />
              <FeatureToggle 
                label="Special Leave" 
                field="special_leave_enabled"
                description="Enable special leave categories"
              />
              <FeatureToggle 
                label="Leave Calendar" 
                field="leave_calendar_enabled"
                description="Show team leave calendar view"
              />
              <FeatureToggle 
                label="Auto Approval" 
                field="auto_approval_enabled"
                description="Automatically approve leaves based on rules"
              />
            </Card>
          </TabPane>

          <TabPane tab="Approval Features" key="approval">
            <Card>
              <FeatureToggle 
                label="Dynamic Forms" 
                field="dynamic_forms_enabled"
                description="Create custom approval forms"
              />
              <FeatureToggle 
                label="Parallel Approval" 
                field="parallel_approval_enabled"
                description="Allow multiple approvers at the same level"
              />
              <FeatureToggle 
                label="Deputy Approval" 
                field="deputy_approval_enabled"
                description="Enable deputy approvers when primary is unavailable"
              />
              <FeatureToggle 
                label="Bulk Approval" 
                field="bulk_approval_enabled"
                description="Allow approving multiple requests at once"
              />
            </Card>
          </TabPane>

          <TabPane tab="Communication" key="communication">
            <Card>
              <FeatureToggle 
                label="Company Notices" 
                field="company_notice_enabled"
                description="Enable company-wide announcements"
              />
              <FeatureToggle 
                label="Team Board" 
                field="team_board_enabled"
                description="Enable team-specific discussion boards"
              />
              <FeatureToggle 
                label="Surveys" 
                field="survey_enabled"
                description="Enable employee surveys and polls"
              />
              <FeatureToggle 
                label="Anonymous Posts" 
                field="anonymous_post_enabled"
                description="Allow anonymous feedback and suggestions"
              />
            </Card>
          </TabPane>

          <TabPane tab="Advanced" key="advanced">
            <Card>
              <FeatureToggle 
                label="AI Assistant" 
                field="ai_assistant_enabled"
                description="Enable AI-powered features and suggestions"
              />
              <FeatureToggle 
                label="Analytics" 
                field="analytics_enabled"
                description="Enable advanced analytics and insights"
              />
              <FeatureToggle 
                label="Custom Reports" 
                field="custom_reports_enabled"
                description="Allow creating custom reports"
              />
              <FeatureToggle 
                label="API Access" 
                field="api_access_enabled"
                description="Enable third-party API access"
              />
            </Card>
          </TabPane>
        </Tabs>
      </Space>
    </div>
  );
};

export default FeatureConfigPage;