import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Select, 
  DatePicker, 
  Switch, 
  Button, 
  Space, 
  Tag, 
  List, 
  Card,
  Tabs,
  message,
  Row,
  Col,
  Typography
} from 'antd';
import { UserOutlined, StarOutlined, CalendarOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

interface User {
  id: string;
  name: string;
  email: string;
  title?: string;
}

interface CommonCode {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface UserPosition {
  id: string;
  position_code_id: string;
  effective_date: string;
  end_date?: string;
  is_primary: boolean;
  position_code: {
    id: string;
    code: string;
    name: string;
    category: {
      category_name: string;
    };
  };
}

interface UserGrade {
  id: string;
  grade_code_id: string;
  effective_date: string;
  end_date?: string;
  is_primary: boolean;
  grade_code: {
    id: string;
    code: string;
    name: string;
    category: {
      category_name: string;
    };
  };
}

interface UserPositionGradeModalProps {
  visible: boolean;
  user: User | null;
  onCancel: () => void;
  onSuccess: () => void;
  companyId: string;
}

const UserPositionGradeModal: React.FC<UserPositionGradeModalProps> = ({
  visible,
  user,
  onCancel,
  onSuccess,
  companyId
}) => {
  const [positions, setPositions] = useState<CommonCode[]>([]);
  const [grades, setGrades] = useState<CommonCode[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [userGrades, setUserGrades] = useState<UserGrade[]>([]);
  const [loading, setLoading] = useState(false);

  const [positionForm] = Form.useForm();
  const [gradeForm] = Form.useForm();

  useEffect(() => {
    if (visible && user) {
      fetchCommonCodes();
      fetchUserPositions();
      fetchUserGrades();
    }
  }, [visible, user]);

  const fetchCommonCodes = async () => {
    try {
      const [positionResponse, gradeResponse] = await Promise.all([
        api.get(`/common-codes/company/${companyId}/category/POSITION/codes`),
        api.get(`/common-codes/company/${companyId}/category/GRADE/codes`)
      ]);
      setPositions(positionResponse.data);
      setGrades(gradeResponse.data);
    } catch (error) {
      message.error('공통코드 조회에 실패했습니다.');
    }
  };

  const fetchUserPositions = async () => {
    if (!user) return;
    try {
      const response = await api.get(`/common-codes/users/${user.id}/positions`);
      setUserPositions(response.data);
    } catch (error) {
      message.error('사용자 직급 조회에 실패했습니다.');
    }
  };

  const fetchUserGrades = async () => {
    if (!user) return;
    try {
      const response = await api.get(`/common-codes/users/${user.id}/grades`);
      setUserGrades(response.data);
    } catch (error) {
      message.error('사용자 등급 조회에 실패했습니다.');
    }
  };

  const handleAssignPosition = async (values: any) => {
    if (!user) return;
    setLoading(true);
    try {
      await api.post(`/common-codes/users/${user.id}/positions`, {
        ...values,
        effective_date: values.effective_date?.toDate()
      });
      message.success('직급이 할당되었습니다.');
      positionForm.resetFields();
      fetchUserPositions();
      onSuccess();
    } catch (error) {
      message.error('직급 할당에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignGrade = async (values: any) => {
    if (!user) return;
    setLoading(true);
    try {
      await api.post(`/common-codes/users/${user.id}/grades`, {
        ...values,
        effective_date: values.effective_date?.toDate()
      });
      message.success('등급이 할당되었습니다.');
      gradeForm.resetFields();
      fetchUserGrades();
      onSuccess();
    } catch (error) {
      message.error('등급 할당에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          {user?.name}님의 직급/등급 관리
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {user && (
        <div>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>이름:</Text> {user.name}
              </Col>
              <Col span={8}>
                <Text strong>이메일:</Text> {user.email}
              </Col>
              <Col span={8}>
                <Text strong>직책:</Text> {user.title || '-'}
              </Col>
            </Row>
          </Card>

          <Tabs defaultActiveKey="positions">
            <TabPane 
              tab={
                <Space>
                  <UserOutlined />
                  직급 관리
                </Space>
              } 
              key="positions"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="직급 할당" size="small">
                    <Form
                      form={positionForm}
                      layout="vertical"
                      onFinish={handleAssignPosition}
                    >
                      <Form.Item
                        name="position_code_id"
                        label="직급"
                        rules={[{ required: true, message: '직급을 선택하세요' }]}
                      >
                        <Select placeholder="직급 선택">
                          {positions.map(position => (
                            <Option key={position.id} value={position.id}>
                              {position.name} ({position.code})
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="effective_date"
                        label="발효일"
                        initialValue={dayjs()}
                        rules={[{ required: true, message: '발효일을 선택하세요' }]}
                      >
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        name="is_primary"
                        label="주 직급"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch checkedChildren="주직급" unCheckedChildren="부직급" />
                      </Form.Item>

                      <Form.Item>
                        <Button 
                          type="primary" 
                          htmlType="submit"
                          loading={loading}
                          block
                        >
                          직급 할당
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>

                <Col span={12}>
                  <Card title="현재 직급" size="small">
                    <List
                      dataSource={userPositions}
                      renderItem={(position) => (
                        <List.Item>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Space>
                              <Tag color="blue">{position.position_code.name}</Tag>
                              {position.is_primary && <Tag color="gold">주직급</Tag>}
                              {!position.end_date && <Tag color="green">활성</Tag>}
                            </Space>
                            <Space size="small">
                              <CalendarOutlined />
                              <Text type="secondary">
                                {dayjs(position.effective_date).format('YYYY-MM-DD')}
                                {position.end_date && ` ~ ${dayjs(position.end_date).format('YYYY-MM-DD')}`}
                              </Text>
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                      locale={{ emptyText: '할당된 직급이 없습니다.' }}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane 
              tab={
                <Space>
                  <StarOutlined />
                  등급 관리
                </Space>
              } 
              key="grades"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="등급 할당" size="small">
                    <Form
                      form={gradeForm}
                      layout="vertical"
                      onFinish={handleAssignGrade}
                    >
                      <Form.Item
                        name="grade_code_id"
                        label="등급"
                        rules={[{ required: true, message: '등급을 선택하세요' }]}
                      >
                        <Select placeholder="등급 선택">
                          {grades.map(grade => (
                            <Option key={grade.id} value={grade.id}>
                              {grade.name} ({grade.code})
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        name="effective_date"
                        label="발효일"
                        initialValue={dayjs()}
                        rules={[{ required: true, message: '발효일을 선택하세요' }]}
                      >
                        <DatePicker style={{ width: '100%' }} />
                      </Form.Item>

                      <Form.Item
                        name="is_primary"
                        label="주 등급"
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch checkedChildren="주등급" unCheckedChildren="부등급" />
                      </Form.Item>

                      <Form.Item>
                        <Button 
                          type="primary" 
                          htmlType="submit"
                          loading={loading}
                          block
                        >
                          등급 할당
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>

                <Col span={12}>
                  <Card title="현재 등급" size="small">
                    <List
                      dataSource={userGrades}
                      renderItem={(grade) => (
                        <List.Item>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Space>
                              <Tag color="purple">{grade.grade_code.name}</Tag>
                              {grade.is_primary && <Tag color="gold">주등급</Tag>}
                              {!grade.end_date && <Tag color="green">활성</Tag>}
                            </Space>
                            <Space size="small">
                              <CalendarOutlined />
                              <Text type="secondary">
                                {dayjs(grade.effective_date).format('YYYY-MM-DD')}
                                {grade.end_date && ` ~ ${dayjs(grade.end_date).format('YYYY-MM-DD')}`}
                              </Text>
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                      locale={{ emptyText: '할당된 등급이 없습니다.' }}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button onClick={onCancel}>
              닫기
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default UserPositionGradeModal;