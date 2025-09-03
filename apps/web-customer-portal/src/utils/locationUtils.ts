/**
 * 위치 관련 유틸리티 함수들
 */

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

/**
 * 두 지점 간의 거리를 미터 단위로 계산 (Haversine 공식)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위 거리
};

/**
 * 사용자의 현재 위치가 회사 위치 반경 내에 있는지 확인
 */
export const isWithinCompanyLocation = (
  userLat: number,
  userLon: number,
  companyLocation: Location
): boolean => {
  const distance = calculateDistance(
    userLat,
    userLon,
    companyLocation.latitude,
    companyLocation.longitude
  );
  return distance <= companyLocation.radius;
};

/**
 * 사용자 위치에서 가장 가까운 회사 위치를 찾기
 */
export const findNearestCompanyLocation = (
  userLat: number,
  userLon: number,
  companyLocations: Location[]
): Location | null => {
  if (companyLocations.length === 0) return null;

  let nearestLocation = companyLocations[0];
  let shortestDistance = calculateDistance(
    userLat,
    userLon,
    nearestLocation.latitude,
    nearestLocation.longitude
  );

  for (let i = 1; i < companyLocations.length; i++) {
    const distance = calculateDistance(
      userLat,
      userLon,
      companyLocations[i].latitude,
      companyLocations[i].longitude
    );
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestLocation = companyLocations[i];
    }
  }

  return nearestLocation;
};

/**
 * 사용자가 출근 가능한 회사 위치들을 찾기 (반경 내에 있는 모든 위치)
 */
export const findValidAttendanceLocations = (
  userLat: number,
  userLon: number,
  companyLocations: Location[]
): Location[] => {
  return companyLocations.filter(location =>
    isWithinCompanyLocation(userLat, userLon, location)
  );
};

/**
 * 현재 위치 권한 요청 및 위치 정보 가져오기
 */
export const getCurrentPosition = (simulatedLocation?: {lat: number, lng: number}): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    // 시뮬레이션된 위치가 있으면 사용
    if (simulatedLocation) {
      console.log('🎯 시뮬레이션 위치 사용 중:', {
        '시뮬레이션': simulatedLocation,
        '실제GPS': '사용안함',
        '모드': '테스트모드'
      });
      const mockPosition = {
        coords: {
          latitude: simulatedLocation.lat,
          longitude: simulatedLocation.lng,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
        toJSON: () => ({
          coords: {
            latitude: simulatedLocation.lat,
            longitude: simulatedLocation.lng,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        }),
      } as GeolocationPosition;
      resolve(mockPosition);
      return;
    }

    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => resolve(position),
      error => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1분 캐시
      }
    );
  });
};

/**
 * 위치 권한 상태 확인
 */
export const checkLocationPermission = async (): Promise<PermissionState> => {
  if (!navigator.permissions) {
    throw new Error('Permissions API not supported');
  }

  const permission = await navigator.permissions.query({ name: 'geolocation' });
  return permission.state;
};

/**
 * 자동 출근 체크를 위한 위치 검증
 */
export interface AttendanceLocationResult {
  isValid: boolean;
  location?: Location;
  distance?: number;
  allNearbyLocations: Array<Location & { distance: number }>;
  message: string;
  currentLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  isWithinRange?: boolean;
}

export const validateAttendanceLocation = async (
  companyLocations: Location[],
  simulatedLocation?: {lat: number, lng: number}
): Promise<AttendanceLocationResult> => {
  try {
    // 현재 위치 가져오기
    const position = await getCurrentPosition(simulatedLocation);
    const { latitude, longitude } = position.coords;

    console.log('User current position:', { latitude, longitude });
    console.log('Company locations:', companyLocations);

    // 모든 회사 위치와의 거리 계산
    const locationsWithDistance = companyLocations.map(location => {
      const distance = calculateDistance(latitude, longitude, location.latitude, location.longitude);
      console.log(`Distance to ${location.name}:`, {
        userLat: latitude,
        userLng: longitude,
        companyLat: location.latitude,
        companyLng: location.longitude,
        distance: distance,
        radius: location.radius,
        isWithinRange: distance <= location.radius
      });
      
      return {
        ...location,
        distance: distance
      };
    });

    // 거리순으로 정렬
    locationsWithDistance.sort((a, b) => a.distance - b.distance);

    // 출근 가능한 위치들 찾기
    const validLocations = locationsWithDistance.filter(loc => {
      const isValid = loc.distance <= loc.radius;
      console.log(`${loc.name} validation:`, {
        distance: loc.distance,
        radius: loc.radius,
        isValid: isValid
      });
      return isValid;
    });

    console.log('Valid locations:', validLocations);

    if (validLocations.length > 0) {
      // 가장 가까운 유효한 위치 선택
      const nearestValidLocation = validLocations[0];
      console.log('Selected location:', nearestValidLocation);
      
      return {
        isValid: true,
        location: nearestValidLocation,
        distance: nearestValidLocation.distance,
        allNearbyLocations: locationsWithDistance,
        message: `${nearestValidLocation.name}에서 출근 체크가 가능합니다 (거리: ${formatDistance(nearestValidLocation.distance)})`,
        currentLocation: {
          lat: latitude,
          lng: longitude,
          accuracy: position.coords.accuracy || 10
        },
        isWithinRange: true
      };
    } else {
      // 가장 가까운 위치까지의 거리
      const nearest = locationsWithDistance[0];
      const distanceToNearest = Math.round(nearest.distance - nearest.radius);
      
      console.log('No valid locations found. Nearest:', nearest);
      
      return {
        isValid: false,
        allNearbyLocations: locationsWithDistance,
        message: `회사 위치에서 너무 멀리 떨어져 있습니다. ${nearest.name}까지 약 ${distanceToNearest}m 더 가까이 가주세요. (현재 거리: ${formatDistance(nearest.distance)})`,
        currentLocation: {
          lat: latitude,
          lng: longitude,
          accuracy: position.coords.accuracy || 10
        },
        isWithinRange: false
      };
    }
  } catch (error) {
    console.error('Location validation error:', error);
    return {
      isValid: false,
      allNearbyLocations: [],
      message: '위치 정보를 가져올 수 없습니다. GPS가 켜져 있는지 확인해주세요.',
      isWithinRange: false
    };
  }
};

/**
 * 거리를 사용자 친화적인 형태로 포맷팅
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
};