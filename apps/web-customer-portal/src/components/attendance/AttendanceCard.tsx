import { Card, Button, Typography, Space, Tag, Divider, Alert, App } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, CalendarOutlined, CameraOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useAttendance } from '../../hooks/useAttendance';
import { useAuth } from '../../hooks/useAuth';
import { FaceAuthModal } from './FaceAuthModal';
import { LateApprovalModal } from './LateApprovalModal';
import { validateAttendanceLocation, type Location } from '../../utils/locationUtils';
import type { AttendanceLocationResult } from '../../utils/locationUtils';

const { Title, Text } = Typography;

interface AttendanceCardProps {
  className?: string;
}

export const AttendanceCard = ({ className }: AttendanceCardProps) => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { 
    todayRecord, 
    isLoading, 
    isCheckingIn, 
    isCheckingOut, 
    checkIn, 
    checkOut, 
    getTodayRecord,
    setCurrentUser,
    currentUserId
  } = useAttendance();

  // Face Auth Modal States
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [authType, setAuthType] = useState<'checkin' | 'checkout'>('checkin');
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | undefined>();

  // Late Approval Modal States
  const [showLateApproval, setShowLateApproval] = useState(false);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [pendingPhotoData, setPendingPhotoData] = useState<string>('');

  // Location validation states
  const [locationResult, setLocationResult] = useState<AttendanceLocationResult | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [simulatedLocation, setSimulatedLocation] = useState<{lat: number, lng: number} | null>(null);

  // Mock company locations (in real app, fetch from API)
  const mockCompanyLocations: Location[] = [
    {
      id: '1',
      name: 'Jakarta Office',
      latitude: -6.1944,
      longitude: 106.8229,
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

  useEffect(() => {
    if (user?.id) {
      // Set current user and get their attendance record
      if (currentUserId !== user.id) {
        setCurrentUser(user.id);
      }
      getTodayRecord(user.id).catch((error) => {
        console.error('Failed to fetch today record:', error);
      });
      
      // Check location on component mount
      checkLocationStatus();
    }
  }, [user?.id, getTodayRecord, setCurrentUser, currentUserId]);

  // Check if user is in valid attendance location
  const checkLocationStatus = async () => {
    console.log('AttendanceCard: Starting location check...');
    console.log('현재 시뮬레이션 상태:', {
      '시뮬레이션위치': simulatedLocation,
      '시뮬레이션활성화': simulatedLocation ? 'YES' : 'NO',
      '회사위치들': mockCompanyLocations
    });
    setIsCheckingLocation(true);
    try {
      const result = await validateAttendanceLocation(mockCompanyLocations, simulatedLocation || undefined);
      console.log('AttendanceCard: Location check result:', result);
      setLocationResult(result);
    } catch (error) {
      console.error('AttendanceCard: Location check failed:', error);
      setLocationResult({
        isValid: false,
        allNearbyLocations: [],
        message: '위치 확인에 실패했습니다. GPS가 활성화되어 있는지 확인해주세요.'
      });
    } finally {
      setIsCheckingLocation(false);
    }
  };

  // Test simulation functions
  const simulateOfficeLocation = () => {
    const officeLocation = mockCompanyLocations[0];
    // 정확히 회사 위치에서 50m 떨어진 곳으로 시뮬레이션 (반경 200m 안에 있도록)
    const simLocation = {
      lat: officeLocation.latitude + 0.0004, // 약 44m 북쪽
      lng: officeLocation.longitude + 0.0003  // 약 24m 동쪽 (총 거리 약 50m)
    };
    setSimulatedLocation(simLocation);
    console.log('🏢 시뮬레이션 시작:', {
      '회사위치': { lat: officeLocation.latitude, lng: officeLocation.longitude },
      '시뮬레이션위치': simLocation,
      '예상거리': '약 50m (200m 반경 안)',
      '시뮬레이션상태': '활성화됨'
    });
    message.success(`${officeLocation.name} 근처로 시뮬레이션 중 (50m 거리)`);
    setTimeout(() => {
      console.log('시뮬레이션된 위치로 위치 확인 시작...');
      checkLocationStatus();
    }, 500);
  };

  const simulateOutsideLocation = () => {
    // Jakarta Office에서 약 5km 떨어진 곳 (Monas 근처)
    setSimulatedLocation({
      lat: -6.1754,
      lng: 106.8272
    });
    message.info('회사 외부 위치로 시뮬레이션됩니다 (약 5km 거리)');
    setTimeout(() => {
      checkLocationStatus();
    }, 500);
  };

  const handleCheckIn = async () => {
    if (!user?.id) {
      message.error('사용자 정보를 확인할 수 없습니다');
      return;
    }

    console.log('AttendanceCard: handleCheckIn started');
    
    // 이미 위치가 확인되었고 유효하다면 바로 얼굴 인증으로 진행
    if (locationResult && locationResult.isValid) {
      console.log('AttendanceCard: Using already validated location, proceeding to face auth');
      
      // 시뮬레이션된 위치 또는 실제 위치 사용
      const locationToUse = simulatedLocation || (locationResult.location ? {
        lat: locationResult.location.latitude,
        lng: locationResult.location.longitude
      } : undefined);
      
      setPendingLocation(locationToUse);
      setAuthType('checkin');
      setShowFaceAuth(true);
      return;
    }

    // 위치가 확인되지 않았거나 유효하지 않다면 새로 확인
    setIsCheckingLocation(true);
    try {
      console.log('AttendanceCard: Checking location for check-in...');
      const locationCheck = await validateAttendanceLocation(mockCompanyLocations, simulatedLocation || undefined);
      console.log('AttendanceCard: Check-in location result:', locationCheck);
      setLocationResult(locationCheck);
      
      if (!locationCheck.isValid) {
        console.log('AttendanceCard: Location invalid, showing warning');
        message.warning(locationCheck.message);
        setIsCheckingLocation(false);
        return;
      }

      console.log('AttendanceCard: Location valid, proceeding to face auth');

      // 유효한 위치이므로 얼굴 인증으로 진행
      const locationToUse = simulatedLocation || {
        lat: locationCheck.location!.latitude,
        lng: locationCheck.location!.longitude
      };
      
      setPendingLocation(locationToUse);
      setAuthType('checkin');
      setShowFaceAuth(true);
      setIsCheckingLocation(false);
    } catch (error: any) {
      message.error(error.message || '위치 확인에 실패했습니다');
      setIsCheckingLocation(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.id) {
      message.error('사용자 정보를 확인할 수 없습니다');
      return;
    }

    // 이미 위치가 확인되었고 유효하다면 바로 얼굴 인증으로 진행
    if (locationResult && locationResult.isValid) {
      console.log('AttendanceCard: Using already validated location for check-out, proceeding to face auth');
      
      // 시뮬레이션된 위치 또는 실제 위치 사용
      const locationToUse = simulatedLocation || (locationResult.location ? {
        lat: locationResult.location.latitude,
        lng: locationResult.location.longitude
      } : undefined);
      
      setPendingLocation(locationToUse);
      setAuthType('checkout');
      setShowFaceAuth(true);
      return;
    }

    // 위치가 확인되지 않았거나 유효하지 않다면 새로 확인
    setIsCheckingLocation(true);
    try {
      const locationCheck = await validateAttendanceLocation(mockCompanyLocations, simulatedLocation || undefined);
      setLocationResult(locationCheck);
      
      if (!locationCheck.isValid) {
        message.warning(locationCheck.message);
        setIsCheckingLocation(false);
        return;
      }

      // 유효한 위치이므로 얼굴 인증으로 진행
      const locationToUse = simulatedLocation || {
        lat: locationCheck.location!.latitude,
        lng: locationCheck.location!.longitude
      };
      
      setPendingLocation(locationToUse);
      setAuthType('checkout');
      setShowFaceAuth(true);
      setIsCheckingLocation(false);
    } catch (error: any) {
      message.error(error.message || '위치 확인에 실패했습니다');
      setIsCheckingLocation(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatWorkDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return 'processing';
      case 'CHECKED_OUT':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return '근무중';
      case 'CHECKED_OUT':
        return '퇴근완료';
      default:
        return '미출근';
    }
  };

  // Check if attendance is late based on work schedule (09:00 AM)
  const isLateAttendance = (currentTime: Date = new Date()) => {
    const workStartTime = new Date();
    workStartTime.setHours(9, 0, 0, 0); // 9:00 AM
    return currentTime > workStartTime;
  };

  // Calculate late minutes
  const calculateLateMinutes = (currentTime: Date = new Date()) => {
    const workStartTime = new Date();
    workStartTime.setHours(9, 0, 0, 0); // 9:00 AM
    
    if (currentTime <= workStartTime) return 0;
    
    return Math.floor((currentTime.getTime() - workStartTime.getTime()) / (1000 * 60));
  };

  // Handle face authentication success
  const handleFaceAuthSuccess = async (photoData: string) => {
    if (!user?.id) return;

    const now = new Date();
    const isLate = authType === 'checkin' && isLateAttendance(now);
    
    if (isLate) {
      // Show late approval modal
      const lateMinutes = calculateLateMinutes(now);
      setLateMinutes(lateMinutes);
      setPendingPhotoData(photoData);
      setShowFaceAuth(false);
      setShowLateApproval(true);
    } else {
      // Process attendance directly
      await processAttendance(photoData);
    }
  };

  // Handle late approval submission
  const handleLateApprovalSubmit = async (reason: string) => {
    if (!user?.id) return;

    try {
      // Process attendance with late approval
      await processAttendance(pendingPhotoData);
      
      // Store late approval request (in real app, send to backend)
      const lateRequest = {
        userId: user.id,
        date: new Date().toISOString().split('T')[0],
        lateMinutes,
        reason,
        photoData: pendingPhotoData,
        status: 'PENDING_APPROVAL',
        submittedAt: new Date().toISOString()
      };
      
      const existingRequests = JSON.parse(localStorage.getItem('nova_hr_late_requests') || '[]');
      existingRequests.push(lateRequest);
      localStorage.setItem('nova_hr_late_requests', JSON.stringify(existingRequests));
      
      setShowLateApproval(false);
      message.success('지각 사유가 관리자에게 전송되었습니다. 승인 결과를 기다려주세요.');
    } catch (error: any) {
      message.error(error.message || '처리 중 오류가 발생했습니다');
    }
  };

  // Process actual attendance
  const processAttendance = async (photoData: string) => {
    if (!user?.id) return;

    try {
      if (authType === 'checkin') {
        await checkIn(user.id, pendingLocation);
        message.success('출근 처리가 완료되었습니다!');
      } else {
        await checkOut(user.id, pendingLocation);
        message.success('퇴근 처리가 완료되었습니다!');
      }
      
      // Store face photo (in real app, send to backend)
      const attendancePhoto = {
        userId: user.id,
        type: authType,
        photoData,
        timestamp: new Date().toISOString()
      };
      
      const existingPhotos = JSON.parse(localStorage.getItem('nova_hr_attendance_photos') || '[]');
      existingPhotos.push(attendancePhoto);
      localStorage.setItem('nova_hr_attendance_photos', JSON.stringify(existingPhotos));
      
    } catch (error: any) {
      message.error(error.message || '처리 중 오류가 발생했습니다');
    }
  };

  // Handle modal cancellation
  const handleFaceAuthCancel = () => {
    setShowFaceAuth(false);
    setPendingLocation(undefined);
    setPendingPhotoData('');
  };

  const handleLateApprovalCancel = () => {
    setShowLateApproval(false);
    setPendingPhotoData('');
    setLateMinutes(0);
  };

  if (isLoading) {
    return (
      <Card className={className} loading>
        <div className="h-48" />
      </Card>
    );
  }

  return (
    <Card 
      className={className}
      title={
        <Space>
          <ClockCircleOutlined />
          오늘의 출퇴근
        </Space>
      }
      extra={
        <Space>
          <Button 
            size="small" 
            type="dashed"
            onClick={simulateOfficeLocation}
            disabled={isCheckingLocation}
          >
            🏢 테스트
          </Button>
          <Button 
            size="small" 
            type="dashed"
            onClick={simulateOutsideLocation}
            disabled={isCheckingLocation}
          >
            🚗 테스트
          </Button>
        </Space>
      }
    >
      <div className="space-y-4">
        {/* Status */}
        <div className="flex justify-between items-center">
          <Text strong>상태</Text>
          <Tag color={getStatusColor(todayRecord?.status || 'ABSENT')}>
            {getStatusText(todayRecord?.status || 'ABSENT')}
          </Tag>
        </div>

        {/* Today's Date */}
        <div className="flex justify-between items-center">
          <Text>
            <CalendarOutlined className="mr-2" />
            오늘 날짜
          </Text>
          <Text>{new Date().toLocaleDateString('ko-KR')}</Text>
        </div>

        <Divider />

        {/* Check-in/out times */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Text>출근 시간</Text>
            <Text strong className="text-green-600">
              {todayRecord?.checkInAt ? formatTime(todayRecord.checkInAt) : '-'}
            </Text>
          </div>
          
          <div className="flex justify-between items-center">
            <Text>퇴근 시간</Text>
            <Text strong className="text-blue-600">
              {todayRecord?.checkOutAt ? formatTime(todayRecord.checkOutAt) : '-'}
            </Text>
          </div>
          
          <div className="flex justify-between items-center">
            <Text>근무 시간</Text>
            <Text strong className="text-purple-600">
              {todayRecord?.workMinutes ? formatWorkDuration(todayRecord.workMinutes) : '-'}
            </Text>
          </div>
        </div>

        <Divider />

        {/* Simulation Status */}
        {simulatedLocation && (
          <div className="mb-4">
            <Alert
              message="🧪 테스트 모드 활성화"
              description={`시뮬레이션된 위치: ${simulatedLocation.lat.toFixed(6)}, ${simulatedLocation.lng.toFixed(6)}`}
              type="info"
              showIcon
              size="small"
              action={
                <Button 
                  size="small" 
                  onClick={() => {
                    setSimulatedLocation(null);
                    setTimeout(checkLocationStatus, 100);
                  }}
                >
                  실제 위치로 복원
                </Button>
              }
            />
          </div>
        )}

        {/* Location Status */}
        <div className="mb-4">
          {isCheckingLocation ? (
            <Alert
              message="위치 확인 중..."
              type="info"
              showIcon
              size="small"
            />
          ) : locationResult ? (
            <Alert
              message={locationResult.isValid ? "출근 가능한 위치입니다" : "출근 불가능한 위치입니다"}
              description={locationResult.message}
              type={locationResult.isValid ? "success" : "warning"}
              showIcon
              size="small"
              action={
                <Button 
                  size="small" 
                  onClick={checkLocationStatus}
                  loading={isCheckingLocation}
                >
                  위치 재확인
                </Button>
              }
            />
          ) : (
            <Alert
              message="위치 확인이 필요합니다"
              description="GPS를 활성화하고 위치 권한을 허용해주세요"
              type="info"
              showIcon
              size="small"
              action={
                <Button 
                  size="small" 
                  onClick={checkLocationStatus}
                  loading={isCheckingLocation}
                >
                  위치 확인
                </Button>
              }
            />
          )}
        </div>

        {/* Previous Location info */}
        {todayRecord?.location && (
          <div className="mb-4">
            <Text className="text-gray-500">
              <EnvironmentOutlined className="mr-1" />
              이전 출근 위치: {todayRecord.location.address || `${todayRecord.location.lat}, ${todayRecord.location.lng}`}
            </Text>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {!todayRecord?.checkInAt ? (
            <Button
              type="primary"
              size="large"
              block
              icon={<ClockCircleOutlined />}
              loading={isCheckingIn || isCheckingLocation}
              onClick={handleCheckIn}
              disabled={locationResult && !locationResult.isValid}
            >
              {isCheckingLocation ? '위치 확인 중...' : '출근하기'}
            </Button>
          ) : !todayRecord?.checkOutAt ? (
            <Button
              type="default"
              size="large"
              block
              icon={<ClockCircleOutlined />}
              loading={isCheckingOut || isCheckingLocation}
              onClick={handleCheckOut}
              disabled={locationResult && !locationResult.isValid}
            >
              {isCheckingLocation ? '위치 확인 중...' : '퇴근하기'}
            </Button>
          ) : (
            <Button
              size="large"
              block
              disabled
              icon={<ClockCircleOutlined />}
            >
              오늘 근무 완료
            </Button>
          )}
        </div>
      </div>

      {/* Face Authentication Modal */}
      <FaceAuthModal
        open={showFaceAuth}
        onCancel={handleFaceAuthCancel}
        onSuccess={handleFaceAuthSuccess}
        type={authType}
        isLateAttendance={authType === 'checkin' && isLateAttendance()}
      />

      {/* Late Approval Modal */}
      <LateApprovalModal
        open={showLateApproval}
        onCancel={handleLateApprovalCancel}
        onSubmit={handleLateApprovalSubmit}
        lateMinutes={lateMinutes}
      />
    </Card>
  );
};