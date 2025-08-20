// 공휴일 데이터 (2025년 기준)
const holidays2025 = [
  '2025-01-01', // 신정
  '2025-01-28', '2025-01-29', '2025-01-30', // 설날 연휴
  '2025-03-01', // 삼일절
  '2025-05-01', // 근로자의 날
  '2025-05-05', // 어린이날
  '2025-05-13', // 부처님오신날
  '2025-06-06', // 현충일
  '2025-08-15', // 광복절
  '2025-09-06', '2025-09-07', '2025-09-08', // 추석 연휴
  '2025-10-03', // 개천절
  '2025-10-09', // 한글날
  '2025-12-25', // 크리스마스
];

/**
 * 날짜가 주말인지 확인
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
};

/**
 * 날짜가 공휴일인지 확인
 */
export const isHoliday = (date: Date): boolean => {
  const dateString = formatDate(date);
  return holidays2025.includes(dateString);
};

/**
 * 날짜가 근무일인지 확인 (주말, 공휴일 제외)
 */
export const isWorkingDay = (date: Date): boolean => {
  return !isWeekend(date) && !isHoliday(date);
};

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * 두 날짜 사이의 근무일수 계산
 */
export const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
  if (startDate > endDate) {
    return 0;
  }

  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isWorkingDay(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
};

/**
 * 두 날짜 사이의 모든 날짜를 배열로 반환 (근무일만)
 */
export const getWorkingDaysInRange = (startDate: Date, endDate: Date): Date[] => {
  const workingDays: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isWorkingDay(currentDate)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
};

/**
 * 두 날짜 사이의 주말 및 공휴일 배열 반환
 */
export const getNonWorkingDaysInRange = (startDate: Date, endDate: Date): Date[] => {
  const nonWorkingDays: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (!isWorkingDay(currentDate)) {
      nonWorkingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return nonWorkingDays;
};

/**
 * 특정 날짜가 어떤 유형인지 반환
 */
export const getDayType = (date: Date): 'working' | 'weekend' | 'holiday' => {
  if (isHoliday(date)) return 'holiday';
  if (isWeekend(date)) return 'weekend';
  return 'working';
};

/**
 * 휴가 신청 시 유효성 검사
 */
export const validateLeaveRequest = (startDate: Date, endDate: Date): {
  isValid: boolean;
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  holidayDays: number;
  message?: string;
} => {
  if (startDate > endDate) {
    return {
      isValid: false,
      totalDays: 0,
      workingDays: 0,
      weekendDays: 0,
      holidayDays: 0,
      message: '시작일이 종료일보다 늦을 수 없습니다.',
    };
  }

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const workingDays = calculateWorkingDays(startDate, endDate);
  
  let weekendDays = 0;
  let holidayDays = 0;
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isWeekend(currentDate)) {
      weekendDays++;
    } else if (isHoliday(currentDate)) {
      holidayDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    isValid: workingDays > 0,
    totalDays,
    workingDays,
    weekendDays,
    holidayDays,
    message: workingDays === 0 ? '선택한 기간에 근무일이 없습니다.' : undefined,
  };
};

/**
 * 달력에서 사용할 날짜 셀 클래스 반환
 */
export const getDateCellClass = (date: Date): string => {
  const dayType = getDayType(date);
  
  switch (dayType) {
    case 'weekend':
      return 'weekend-day';
    case 'holiday':
      return 'holiday-day';
    default:
      return 'working-day';
  }
};

/**
 * 휴가 신청 가능한 날짜인지 확인
 */
export const isSelectableDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 과거 날짜는 선택 불가
  if (date < today) {
    return false;
  }
  
  // 모든 날짜 선택 가능 (근무일 계산은 별도로 처리)
  return true;
};