import React, { useState } from 'react';
import {
  Form,
  Card,
  Row,
  Col,
  Select,
  Switch,
  Slider,
  Button,
  Typography,
  Space,
  Radio,
  ColorPicker,
  Upload,
  Avatar,
  App,
  Divider,
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  UploadOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { updateLanguageFromAPI } from '../../i18n/i18n';
import { getLanguageOptions, LanguageCode, DEFAULT_LANGUAGE } from '../../constants/languages';

const { Title, Text } = Typography;
const { Option } = Select;

interface PersonalizationPreferences {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  language: LanguageCode;
  timezone: string;
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  timeFormat: '24h' | '12h';
  dashboardLayout: 'compact' | 'comfortable' | 'spacious';
  sidebarCollapsed: boolean;
  showAvatars: boolean;
  animationsEnabled: boolean;
  fontSize: number;
}

export const PersonalizationSettings: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const languageOptions = getLanguageOptions();

  // Default settings
  const defaultSettings: PersonalizationPreferences = {
    theme: 'light',
    primaryColor: '#1890ff',
    language: (user?.language as LanguageCode) || DEFAULT_LANGUAGE,
    timezone: 'Asia/Seoul',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    dashboardLayout: 'comfortable',
    sidebarCollapsed: false,
    showAvatars: true,
    animationsEnabled: true,
    fontSize: 14,
  };

  const saveLanguageMutation = useMutation({
    mutationFn: async (language: LanguageCode) => {
      const response = await apiClient.put('/users/me/language', { language });
      return response.data;
    },
    onSuccess: (data, language) => {
      updateLanguageFromAPI(language);
      message.success(t('messages.settingsSaved'));
    },
    onError: () => {
      message.error(t('messages.settingsSaveError'));
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (values: PersonalizationPreferences) => {
      // Save language preference separately
      if (values.language !== (user?.language as LanguageCode)) {
        await saveLanguageMutation.mutateAsync(values.language);
      }
      
      // This would call the API to save other personalization preferences
      // await apiClient.put('/user/personalization-preferences', values);
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      message.success(t('messages.settingsSaved'));
    },
    onError: () => {
      message.error(t('messages.settingsSaveError'));
    },
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await saveSettingsMutation.mutateAsync(values);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: any) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      // await apiClient.post('/user/avatar', formData);
      message.success('프로필 이미지가 업데이트되었습니다.');
    } catch (error) {
      message.error('프로필 이미지 업로드에 실패했습니다.');
    }
    return false;
  };

  const previewTheme = (theme: string) => {
    message.info(`${theme} 테마 미리보기 - 실제 적용은 저장 후 반영됩니다.`);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={defaultSettings}
      onFinish={handleSubmit}
    >
      <div style={{ maxWidth: 800 }}>
        {/* 프로필 이미지 */}
        <Card title={
          <Space>
            <UserOutlined />
            <span>프로필 설정</span>
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={24} align="middle">
            <Col>
              <Avatar size={80} src={user?.avatar_url} icon={<UserOutlined />} />
            </Col>
            <Col>
              <Upload
                showUploadList={false}
                beforeUpload={handleAvatarUpload}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />}>
                  프로필 이미지 변경
                </Button>
              </Upload>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  권장 크기: 200x200px, 최대 2MB
                </Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 테마 설정 */}
        <Card title={
          <Space>
            <SettingOutlined />
            <span>테마 설정</span>
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item 
                label="테마 모드"
                name="theme"
              >
                <Radio.Group onChange={(e) => previewTheme(e.target.value)}>
                  <Radio value="light">밝은 테마</Radio>
                  <Radio value="dark">어두운 테마</Radio>
                  <Radio value="auto">시스템 설정</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="기본 색상"
                name="primaryColor"
              >
                <ColorPicker 
                  presets={[
                    {
                      label: '기본 색상',
                      colors: [
                        '#1890ff',
                        '#52c41a',
                        '#faad14',
                        '#f5222d',
                        '#722ed1',
                        '#13c2c2',
                        '#eb2f96',
                        '#fa8c16'
                      ]
                    }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 언어 및 지역 설정 */}
        <Card title="언어 및 지역 설정" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item 
                label={t('settings.language')}
                name="language"
              >
                <Select>
                  {languageOptions.map(lang => (
                    <Option key={lang.value} value={lang.value}>
                      <span style={{ marginRight: 8 }}>{lang.flag}</span>
                      {lang.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label="시간대"
                name="timezone"
              >
                <Select>
                  <Option value="Asia/Seoul">서울 (UTC+9)</Option>
                  <Option value="Asia/Tokyo">도쿄 (UTC+9)</Option>
                  <Option value="America/New_York">뉴욕 (UTC-5)</Option>
                  <Option value="Europe/London">런던 (UTC+0)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item 
                label="날짜 형식"
                name="dateFormat"
              >
                <Select>
                  <Option value="YYYY-MM-DD">2024-01-15</Option>
                  <Option value="MM/DD/YYYY">01/15/2024</Option>
                  <Option value="DD/MM/YYYY">15/01/2024</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 화면 표시 설정 */}
        <Card title={
          <Space>
            <DashboardOutlined />
            <span>화면 표시 설정</span>
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item 
                label="대시보드 레이아웃"
                name="dashboardLayout"
              >
                <Radio.Group>
                  <Radio value="compact">컴팩트</Radio>
                  <Radio value="comfortable">일반</Radio>
                  <Radio value="spacious">넓게</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="시간 형식"
                name="timeFormat"
              >
                <Radio.Group>
                  <Radio value="24h">24시간 (14:30)</Radio>
                  <Radio value="12h">12시간 (2:30 PM)</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item 
                label={`글꼴 크기: ${form.getFieldValue('fontSize') || 14}px`}
                name="fontSize"
              >
                <Slider
                  min={12}
                  max={18}
                  step={1}
                  marks={{
                    12: '작게',
                    14: '기본',
                    16: '크게',
                    18: '매우 크게'
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 기능 설정 */}
        <Card title="기능 설정" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 24]}>
            <Col span={12}>
              <Form.Item name="sidebarCollapsed" valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>사이드바 자동 접기</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="showAvatars" valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>프로필 이미지 표시</Text>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="animationsEnabled" valuePropName="checked">
                <div>
                  <Switch />
                  <Text style={{ marginLeft: 8 }}>애니메이션 효과</Text>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 저장 및 초기화 버튼 */}
        <div style={{ textAlign: 'center' }}>
          <Space>
            <Button 
              onClick={() => {
                form.setFieldsValue(defaultSettings);
                message.info('기본 설정으로 초기화되었습니다.');
              }}
            >
              기본값으로 초기화
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              style={{ minWidth: 120 }}
            >
              설정 저장
            </Button>
          </Space>
        </div>
      </div>
    </Form>
  );
};