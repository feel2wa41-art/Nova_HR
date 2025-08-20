// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  TOKEN_KEY: 'nova_hr_token',
  REFRESH_TOKEN_KEY: 'nova_hr_refresh_token',
  TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutes in milliseconds
} as const;

// Pagination Configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// Date/Time Configuration
export const DATE_CONFIG = {
  DEFAULT_TIMEZONE: 'Asia/Jakarta',
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm:ss',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_DATE_FORMAT: 'YYYY년 MM월 DD일',
  DISPLAY_TIME_FORMAT: 'HH:mm',
  DISPLAY_DATETIME_FORMAT: 'YYYY년 MM월 DD일 HH:mm',
} as const;

// Attendance Configuration
export const ATTENDANCE_CONFIG = {
  DEFAULT_GEOFENCE_RADIUS: 200, // meters
  MIN_GEOFENCE_RADIUS: 50,
  MAX_GEOFENCE_RADIUS: 1000,
  LOCATION_ACCURACY_THRESHOLD: 50, // meters
  TIME_SYNC_INTERVAL: 10000, // 10 seconds
  DEFAULT_WORK_HOURS: {
    START: '09:00',
    END: '18:00',
    LUNCH_START: '12:00',
    LUNCH_END: '13:00',
  },
  LATE_THRESHOLD_MINUTES: 15,
  EARLY_LEAVE_THRESHOLD_MINUTES: 15,
  MAX_BACKDATE_DAYS: 7,
} as const;

// Approval Configuration
export const APPROVAL_CONFIG = {
  MAX_APPROVERS_PER_STAGE: 10,
  MAX_STAGES: 5,
  AUTO_APPROVE_TIMEOUT_HOURS: 72,
} as const;

// UI Configuration
export const UI_CONFIG = {
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  MOBILE_BREAKPOINT: 768,
} as const;

// Status Constants
export const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

// Attendance Status
export const ATTENDANCE_STATUS = {
  NORMAL: 'NORMAL',
  LATE: 'LATE',
  EARLY_LEAVE: 'EARLY_LEAVE',
  ABSENT: 'ABSENT',
  REMOTE: 'REMOTE',
  OFFSITE: 'OFFSITE',
  HOLIDAY: 'HOLIDAY',
  LEAVE: 'LEAVE',
} as const;

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PROVIDER_ADMIN: 'PROVIDER_ADMIN',
  CUSTOMER_ADMIN: 'CUSTOMER_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

// Leave Types
export const LEAVE_TYPES = {
  ANNUAL: 'ANNUAL',
  SICK: 'SICK',
  MATERNITY: 'MATERNITY',
  PATERNITY: 'PATERNITY',
  PERSONAL: 'PERSONAL',
  COMPENSATORY: 'COMPENSATORY',
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type LeaveType = (typeof LEAVE_TYPES)[keyof typeof LEAVE_TYPES];