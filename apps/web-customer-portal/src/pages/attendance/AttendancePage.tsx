import { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Space, 
  message, 
  Alert, 
  Spin,
  Tag,
  Divider,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  ClockCircleOutlined, 
  EnvironmentOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { validateAttendanceLocation, formatDistance, type Location } from '../../utils/locationUtils';
import type { AttendanceLocationResult } from '../../utils/locationUtils';

const { Title, Text } = Typography;

// Mock 회사 위치 데이터 (실제로는 API에서 가져옴)
const mockCompanyLocations: Location[] = [
  {
    id: '1',
    name: 'Jakarta Head Office',
    latitude: -6.2441,
    longitude: 106.7833,
    radius: 200,
  },
  {
    id: '2',
    name: 'Bandung Branch',
    latitude: -6.9175,
    longitude: 107.6191,
    radius: 150,
  },
];

export const AttendancePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [locationResult, setLocationResult] = useState<AttendanceLocationResult | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [simulatedLocation, setSimulatedLocation] = useState<{lat: number, lng: number} | null>(null);

  // 실시간 시계
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 컴포넌트 마운트 시 위치 확인
  useEffect(() => {
    checkLocation();
  }, []);

  const checkLocation = async () => {
    setIsLoading(true);
    try {
      const result = await validateAttendanceLocation(mockCompanyLocations, simulatedLocation || undefined);
      setLocationResult(result);
    } catch (error) {
      message.error('위치 확인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 테스트용 위치 시뮬레이션
  const simulateOfficeLocation = () => {
    const officeLocation = mockCompanyLocations[0];
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
    // 회사에서 멀리 떨어진 위치 (자카르타 시내 다른 곳)
    setSimulatedLocation({
      lat: -6.1754,
      lng: 106.8272
    });
    message.info('회사 외부 위치로 시뮬레이션됩니다');
    
    setTimeout(() => {
      checkLocation();
    }, 500);
  };

  const handleCheckIn = async () => {
    if (!locationResult?.isValid) {
      message.warning('출근 가능한 위치에 있지 않습니다');
      return;
    }

    setIsLoading(true);
    try {
      // 실제로는 API 호출
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success(`${locationResult.location?.name}에서 출근 체크 완료!`);
    } catch (error) {
      message.error('출근 체크에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationStatusColor = () => {
    if (!locationResult) return 'default';
    return locationResult.isValid ? 'success' : 'error';
  };

  const getLocationStatusIcon = () => {
    if (!locationResult) return <EnvironmentOutlined />;
    return locationResult.isValid ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />;
  };

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
                        size="small"
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

      {/* 출퇴근 버튼 */}
      <Card>
        <div className="text-center space-y-4">
          <Title level={4}>출퇴근 체크</Title>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleCheckIn}
              disabled={!locationResult?.isValid}
              loading={isLoading}
              className="min-w-[120px]"
            >
              출근하기
            </Button>
            <Button
              size="large"
              icon={<CheckCircleOutlined />}
              disabled={!locationResult?.isValid}
              className="min-w-[120px]"
            >
              퇴근하기
            </Button>
          </Space>
          
          {!locationResult?.isValid && (
            <div className="text-sm text-gray-500 mt-4">
              출퇴근 체크를 하려면 회사 위치 반경 내에 있어야 합니다
            </div>
          )}
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
    </div>
  );
};