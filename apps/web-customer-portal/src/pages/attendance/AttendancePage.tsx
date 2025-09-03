import { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Space, 
  Alert, 
  Spin,
  Tag,
  Divider,
  Row,
  Col,
  Statistic,
  Modal,
  Dropdown,
  Form,
  Input,
  Select,
  App
} from 'antd';
import { 
  ClockCircleOutlined, 
  EnvironmentOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DownOutlined,
  HomeOutlined,
  CarOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { validateAttendanceLocation, formatDistance, type Location } from '../../utils/locationUtils';
import type { AttendanceLocationResult } from '../../utils/locationUtils';
import { 
  attendanceApi, 
  companyApi, 
  type AttendanceRecord, 
  type CompanyLocation 
} from '../../lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const AttendancePage = () => {
  const { message } = App.useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [locationResult, setLocationResult] = useState<AttendanceLocationResult | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [simulatedLocation, setSimulatedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [companyLocations, setCompanyLocations] = useState<Location[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [exceptionModalVisible, setExceptionModalVisible] = useState(false);
  const [exceptionType, setExceptionType] = useState<string>('');
  const [form] = Form.useForm();

  // 실시간 시계
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadCompanyLocations(),
      loadTodayAttendance()
    ]);
    await checkLocation();
  };

  const loadCompanyLocations = async () => {
    try {
      const locations = await companyApi.getLocations();
      const convertedLocations: Location[] = locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        radius: loc.radius_m
      }));
      setCompanyLocations(convertedLocations);
      setApiError(null);
    } catch (error) {
      console.error('Failed to load company locations:', error);
      setApiError('회사 위치 정보를 불러올 수 없습니다. 오프라인 모드로 실행됩니다.');
      
      // Fallback to demo data
      setCompanyLocations([
        {
          id: '1',
          name: '서울 본사',
          latitude: 37.5665,
          longitude: 126.9780,
          radius: 200,
        }
      ]);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const attendance = await attendanceApi.getTodayAttendance();
      setTodayAttendance(attendance);
      setApiError(null);
    } catch (error) {
      console.error('Failed to load today attendance:', error);
      setApiError('오늘 출퇴근 기록을 불러올 수 없습니다.');
    }
  };

  const checkLocation = async () => {
    setIsLoading(true);
    try {
      const result = await validateAttendanceLocation(companyLocations, simulatedLocation || undefined);
      setLocationResult(result);
    } catch (error) {
      message.error('위치 확인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 테스트용 위치 시뮬레이션
  const simulateOfficeLocation = () => {
    if (companyLocations.length === 0) {
      message.error('회사 위치 정보가 없습니다');
      return;
    }
    
    const officeLocation = companyLocations[0];
    setSimulatedLocation({
      lat: officeLocation.latitude,
      lng: officeLocation.longitude
    });
    message.success(`${officeLocation.name} 위치로 시뮬레이션됩니다`);
    
    // 시뮬레이션된 위치로 체크
    setTimeout(() => {
      checkLocation();
    }, 500);
  };

  const simulateOutsideLocation = () => {
    // 회사에서 멀리 떨어진 위치 (서울 시내 다른 곳)
    setSimulatedLocation({
      lat: 37.5797,
      lng: 126.9774
    });
    message.info('회사 외부 위치로 시뮬레이션됩니다');
    
    setTimeout(() => {
      checkLocation();
    }, 500);
  };

  const handleCheckIn = async () => {
    if (!locationResult?.currentLocation) {
      message.error('현재 위치를 확인할 수 없습니다');
      return;
    }

    const { currentLocation } = locationResult;

    if (!locationResult.isWithinRange) {
      Modal.confirm({
        title: '지오펜스 범위 밖',
        content: `회사 지정 위치에서 ${formatDistance(locationResult.distance || 0)} 떨어져 있습니다. 소급 신청을 하시겠습니까?`,
        okText: '소급 신청',
        cancelText: '취소',
        onOk: async () => {
          try {
            await attendanceApi.createAttendanceRequest({
              requestType: 'CHECK_IN',
              targetAt: new Date().toISOString(),
              reasonText: '지오펜스 범위 밖에서 출근',
              geoSnapshot: {
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                accuracy: currentLocation.accuracy,
                timestamp: new Date().toISOString()
              }
            });
            message.success('소급 신청이 제출되었습니다');
          } catch (error) {
            console.error('Attendance request failed:', error);
            message.error('소급 신청 중 오류가 발생했습니다');
          }
        }
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await attendanceApi.checkIn({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        accuracy: currentLocation.accuracy
      });

      if (response.success) {
        message.success('출근 처리가 완료되었습니다!');
        await loadTodayAttendance();
      }
    } catch (error: any) {
      console.error('Check-in failed:', error);
      const errorMessage = error.response?.data?.message || '출근 처리 중 오류가 발생했습니다';
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!locationResult?.currentLocation) {
      message.error('현재 위치를 확인할 수 없습니다');
      return;
    }

    const { currentLocation } = locationResult;

    Modal.confirm({
      title: '퇴근 처리',
      content: '퇴근 처리하시겠습니까?',
      okText: '퇴근하기',
      cancelText: '취소',
      onOk: async () => {
        try {
          setIsLoading(true);
          const response = await attendanceApi.checkOut({
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
            accuracy: currentLocation.accuracy
          });

          if (response.success) {
            message.success(`퇴근 처리가 완료되었습니다! ${response.workHours ? `(근무시간: ${response.workHours})` : ''}`);
            await loadTodayAttendance();
          }
        } catch (error: any) {
          console.error('Check-out failed:', error);
          const errorMessage = error.response?.data?.message || '퇴근 처리 중 오류가 발생했습니다';
          message.error(errorMessage);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const getLocationStatusColor = () => {
    if (!locationResult) return 'default';
    return locationResult.isValid ? 'success' : 'error';
  };

  const getLocationStatusIcon = () => {
    if (!locationResult) return <EnvironmentOutlined />;
    return locationResult.isValid ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />;
  };

  const handleException = (type: string) => {
    setExceptionType(type);
    setExceptionModalVisible(true);
    form.resetFields();
  };

  const handleExceptionSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      
      switch (exceptionType) {
        case 'remote':
          await attendanceApi.registerRemoteWork({
            date: new Date().toISOString().split('T')[0],
            reason: values.reason,
            location: values.location,
          });
          message.success('재택근무가 등록되었습니다');
          break;
          
        case 'offsite':
          await attendanceApi.registerOffsiteWork({
            date: new Date().toISOString().split('T')[0],
            reason: values.reason,
            location: values.location,
            client: values.client,
          });
          message.success('외근이 등록되었습니다');
          break;
          
        case 'early':
          await attendanceApi.registerEarlyCheckout({
            reason: values.reason,
            expectedTime: values.expectedTime,
          });
          message.success('조기 퇴근이 등록되었습니다');
          break;
      }
      
      setExceptionModalVisible(false);
      await loadTodayAttendance();
    } catch (error) {
      message.error('등록 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const getExceptionMenuItems = () => [
    {
      key: 'remote',
      label: (
        <span>
          <HomeOutlined /> 재택근무
        </span>
      ),
      onClick: () => handleException('remote'),
    },
    {
      key: 'offsite',
      label: (
        <span>
          <CarOutlined /> 외근
        </span>
      ),
      onClick: () => handleException('offsite'),
    },
    {
      key: 'early',
      label: (
        <span>
          <ToolOutlined /> 조기 퇴근
        </span>
      ),
      onClick: () => handleException('early'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Title level={2}>
          <ClockCircleOutlined className="mr-2" />
          출퇴근 관리
        </Title>
        <p className="text-gray-600">현재 위치에서 출퇴근을 체크하세요</p>
      </div>

      {/* 현재 시간 */}
      <Card>
        <Row gutter={24} align="middle">
          <Col span={12}>
            <Statistic
              title="현재 시간"
              value={currentTime.toLocaleTimeString('ko-KR')}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: '24px', fontWeight: 'bold' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="오늘 날짜"
              value={currentTime.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
              valueStyle={{ fontSize: '16px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 위치 상태 */}
      <Card 
        title={
          <span>
            <EnvironmentOutlined className="mr-2" />
            위치 정보
          </span>
        }
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={checkLocation}
              loading={isLoading}
              size="small"
            >
              새로고침
            </Button>
            <Button 
              onClick={simulateOfficeLocation}
              size="small"
              type="dashed"
            >
              🏢 사무실 위치 테스트
            </Button>
            <Button 
              onClick={simulateOutsideLocation}
              size="small"
              type="dashed"
            >
              🚗 외부 위치 테스트
            </Button>
          </Space>
        }
      >
        {isLoading && !locationResult ? (
          <div className="text-center py-8">
            <Spin size="large" />
            <div className="mt-4 text-gray-500">위치 정보를 확인하는 중...</div>
          </div>
        ) : locationResult ? (
          <div className="space-y-4">
            <Alert
              message={
                <div className="flex items-center justify-between">
                  <span>
                    <Tag color={getLocationStatusColor()} icon={getLocationStatusIcon()}>
                      {locationResult.isValid ? '출근 가능' : '출근 불가'}
                    </Tag>
                    {locationResult.message}
                  </span>
                </div>
              }
              type={locationResult.isValid ? 'success' : 'warning'}
              showIcon
            />

            {simulatedLocation && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <Text strong className="text-blue-800">🧪 테스트 모드 활성화</Text>
                <div className="text-sm text-blue-700 mt-1">
                  시뮬레이션된 위치: {simulatedLocation.lat.toFixed(6)}, {simulatedLocation.lng.toFixed(6)}
                </div>
                <Button 
                  size="small" 
                  onClick={() => {
                    setSimulatedLocation(null);
                    setTimeout(checkLocation, 100);
                  }}
                  className="mt-2"
                >
                  실제 GPS 위치로 돌아가기
                </Button>
              </div>
            )}

            {locationResult.location && (
              <div className="bg-green-50 p-4 rounded-lg">
                <Text strong className="text-green-800">선택된 위치: {locationResult.location.name}</Text>
                <div className="text-sm text-green-700 mt-1">
                  현재 위치에서 {formatDistance(locationResult.distance || 0)} 떨어져 있습니다
                </div>
              </div>
            )}

            {/* 주변 회사 위치들 */}
            <div>
              <Text strong>주변 회사 위치</Text>
              <div className="mt-2 space-y-2">
                {locationResult.allNearbyLocations.map((location) => (
                  <div 
                    key={location.id} 
                    className={`flex justify-between items-center p-3 border rounded-lg ${
                      location.distance <= location.radius ? 'border-green-300 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{location.name}</div>
                      <div className="text-sm text-gray-500">
                        허용 반경: {formatDistance(location.radius)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatDistance(location.distance)}</div>
                      <Tag 
                        color={location.distance <= location.radius ? 'success' : 'default'}
                      >
                        {location.distance <= location.radius ? '범위 내' : '범위 외'}
                      </Tag>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Alert
            message="위치 정보를 가져올 수 없습니다"
            description="브라우저에서 위치 권한을 허용해주세요"
            type="error"
            showIcon
          />
        )}
      </Card>

      {/* 오늘 출퇴근 현황 */}
      <Card>
        <div className="space-y-4">
          <Title level={4}>오늘 출퇴근 현황</Title>
          
          {apiError && (
            <Alert
              message={apiError}
              type="warning"
              showIcon
              className="mb-4"
            />
          )}

          <Row gutter={24}>
            <Col span={8}>
              <Statistic
                title="출근 시간"
                value={todayAttendance?.check_in_at 
                  ? new Date(todayAttendance.check_in_at).toLocaleTimeString('ko-KR')
                  : '-'
                }
                prefix={<ClockCircleOutlined />}
                valueStyle={{ 
                  color: todayAttendance?.check_in_at ? '#52c41a' : '#d9d9d9' 
                }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="퇴근 시간"
                value={todayAttendance?.check_out_at 
                  ? new Date(todayAttendance.check_out_at).toLocaleTimeString('ko-KR')
                  : '-'
                }
                prefix={<ClockCircleOutlined />}
                valueStyle={{ 
                  color: todayAttendance?.check_out_at ? '#1890ff' : '#d9d9d9' 
                }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="근무 시간"
                value={todayAttendance?.work_minutes 
                  ? `${Math.floor(todayAttendance.work_minutes / 60)}시간 ${todayAttendance.work_minutes % 60}분`
                  : '-'
                }
                prefix={<ClockCircleOutlined />}
                valueStyle={{ 
                  color: todayAttendance?.work_minutes ? '#722ed1' : '#d9d9d9' 
                }}
              />
            </Col>
          </Row>

          <Divider />

          <div className="text-center space-y-4">
            <Title level={5}>출퇴근 체크</Title>
            <Space size="large">
              {!todayAttendance?.check_in_at ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleCheckIn}
                  disabled={!locationResult?.currentLocation}
                  loading={isLoading}
                  className="min-w-[120px]"
                >
                  출근하기
                </Button>
              ) : !todayAttendance?.check_out_at ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleCheckOut}
                  disabled={!locationResult?.currentLocation}
                  loading={isLoading}
                  className="min-w-[120px]"
                  danger
                >
                  퇴근하기
                </Button>
              ) : (
                <Button
                  size="large"
                  disabled
                  className="min-w-[120px]"
                >
                  근무 완료
                </Button>
              )}
              
              <Dropdown
                menu={{ items: getExceptionMenuItems() }}
                placement="bottom"
              >
                <Button size="large" className="min-w-[120px]">
                  예외 등록 <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
            
            {!locationResult?.currentLocation && (
              <div className="text-sm text-gray-500 mt-4">
                현재 위치를 확인 중입니다...
              </div>
            )}
            
            {locationResult?.currentLocation && !locationResult.isWithinRange && (
              <div className="text-sm text-orange-600 mt-4">
                회사 위치 반경 밖입니다. 출근 시 소급 신청이 필요합니다.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 위치 권한 안내 */}
      <Card className="bg-blue-50">
        <Alert
          message="위치 기반 출퇴근 시스템"
          description={
            <div className="space-y-2">
              <div>• GPS를 통해 현재 위치를 확인하여 정확한 출퇴근을 관리합니다</div>
              <div>• 회사에서 설정한 허용 반경 내에서만 출퇴근 체크가 가능합니다</div>
              <div>• 여러 지점이 있는 경우 가장 가까운 위치가 자동으로 선택됩니다</div>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>

      {/* 예외처리 모달 */}
      <Modal
        title={
          exceptionType === 'remote' ? '재택근무 등록' :
          exceptionType === 'offsite' ? '외근 등록' :
          exceptionType === 'early' ? '조기 퇴근 등록' : '예외 등록'
        }
        open={exceptionModalVisible}
        onCancel={() => setExceptionModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleExceptionSubmit}
        >
          {exceptionType === 'remote' && (
            <>
              <Form.Item
                name="location"
                label="재택근무 장소"
                rules={[{ required: true, message: '재택근무 장소를 입력해주세요' }]}
              >
                <Input placeholder="예: 자택, 카페 등" />
              </Form.Item>
              <Form.Item
                name="reason"
                label="사유"
                rules={[{ required: true, message: '재택근무 사유를 입력해주세요' }]}
              >
                <TextArea rows={3} placeholder="재택근무 사유를 입력해주세요" />
              </Form.Item>
            </>
          )}

          {exceptionType === 'offsite' && (
            <>
              <Form.Item
                name="location"
                label="외근 장소"
                rules={[{ required: true, message: '외근 장소를 입력해주세요' }]}
              >
                <Input placeholder="예: 고객사, 협력업체 등" />
              </Form.Item>
              <Form.Item
                name="client"
                label="방문 대상"
              >
                <Input placeholder="예: ABC 회사, 김대표 등" />
              </Form.Item>
              <Form.Item
                name="reason"
                label="업무 내용"
                rules={[{ required: true, message: '업무 내용을 입력해주세요' }]}
              >
                <TextArea rows={3} placeholder="외근 업무 내용을 입력해주세요" />
              </Form.Item>
            </>
          )}

          {exceptionType === 'early' && (
            <>
              <Form.Item
                name="expectedTime"
                label="예상 퇴근 시간"
                rules={[{ required: true, message: '예상 퇴근 시간을 선택해주세요' }]}
              >
                <Select placeholder="예상 퇴근 시간을 선택해주세요">
                  <Select.Option value="14:00">14:00</Select.Option>
                  <Select.Option value="15:00">15:00</Select.Option>
                  <Select.Option value="16:00">16:00</Select.Option>
                  <Select.Option value="17:00">17:00</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="reason"
                label="조기 퇴근 사유"
                rules={[{ required: true, message: '조기 퇴근 사유를 입력해주세요' }]}
              >
                <TextArea rows={3} placeholder="조기 퇴근 사유를 입력해주세요" />
              </Form.Item>
            </>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setExceptionModalVisible(false)}>
              취소
            </Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              등록
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};