export interface Attendance {
  id: string;
  userId: string;
  dateKey: Date;
  checkInAt?: Date;
  checkInLocation?: GeoLocation;
  checkOutAt?: Date;
  checkOutLocation?: GeoLocation;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRequest {
  id: string;
  userId: string;
  requestType: AttendanceRequestType;
  targetAt: Date;
  reasonCode?: string;
  reasonText?: string;
  attachUrls: string[];
  geoSnapshot?: GeoSnapshot;
  status: RequestStatus;
  decidedBy?: string;
  decidedAt?: Date;
  createdAt: Date;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
}

export interface GeoSnapshot extends GeoLocation {
  timestamp: Date;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    ip?: string;
  };
}

export interface CompanyLocation {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  address?: string;
  lat: number;
  lng: number;
  radiusM: number;
  wifiSsids: string[];
  ipCidrs: string[];
  webCheckinAllowed: boolean;
  faceRequired: boolean;
}

export interface CheckInRequest {
  nowAt?: Date;
  geo: GeoLocation;
  faceImgUrl?: string;
  notes?: string;
}

export interface CheckOutRequest {
  nowAt?: Date;
  geo: GeoLocation;
  notes?: string;
}

export type AttendanceStatus = 
  | 'NORMAL'
  | 'LATE'
  | 'EARLY_LEAVE'
  | 'ABSENT'
  | 'REMOTE'
  | 'OFFSITE'
  | 'HOLIDAY'
  | 'LEAVE';

export type AttendanceRequestType = 
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'ADJUST';

export type RequestStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';