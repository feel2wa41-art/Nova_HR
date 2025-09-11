import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Select,
  Divider,
  Alert,
  notification,
  Tabs,
  Table,
  Tag,
  Modal,
  Input
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  CameraOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
  WifiOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface AttitudeConfig {
  screenshotInterval: number; // 분 단위
  activityInterval: number; // 초 단위
  idleTimeout: number; // 분 단위
  workingHours: {
    start: string;
    end: string;
  };
  captureSettings: {
    quality: number;
    format: 'png' | 'jpeg';
    blurSensitive: boolean;
    multiMonitor: boolean;
  };
  features: {
    screenshot: boolean;
    activity: boolean;
    appUsage: boolean;
    webUsage: boolean;
    idleDetection: boolean;
  };
}

interface AppWhitelist {
  id: string;
  app_name: string;
  category: string;
  is_productive: boolean;
  description?: string;
}

export const AttitudeSettings = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [appForm] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingApp, setEditingApp] = useState<AppWhitelist | null>(null);

  // 설정 조회
  const { data: config, isLoading } = useQuery({
    queryKey: ['attitude-settings'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/attitude/settings');
        return response.data;
      } catch {
        // 기본값 반환
        return {
          screenshotInterval: 10, // 10분
          activityInterval: 30, // 30초
          idleTimeout: 5, // 5분
          workingHours: {
            start: '09:00',
            end: '18:00'
          },
          captureSettings: {
            quality: 70,
            format: 'jpeg',
            blurSensitive: true,
            multiMonitor: false
          },
          features: {
            screenshot: true,
            activity: true,
            appUsage: true,
            webUsage: true,
            idleDetection: true
          }
        } as AttitudeConfig;
      }
    }
  });

  // 앱 화이트리스트 조회
  const { data: appWhitelist = [] } = useQuery({
    queryKey: ['app-whitelist'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/attitude/app-whitelist');
        return response.data;
      } catch {
        // 기본 앱 목록
        return [
          { id: '1', app_name: 'Visual Studio Code', category: 'PRODUCTIVITY', is_productive: true, description: '개발 도구' },
          { id: '2', app_name: 'Chrome', category: 'BROWSER', is_productive: true, description: '웹 브라우저' },
          { id: '3', app_name: 'Slack', category: 'COMMUNICATION', is_productive: true, description: '업무 메신저' },
          { id: '4', app_name: 'Microsoft Teams', category: 'COMMUNICATION', is_productive: true, description: '협업 도구' },
          { id: '5', app_name: 'Notion', category: 'PRODUCTIVITY', is_productive: true, description: '문서 도구' }
        ];
      }
    }
  });

  // 설정 저장
  const saveMutation = useMutation({
    mutationFn: async (values: AttitudeConfig) => {
      const response = await apiClient.put('/attitude/settings', values);
      return response.data;
    },
    onSuccess: () => {
      notification.success({
        message: '설정 저장 완료',
        description: '태도 모니터링 설정이 저장되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['attitude-settings'] });
    },
    onError: (error: any) => {
      notification.error({
        message: '설정 저장 실패',
        description: error?.response?.data?.message || '설정을 저장하는 중 오류가 발생했습니다.'
      });
    }
  });

  // 앱 추가/수정
  const saveAppMutation = useMutation({
    mutationFn: async (values: Partial<AppWhitelist>) => {
      if (editingApp) {
        // 수정
        const response = await apiClient.put(`/attitude/app-whitelist/${editingApp.id}`, values);
        return response.data;
      } else {
        // 추가
        const response = await apiClient.post('/attitude/app-whitelist', values);
        return response.data;
      }
    },
    onSuccess: () => {
      notification.success({
        message: editingApp ? '앱 수정 완료' : '앱 추가 완료',
        description: '화이트리스트가 업데이트되었습니다.'
      });
      setIsModalVisible(false);
      setEditingApp(null);
      appForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['app-whitelist'] });
    },
    onError: (error: any) => {
      notification.error({
        message: editingApp ? '앱 수정 실패' : '앱 추가 실패',
        description: error?.response?.data?.message || '앱을 저장하는 중 오류가 발생했습니다.'
      });
    }
  });

  // 앱 삭제
  const deleteAppMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/attitude/app-whitelist/${id}`);
      return response.data;
    },
    onSuccess: () => {
      notification.success({
        message: '앱 삭제 완료',
        description: '화이트리스트에서 제거되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['app-whitelist'] });
    },
    onError: (error: any) => {
      notification.error({
        message: '앱 삭제 실패',
        description: error?.response?.data?.message || '앱을 삭제하는 중 오류가 발생했습니다.'
      });
    }
  });

  useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    }
  }, [config, form]);

  const handleSave = () => {
    form.validateFields().then(values => {
      saveMutation.mutate(values);
    });
  };

  const handleAddApp = () => {
    setEditingApp(null);
    appForm.resetFields();
    setIsModalVisible(true);
  };

  const handleEditApp = (app: AppWhitelist) => {
    setEditingApp(app);
    appForm.setFieldsValue(app);
    setIsModalVisible(true);
  };

  const handleDeleteApp = (id: string) => {
    Modal.confirm({
      title: '앱 삭제',
      content: '이 앱을 화이트리스트에서 제거하시겠습니까?',
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => deleteAppMutation.mutate(id)
    });
  };

  const handleAppSubmit = () => {
    appForm.validateFields().then(values => {
      saveAppMutation.mutate(values);
    });
  };

  const columns = [
    {
      title: '앱 이름',
      dataIndex: 'app_name',
      key: 'app_name',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        const colors: Record<string, string> = {
          PRODUCTIVITY: 'blue',
          BROWSER: 'green',
          COMMUNICATION: 'cyan',
          DEVELOPMENT: 'purple',
          DESIGN: 'magenta',
          OTHER: 'default'
        };
        return <Tag color={colors[category] || 'default'}>{category}</Tag>;
      }
    },
    {
      title: '생산적',
      dataIndex: 'is_productive',
      key: 'is_productive',
      render: (isProductive: boolean) => (
        <Tag color={isProductive ? 'success' : 'error'}>
          {isProductive ? '예' : '아니오'}
        </Tag>
      )
    },
    {
      title: '설명',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '작업',
      key: 'actions',
      render: (_: any, record: AppWhitelist) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditApp(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteApp(record.id)}
          />
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <SettingOutlined className="mr-2" />
          태도 모니터링 설정
        </Title>
        <Text className="text-gray-600">
          데스크톱 에이전트의 모니터링 동작을 설정합니다
        </Text>
      </div>

      <Tabs defaultActiveKey="general">
        <TabPane tab="일반 설정" key="general">
          <Form
            form={form}
            layout="vertical"
            initialValues={config}
          >
            <Row gutter={24}>
              <Col span={12}>
                <Card title={<><CameraOutlined /> 스크린샷 설정</>}>
                  <Form.Item
                    label="캡처 주기 (분)"
                    name={['screenshotInterval']}
                    rules={[{ required: true, message: '캡처 주기를 입력하세요' }]}
                  >
                    <InputNumber
                      min={1}
                      max={60}
                      addonAfter="분"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item
                    label="이미지 품질"
                    name={['captureSettings', 'quality']}
                  >
                    <InputNumber
                      min={10}
                      max={100}
                      addonAfter="%"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item
                    label="이미지 형식"
                    name={['captureSettings', 'format']}
                  >
                    <Select>
                      <Option value="jpeg">JPEG (작은 용량)</Option>
                      <Option value="png">PNG (높은 품질)</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name={['captureSettings', 'blurSensitive']}
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="민감정보 블러 켜짐" unCheckedChildren="민감정보 블러 꺼짐" />
                  </Form.Item>

                  <Form.Item
                    name={['captureSettings', 'multiMonitor']}
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="멀티모니터 캡처" unCheckedChildren="주 모니터만" />
                  </Form.Item>
                </Card>
              </Col>

              <Col span={12}>
                <Card title={<><ClockCircleOutlined /> 활동 추적 설정</>}>
                  <Form.Item
                    label="활동 데이터 전송 주기 (초)"
                    name={['activityInterval']}
                    rules={[{ required: true, message: '전송 주기를 입력하세요' }]}
                  >
                    <InputNumber
                      min={10}
                      max={300}
                      addonAfter="초"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item
                    label="유휴 시간 감지 (분)"
                    name={['idleTimeout']}
                    rules={[{ required: true, message: '유휴 시간을 입력하세요' }]}
                  >
                    <InputNumber
                      min={1}
                      max={30}
                      addonAfter="분"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Divider />

                  <Form.Item label="근무 시간">
                    <Space>
                      <Form.Item name={['workingHours', 'start']} noStyle>
                        <Input style={{ width: 100 }} placeholder="09:00" />
                      </Form.Item>
                      <span>~</span>
                      <Form.Item name={['workingHours', 'end']} noStyle>
                        <Input style={{ width: 100 }} placeholder="18:00" />
                      </Form.Item>
                    </Space>
                  </Form.Item>
                </Card>
              </Col>
            </Row>

            <Row gutter={24} className="mt-6">
              <Col span={24}>
                <Card title={<><DesktopOutlined /> 기능 활성화</>}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        name={['features', 'screenshot']}
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="스크린샷 켜짐" unCheckedChildren="스크린샷 꺼짐" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={['features', 'activity']}
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="활동 추적 켜짐" unCheckedChildren="활동 추적 꺼짐" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={['features', 'appUsage']}
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="앱 사용 켜짐" unCheckedChildren="앱 사용 꺼짐" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={['features', 'webUsage']}
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="웹 사용 켜짐" unCheckedChildren="웹 사용 꺼짐" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={['features', 'idleDetection']}
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="유휴 감지 켜짐" unCheckedChildren="유휴 감지 꺼짐" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            <div className="mt-6 flex justify-end">
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saveMutation.isPending}
              >
                설정 저장
              </Button>
            </div>
          </Form>
        </TabPane>

        <TabPane tab="앱 화이트리스트" key="whitelist">
          <Card
            title={<><AppstoreOutlined /> 생산적 앱 관리</>}
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddApp}
              >
                앱 추가
              </Button>
            }
          >
            <Alert
              message="생산적으로 분류할 애플리케이션을 관리합니다"
              description="여기에 등록된 앱은 생산성 점수 계산 시 긍정적으로 반영됩니다."
              type="info"
              showIcon
              className="mb-4"
            />
            
            <Table
              columns={columns}
              dataSource={appWhitelist}
              rowKey="id"
              pagination={false}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 앱 추가/수정 모달 */}
      <Modal
        title={editingApp ? '앱 수정' : '앱 추가'}
        open={isModalVisible}
        onOk={handleAppSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingApp(null);
          appForm.resetFields();
        }}
        confirmLoading={saveAppMutation.isPending}
      >
        <Form
          form={appForm}
          layout="vertical"
        >
          <Form.Item
            label="앱 이름"
            name="app_name"
            rules={[{ required: true, message: '앱 이름을 입력하세요' }]}
          >
            <Input placeholder="예: Visual Studio Code" />
          </Form.Item>

          <Form.Item
            label="카테고리"
            name="category"
            rules={[{ required: true, message: '카테고리를 선택하세요' }]}
          >
            <Select>
              <Option value="PRODUCTIVITY">생산성</Option>
              <Option value="BROWSER">브라우저</Option>
              <Option value="COMMUNICATION">커뮤니케이션</Option>
              <Option value="DEVELOPMENT">개발</Option>
              <Option value="DESIGN">디자인</Option>
              <Option value="OTHER">기타</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="생산적 앱 여부"
            name="is_productive"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="예" unCheckedChildren="아니오" />
          </Form.Item>

          <Form.Item
            label="설명"
            name="description"
          >
            <Input.TextArea rows={2} placeholder="앱에 대한 간단한 설명" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};