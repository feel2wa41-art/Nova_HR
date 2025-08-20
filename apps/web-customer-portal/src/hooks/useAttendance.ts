import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'ABSENT';
  workMinutes: number;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

interface AttendanceState {
  todayRecord: AttendanceRecord | null;
  isLoading: boolean;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  currentUserId: string | null;
  
  // Actions
  checkIn: (userId: string, location?: { lat: number; lng: number }) => Promise<void>;
  checkOut: (userId: string, location?: { lat: number; lng: number }) => Promise<void>;
  getTodayRecord: (userId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setCurrentUser: (userId: string) => void;
}

// Mock company locations for validation
const mockCompanyLocations = [
  {
    id: '1',
    name: 'Jakarta Office',
    lat: -6.1944,
    lng: 106.8229,
    radius: 200, // meters
    address: 'Jl. Thamrin No. 1, Jakarta Pusat, DKI Jakarta 10310'
  },
  {
    id: '2', 
    name: 'Bandung Branch',
    lat: -6.9175,
    lng: 107.6191,
    radius: 150, // meters
    address: 'Jl. Asia Afrika No. 8, Bandung, Jawa Barat 40111'
  }
];

// Calculate distance between two coordinates in meters
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // Distance in meters
  return d;
};

// Validate if user is within company location
const validateLocation = (userLat: number, userLng: number): { isValid: boolean; nearestOffice?: any; distance?: number } => {
  let nearestOffice = null;
  let minDistance = Infinity;
  
  for (const office of mockCompanyLocations) {
    const distance = calculateDistance(userLat, userLng, office.lat, office.lng);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestOffice = office;
    }
    
    // If within radius of any office, it's valid
    if (distance <= office.radius) {
      return {
        isValid: true,
        nearestOffice: office,
        distance: Math.round(distance)
      };
    }
  }
  
  return {
    isValid: false,
    nearestOffice,
    distance: Math.round(minDistance)
  };
};

// Helper function to get user-specific localStorage key
const getUserAttendanceKey = (userId: string) => `nova_hr_today_attendance_${userId}`;

// Mock attendance functions
const mockCheckIn = async (userId: string, location?: { lat: number; lng: number }): Promise<AttendanceRecord> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Validate location if provided
  let locationValidation = null;
  let finalLocation = null;
  
  if (location) {
    locationValidation = validateLocation(location.lat, location.lng);
    
    if (!locationValidation.isValid) {
      throw new Error(
        `회사 위치에서 너무 멀리 떨어져 있습니다. ` +
        `가장 가까운 사무실(${locationValidation.nearestOffice?.name})까지 ${locationValidation.distance}m`
      );
    }
    
    finalLocation = {
      lat: location.lat,
      lng: location.lng,
      address: locationValidation.nearestOffice?.address || '위치 확인됨'
    };
  }
  
  return {
    id: `attendance-${userId}-${now.getTime()}`,
    date: today,
    checkInAt: now.toISOString(),
    status: 'CHECKED_IN',
    workMinutes: 0,
    location: finalLocation || {
      lat: -6.1944,
      lng: 106.8229,
      address: 'Jl. Thamrin No. 1, Jakarta Pusat, DKI Jakarta 10310'
    }
  };
};

const mockCheckOut = async (record: AttendanceRecord, location?: { lat: number; lng: number }): Promise<AttendanceRecord> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const now = new Date();
  const checkInTime = new Date(record.checkInAt!);
  const workMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));
  
  return {
    ...record,
    checkOutAt: now.toISOString(),
    status: 'CHECKED_OUT',
    workMinutes,
    location: location || record.location
  };
};

const mockGetTodayRecord = async (userId: string): Promise<AttendanceRecord | null> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if there's a saved record for today for this specific user
  const userKey = getUserAttendanceKey(userId);
  const saved = localStorage.getItem(userKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const today = new Date().toISOString().split('T')[0];
      if (parsed.date === today) {
        return parsed;
      }
    } catch (e) {
      // Invalid saved data, remove it
      localStorage.removeItem(userKey);
    }
  }
  
  return null;
};

export const useAttendance = create<AttendanceState>()(
  persist(
    (set, get) => ({
      todayRecord: null,
      isLoading: false,
      isCheckingIn: false,
      isCheckingOut: false,
      currentUserId: null,

      checkIn: async (userId: string, location) => {
        const { todayRecord, currentUserId } = get();
        
        // If different user, clear previous data and get new user's data
        if (currentUserId !== userId) {
          set({ currentUserId: userId, todayRecord: null });
          const userRecord = await mockGetTodayRecord(userId);
          set({ todayRecord: userRecord });
        }
        
        const currentRecord = get().todayRecord;
        if (currentRecord?.checkInAt) {
          throw new Error('이미 출근 처리되었습니다.');
        }

        set({ isCheckingIn: true });
        
        try {
          const record = await mockCheckIn(userId, location);
          
          // Save to user-specific localStorage key
          const userKey = getUserAttendanceKey(userId);
          localStorage.setItem(userKey, JSON.stringify(record));
          
          set({
            todayRecord: record,
            isCheckingIn: false,
            currentUserId: userId,
          });
        } catch (error) {
          set({ isCheckingIn: false });
          throw error;
        }
      },

      checkOut: async (userId: string, location) => {
        const { todayRecord, currentUserId } = get();
        
        // If different user, get their data first
        if (currentUserId !== userId) {
          set({ currentUserId: userId });
          const userRecord = await mockGetTodayRecord(userId);
          set({ todayRecord: userRecord });
        }
        
        const currentRecord = get().todayRecord;
        if (!currentRecord?.checkInAt) {
          throw new Error('출근 기록이 없습니다. 먼저 출근해주세요.');
        }
        
        if (currentRecord.checkOutAt) {
          throw new Error('이미 퇴근 처리되었습니다.');
        }

        set({ isCheckingOut: true });
        
        try {
          const updatedRecord = await mockCheckOut(currentRecord, location);
          
          // Save to user-specific localStorage key
          const userKey = getUserAttendanceKey(userId);
          localStorage.setItem(userKey, JSON.stringify(updatedRecord));
          
          set({
            todayRecord: updatedRecord,
            isCheckingOut: false,
          });
        } catch (error) {
          set({ isCheckingOut: false });
          throw error;
        }
      },

      getTodayRecord: async (userId: string) => {
        set({ isLoading: true });
        
        try {
          const record = await mockGetTodayRecord(userId);
          set({
            todayRecord: record,
            isLoading: false,
            currentUserId: userId,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setCurrentUser: (userId: string) => {
        const { currentUserId } = get();
        if (currentUserId !== userId) {
          set({ currentUserId: userId, todayRecord: null });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'nova-hr-attendance',
      partialize: (state) => ({
        todayRecord: state.todayRecord,
        currentUserId: state.currentUserId,
      }),
    }
  )
);