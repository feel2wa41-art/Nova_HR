import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { attendanceService, AttendanceRecord } from '../services/attendance';
import { companyService, CompanyLocation } from '../services/company';
import { authService } from '../services/auth';

interface AttendanceStatus {
  checkInAt?: string;
  checkOutAt?: string;
  status: 'ABSENT' | 'CHECKED_IN' | 'CHECKED_OUT';
  workMinutes?: number;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

// Calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export default function AttendanceScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [cameraPermission, setCameraPermission] = useState<Camera.PermissionStatus | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [nearestOffice, setNearestOffice] = useState<{ office: CompanyLocation; distance: number } | null>(null);
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [companyLocations, setCompanyLocations] = useState<CompanyLocation[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceStatus>({
    status: 'ABSENT'
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await requestPermissions();
    await loadCompanyLocations();
    await loadTodayRecord();
  };

  const requestPermissions = async () => {
    try {
      // Request location permission
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationStatus.status);

      // Request camera permission
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(cameraStatus.status);

      if (locationStatus.status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCurrentLocation(location);
      checkProximityToOffice(location);
    } catch (error) {
      console.error('Location fetch failed:', error);
      Alert.alert('위치 오류', 'GPS 위치를 가져올 수 없습니다. GPS가 켜져 있는지 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyLocations = async () => {
    try {
      const locations = await companyService.getCompanyLocations();
      setCompanyLocations(locations);
      setApiError(null);
    } catch (error) {
      console.error('Failed to load company locations:', error);
      setApiError('회사 위치 정보를 불러올 수 없습니다. 오프라인 모드로 실행됩니다.');
      
      // Use fallback locations for demo
      setCompanyLocations([
        {
          id: '1',
          name: '서울 본사',
          address: '서울특별시 강남구',
          lat: 37.5665,
          lng: 126.9780,
          radius_m: 200,
          is_active: true,
          company_id: '1'
        }
      ]);
    }
  };

  const checkProximityToOffice = (location: Location.LocationObject) => {
    let nearestOfficeData = null;
    let minDistance = Infinity;
    let withinRange = false;

    for (const office of companyLocations) {
      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        office.lat,
        office.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestOfficeData = { office, distance };
      }

      if (distance <= office.radius_m) {
        withinRange = true;
      }
    }

    setNearestOffice(nearestOfficeData);
    setIsWithinRange(withinRange);
  };

  const loadTodayRecord = async () => {
    try {
      const record = await attendanceService.getTodayAttendance();
      
      if (record) {
        setTodayRecord({
          checkInAt: record.check_in_at || undefined,
          checkOutAt: record.check_out_at || undefined,
          status: record.check_out_at ? 'CHECKED_OUT' : (record.check_in_at ? 'CHECKED_IN' : 'ABSENT'),
          workMinutes: record.work_minutes || undefined,
          location: record.check_in_loc ? {
            lat: record.check_in_loc.latitude,
            lng: record.check_in_loc.longitude,
            address: record.check_in_loc.address
          } : undefined
        });
      } else {
        setTodayRecord({ status: 'ABSENT' });
      }
      setApiError(null);
    } catch (error) {
      console.error('Failed to load today record:', error);
      setApiError('오늘 출퇴근 기록을 불러올 수 없습니다.');
      setTodayRecord({ status: 'ABSENT' });
    }
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      Alert.alert('위치 오류', '현재 위치를 확인할 수 없습니다. 위치를 새로고침해주세요.');
      return;
    }

    if (!isWithinRange) {
      Alert.alert(
        '위치 오류',
        `회사 위치에서 너무 멀리 떨어져 있습니다.\n가장 가까운 사무실(${nearestOffice?.office.name})까지 ${Math.round(nearestOffice?.distance || 0)}m\n\n소급 신청을 하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '소급 신청',
            onPress: () => handleOutOfRangeCheckIn()
          }
        ]
      );
      return;
    }

    await performCheckIn();
  };

  const performCheckIn = async () => {
    if (!currentLocation) return;

    try {
      setIsLoading(true);
      
      const response = await attendanceService.checkIn({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
      });

      if (response.success) {
        await loadTodayRecord(); // Reload to get updated data
        Alert.alert(
          '출근 완료', 
          `출근 처리가 완료되었습니다!\n${response.geofence ? `(${response.geofence.location}에서 ${response.geofence.distance}m)` : ''}`
        );
      }
    } catch (error: any) {
      console.error('Check-in failed:', error);
      const message = error.response?.data?.message || '출근 처리 중 오류가 발생했습니다.';
      Alert.alert('출근 실패', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOutOfRangeCheckIn = async () => {
    if (!currentLocation) return;

    try {
      setIsLoading(true);
      
      // Create attendance request for out-of-range check-in
      await attendanceService.createAttendanceRequest({
        requestType: 'CHECK_IN',
        targetAt: new Date().toISOString(),
        reasonText: '지오펜스 범위 밖에서 출근',
        geoSnapshot: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy || undefined,
          timestamp: new Date().toISOString()
        }
      });

      Alert.alert(
        '소급 신청 완료',
        '출퇴근 소급 신청이 제출되었습니다. 관리자 승인 후 처리됩니다.'
      );
    } catch (error: any) {
      console.error('Attendance request failed:', error);
      const message = error.response?.data?.message || '소급 신청 중 오류가 발생했습니다.';
      Alert.alert('신청 실패', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentLocation) {
      Alert.alert('위치 오류', '현재 위치를 확인할 수 없습니다. 위치를 새로고침해주세요.');
      return;
    }

    Alert.alert(
      '퇴근 처리',
      '퇴근 처리하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '퇴근하기', 
          onPress: () => performCheckOut()
        }
      ]
    );
  };

  const performCheckOut = async () => {
    if (!currentLocation) return;

    try {
      setIsLoading(true);
      
      const response = await attendanceService.checkOut({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
      });

      if (response.success) {
        await loadTodayRecord(); // Reload to get updated data
        Alert.alert(
          '퇴근 완료', 
          `퇴근 처리가 완료되었습니다!\n${response.workHours ? `오늘 근무시간: ${response.workHours}` : ''}`
        );
      }
    } catch (error: any) {
      console.error('Check-out failed:', error);
      const message = error.response?.data?.message || '퇴근 처리 중 오류가 발생했습니다.';
      Alert.alert('퇴근 실패', message);
    } finally {
      setIsLoading(false);
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

  const getStatusChip = () => {
    switch (todayRecord.status) {
      case 'CHECKED_IN':
        return <Chip icon="clock" mode="outlined" textStyle={{ color: '#0ea5e9' }}>근무중</Chip>;
      case 'CHECKED_OUT':
        return <Chip icon="check-circle" mode="outlined" textStyle={{ color: '#22c55e' }}>퇴근완료</Chip>;
      default:
        return <Chip icon="circle" mode="outlined" textStyle={{ color: '#6b7280' }}>미출근</Chip>;
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          onPress: async () => {
            try {
              await authService.logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout failed:', error);
              // Even if logout API fails, clear local data and redirect
              router.replace('/login');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.centerText}>
              오늘의 출퇴근
            </Text>
            <Text variant="bodyMedium" style={[styles.centerText, styles.grayText]}>
              {new Date().toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </Text>
            {apiError && (
              <Text variant="bodySmall" style={[styles.centerText, styles.errorText, styles.marginTop]}>
                ⚠️ {apiError}
              </Text>
            )}
            <View style={styles.chipContainer}>
              {getStatusChip()}
            </View>
          </Card.Content>
        </Card>

        {/* Location Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📍 위치 상태</Text>
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.loadingText}>위치 확인 중...</Text>
              </View>
            ) : locationPermission !== 'granted' ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  위치 권한이 필요합니다
                </Text>
                <Button mode="outlined" onPress={requestPermissions} style={styles.marginTop}>
                  권한 요청
                </Button>
              </View>
            ) : (
              <View>
                {nearestOffice && (
                  <View style={[
                    styles.locationStatus,
                    { backgroundColor: isWithinRange ? '#dcfce7' : '#fed7aa' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: isWithinRange ? '#166534' : '#9a3412' }
                    ]}>
                      {isWithinRange ? '✅ 출근 가능한 위치' : '⚠️ 출근 불가능한 위치'}
                    </Text>
                    <Text style={[
                      styles.distanceText,
                      { color: isWithinRange ? '#16a34a' : '#ea580c' }
                    ]}>
                      {nearestOffice.office.name}까지 {Math.round(nearestOffice.distance)}m
                    </Text>
                  </View>
                )}
                
                <Button mode="outlined" onPress={getCurrentLocation} style={styles.marginTop}>
                  위치 새로고침
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Attendance Times */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>⏰ 출퇴근 시간</Text>
            
            <View style={styles.timeSection}>
              <View style={styles.timeRow}>
                <Text>출근 시간</Text>
                <Text style={styles.checkInTime}>
                  {todayRecord.checkInAt ? formatTime(todayRecord.checkInAt) : '-'}
                </Text>
              </View>
              
              <View style={styles.timeRow}>
                <Text>퇴근 시간</Text>
                <Text style={styles.checkOutTime}>
                  {todayRecord.checkOutAt ? formatTime(todayRecord.checkOutAt) : '-'}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.timeRow}>
                <Text>근무 시간</Text>
                <Text style={styles.workTime}>
                  {todayRecord.workMinutes ? formatWorkDuration(todayRecord.workMinutes) : '-'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <Card style={styles.card}>
          <Card.Content>
            {!todayRecord.checkInAt ? (
              <Button
                mode="contained"
                onPress={handleCheckIn}
                disabled={!isWithinRange || locationPermission !== 'granted'}
                style={styles.actionButton}
              >
                출근하기
              </Button>
            ) : !todayRecord.checkOutAt ? (
              <Button
                mode="contained"
                onPress={handleCheckOut}
                disabled={!isWithinRange || locationPermission !== 'granted'}
                style={styles.actionButton}
              >
                퇴근하기
              </Button>
            ) : (
              <Button mode="outlined" disabled style={styles.actionButton}>
                오늘 근무 완료
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Permission Status */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>🔐 권한 상태</Text>
            <View style={styles.permissionSection}>
              <View style={styles.permissionRow}>
                <Text>위치 권한</Text>
                <Chip
                  mode="outlined"
                  textStyle={{ 
                    color: locationPermission === 'granted' ? '#22c55e' : '#ef4444' 
                  }}
                >
                  {locationPermission === 'granted' ? '허용됨' : '거부됨'}
                </Chip>
              </View>
              
              <View style={styles.permissionRow}>
                <Text>카메라 권한</Text>
                <Chip
                  mode="outlined"
                  textStyle={{ 
                    color: cameraPermission === 'granted' ? '#22c55e' : '#ef4444' 
                  }}
                >
                  {cameraPermission === 'granted' ? '허용됨' : '거부됨'}
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Logout */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.logoutButton}
              textColor="#dc2626"
            >
              로그아웃
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  centerText: {
    textAlign: 'center',
  },
  grayText: {
    color: '#6b7280',
  },
  chipContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#991b1b',
    textAlign: 'center',
  },
  marginTop: {
    marginTop: 8,
  },
  locationStatus: {
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    fontWeight: 'bold',
  },
  distanceText: {
    marginTop: 4,
  },
  timeSection: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkInTime: {
    fontWeight: 'bold',
    color: '#16a34a',
  },
  checkOutTime: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  workTime: {
    fontWeight: 'bold',
    color: '#9333ea',
  },
  divider: {
    marginVertical: 8,
  },
  actionButton: {
    paddingVertical: 8,
  },
  permissionSection: {
    gap: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    borderColor: '#dc2626',
  },
});