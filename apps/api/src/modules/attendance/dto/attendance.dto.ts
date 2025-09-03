import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({ example: 37.5665, description: 'Latitude coordinate' })
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude: number;

  @ApiProperty({ example: 126.9780, description: 'Longitude coordinate' })
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude: number;

  @ApiProperty({ example: 10.5, description: 'GPS accuracy in meters', required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Accuracy must be a valid number' })
  @Min(0, { message: 'Accuracy must be a positive number' })
  accuracy?: number;
}

export class CheckInDto {
  @ApiProperty({ description: 'GPS location data' })
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ example: 'TRAFFIC_DELAY', description: 'Reason code for late check-in', required: false })
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiProperty({ example: 'Heavy traffic on the highway', description: 'Additional reason text', required: false })
  @IsOptional()
  @IsString()
  reasonText?: string;

  @ApiProperty({ example: false, description: 'Whether this is a remote work check-in', required: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiProperty({ example: 'base64-encoded-face-image', description: 'Face recognition data', required: false })
  @IsOptional()
  @IsString()
  faceData?: string;

  @ApiProperty({ example: 'iPhone 13 Pro', description: 'Device information', required: false })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class CheckOutDto {
  @ApiProperty({ description: 'GPS location data' })
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ example: 'Finished all tasks for today', description: 'Check-out notes', required: false })
  @IsOptional()
  @IsString()
  reasonText?: string;

  @ApiProperty({ example: 'iPhone 13 Pro', description: 'Device information', required: false })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class AttendanceHistoryDto {
  @ApiProperty({ example: '2024-01-01', description: 'Start date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date string (YYYY-MM-DD)' })
  startDate?: string;

  @ApiProperty({ example: '2024-01-31', description: 'End date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date string (YYYY-MM-DD)' })
  endDate?: string;

  @ApiProperty({ example: 1, description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a valid number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({ example: 20, description: 'Items per page', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a valid number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;

  @ApiProperty({ example: 'PRESENT', description: 'Filter by status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 'user-id-123', description: 'Filter by user ID (admin only)', required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class AttendanceAdjustmentDto {
  @ApiProperty({ example: '2024-01-15', description: 'Date to adjust (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'Date must be a valid date string (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 'CHECK_IN', description: 'Type of adjustment' })
  @IsString()
  adjustmentType: 'CHECK_IN' | 'CHECK_OUT' | 'BOTH';

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'New check-in time', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Check-in time must be a valid ISO date string' })
  checkInTime?: string;

  @ApiProperty({ example: '2024-01-15T18:00:00Z', description: 'New check-out time', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Check-out time must be a valid ISO date string' })
  checkOutTime?: string;

  @ApiProperty({ example: 'Forgot to check in due to urgent meeting', description: 'Reason for adjustment' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Supporting documents', required: false })
  @IsOptional()
  attachments?: string[];
}

export class AdminAttendanceUpdateDto {
  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Check-in time', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Check-in time must be a valid ISO date string' })
  checkInAt?: string;

  @ApiProperty({ example: '2024-01-15T18:00:00Z', description: 'Check-out time', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Check-out time must be a valid ISO date string' })
  checkOutAt?: string;

  @ApiProperty({ example: 'PRESENT', description: 'Attendance status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 'Admin adjustment for system error', description: 'Admin notes' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class BulkAttendanceImportDto {
  @ApiProperty({ 
    example: [
      {
        employeeId: 'EMP001',
        date: '2024-01-15',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        status: 'PRESENT'
      }
    ],
    description: 'Array of attendance records to import' 
  })
  records: {
    employeeId: string;
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    status: string;
    notes?: string;
  }[];
}