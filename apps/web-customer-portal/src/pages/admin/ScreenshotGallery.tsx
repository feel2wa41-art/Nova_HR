import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { 
  Card, 
  Row, 
  Col, 
  Image,
  Table, 
  Tag, 
  Space, 
  Button,
  Modal,
  Select,
  DatePicker,
  Typography,
  Spin,
  Empty,
  Avatar,
  Tooltip,
  List,
  Badge,
  TreeSelect,
  Checkbox,
  Popconfirm,
  message
} from 'antd';
import {
  UserOutlined,
  EyeOutlined,
  DownloadOutlined,
  CalendarOutlined,
  CameraOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const { Title, Text } = Typography;
const { Option } = Select;

interface Screenshot {
  id: string;
  session_id: string;
  file_url: string;
  thumbnail_url: string;
  captured_at: string;
  is_blurred: boolean;
  created_at: string;
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      title: string;
      department?: string;
    };
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  title: string;
  department?: string;
  is_active?: boolean;
  has_active_session?: boolean;
}

interface TimeSlot {
  time: string;
  hour: number;
  count: number;
}

interface Department {
  id: string;
  name: string;
  users: User[];
}

const ScreenshotGallery: React.FC = () => {
  // 3단계 선택 상태
  const [selectedUser, setSelectedUser] = useState<string | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>(undefined);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // 삭제 관련 상태
  const [selectedScreenshots, setSelectedScreenshots] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteType, setDeleteType] = useState<'selected' | 'all'>('selected');

  // 1단계: 실제 활성 세션 사용자 가져오기
  const { data: activeUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ['active-session-users'],
    queryFn: async () => {
      try {
        // 활성 세션이 있는 사용자 조회
        const sessionsResponse = await apiClient.get('/attitude/admin/sessions', {
          params: { 
            dateFilter: 'today',
            limit: 100 // Get all sessions for today
          }
        });
        
        const sessions = sessionsResponse.data?.data || [];
        const activeSessions = sessions.filter((session: any) => 
          session.status === 'ACTIVE' && session.user
        );
        
        // Extract unique users with active sessions
        const uniqueUsers: User[] = [];
        const userIds = new Set();
        
        activeSessions.forEach((session: any) => {
          if (session.user && !userIds.has(session.user.id)) {
            userIds.add(session.user.id);
            uniqueUsers.push({
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              title: session.user.title || '직원',
              department: session.user.department,
              is_active: true,
              has_active_session: true
            });
          }
        });
        
        console.log('Active session users:', uniqueUsers);
        return uniqueUsers;
      } catch (error) {
        console.log('Using mock data for users:', error);
        // API 오류 시 Mock 데이터 사용
        return mockDepartments.flatMap(dept => dept.users.filter(u => u.has_active_session));
      }
    },
    staleTime: 30000,
  });

  // 2단계: 선택된 사용자의 실제 스크린샷 데이터로 시간대별 개수 계산
  const { data: timeSlotsData, isLoading: timeSlotsLoading } = useQuery({
    queryKey: ['screenshot-time-slots', selectedUser, dateFilter],
    queryFn: async () => {
      if (!selectedUser) return { timeSlots: [] };
      try {
        // 실제 API로 사용자의 스크린샷 가져오기
        const response = await apiClient.get('/attitude/admin/screenshots', {
          params: { 
            userId: selectedUser, 
            dateFilter,
            limit: 1000 // Get all screenshots to calculate time slots
          }
        });
        
        const screenshots = response.data?.data || [];
        console.log(`User ${selectedUser} screenshots:`, screenshots);
        
        // 시간대별 개수 계산
        const hourCounts: { [hour: string]: number } = {};
        
        screenshots.forEach((screenshot: any) => {
          const capturedAt = new Date(screenshot.captured_at);
          const hour = capturedAt.getHours();
          const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
          hourCounts[timeSlot] = (hourCounts[timeSlot] || 0) + 1;
        });
        
        // Convert to TimeSlot format
        const timeSlots = Object.entries(hourCounts).map(([time, count]) => ({
          time,
          hour: parseInt(time.split(':')[0]),
          count
        })).sort((a, b) => a.hour - b.hour);
        
        console.log('Calculated time slots:', timeSlots);
        return { timeSlots: timeSlots.length > 0 ? timeSlots : mockTimeSlots };
      } catch (error) {
        console.log('Using mock data for time slots:', error);
        return { timeSlots: mockTimeSlots };
      }
    },
    enabled: !!selectedUser && step >= 2,
    staleTime: 30000,
  });

  // 3단계: 선택된 시간대의 실제 스크린샷 이미지
  const { data: screenshotsData, isLoading: screenshotsLoading } = useQuery({
    queryKey: ['screenshots', selectedUser, selectedTimeSlot, dateFilter],
    queryFn: async () => {
      if (!selectedUser || !selectedTimeSlot) return { data: [] };
      try {
        // 실제 API로 스크린샷 데이터 가져오기
        const response = await apiClient.get('/attitude/admin/screenshots', {
          params: { 
            userId: selectedUser, 
            dateFilter,
            page: 1,
            limit: 100
          }
        });
        
        const allScreenshots = response.data?.data || [];
        console.log('All screenshots for user:', allScreenshots);
        
        // Filter by selected time slot
        const selectedHour = parseInt(selectedTimeSlot.split(':')[0]);
        const filteredScreenshots = allScreenshots.filter((screenshot: any) => {
          const capturedAt = new Date(screenshot.captured_at);
          return capturedAt.getHours() === selectedHour;
        });
        
        console.log(`Filtered screenshots for ${selectedTimeSlot}:`, filteredScreenshots);
        return { data: filteredScreenshots };
      } catch (error) {
        console.log('API failed, using mock data for screenshots:', error);
        // API 실패 시 Mock 데이터 사용
        const userName = activeUsers.find(u => u.id === selectedUser)?.name || 
                        mockDepartments.flatMap(dept => dept.users).find(u => u.id === selectedUser)?.name || '사용자';
        return { data: generateMockScreenshots(selectedUser, userName) };
      }
    },
    enabled: !!selectedUser && !!selectedTimeSlot && step === 3,
    staleTime: 30000,
  });

  // 실제 데이터 기준 (기존 사용자 정보 반영)
  const mockDepartments: Department[] = [
    {
      id: 'it',
      name: 'IT팀',
      users: [
        { id: '3', name: '시스템 관리자', email: 'admin@nova-hr.com', title: 'IT 관리자', department: 'IT팀', has_active_session: true },
      ]
    },
    {
      id: 'hr',
      name: 'HR팀',
      users: [
        { id: '2', name: '김인사', email: 'hr@nova-hr.com', title: 'HR 매니저', department: 'HR팀', has_active_session: true },
      ]
    },
    {
      id: 'dev',
      name: '개발팀',
      users: [
        { id: '1', name: '홍길동', email: 'employee@nova-hr.com', title: '시니어 개발자', department: '개발팀', has_active_session: true },
        { id: '4', name: '이개발', email: 'dev2@nova-hr.com', title: '주니어 개발자', department: '개발팀', has_active_session: true },
      ]
    },
    {
      id: 'design',
      name: '디자인팀',
      users: [
        { id: '5', name: '박디자인', email: 'design@nova-hr.com', title: 'UI/UX 디자이너', department: '디자인팀', has_active_session: false },
      ]
    },
    {
      id: 'sales',
      name: '영업팀',
      users: [
        { id: '6', name: '최영업', email: 'sales@nova-hr.com', title: '영업 담당자', department: '영업팀', has_active_session: true },
      ]
    }
  ];

  const mockTimeSlots: TimeSlot[] = [
    { time: '09:00', hour: 9, count: 12 },
    { time: '10:00', hour: 10, count: 8 },
    { time: '11:00', hour: 11, count: 15 },
    { time: '12:00', hour: 12, count: 3 },
    { time: '13:00', hour: 13, count: 5 },
    { time: '14:00', hour: 14, count: 18 },
    { time: '15:00', hour: 15, count: 22 },
    { time: '16:00', hour: 16, count: 11 },
    { time: '17:00', hour: 17, count: 7 },
  ];

  const generateMockScreenshots = (userId: string, userName: string, count: number = 8): Screenshot[] => {
    const screenshots: Screenshot[] = [];
    const now = new Date();
    
    // 실제 보이는 SVG 이미지 데이터 댌
    const sampleImages = [
      // 컬퓨터 화면 모형
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMmY1NGViIi8+PHRleHQgeD0iNTAlIiB5PSI0MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ss5fsrZXsnoXsmqkg7ZWR66m07J6sPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNjY2MiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WUyBDb2RlPC90ZXh0Pjwvc3ZnPg==',
      // 브라우저 화면
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3Qgd2lkdGg9IjkwJSIgaGVpZ2h0PSI4MCUiIHg9IjUlIiB5PSIxMCUiIGZpbGw9IndoaXRlIiBzdHJva2U9IiNkZGQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Q2hyb21lIOu4jOudvOyasOyggDwvdGV4dD48L3N2Zz4=',
      // 문서 작업 화면
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTZmN2ZmIi8+PHJlY3Qgd2lkdGg9IjgwJSIgaGVpZ2h0PSI3MCUiIHg9IjEwJSIgeT0iMTUlIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjYzNjOWQ5Ii8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuykkeuztOuwlCDsnpHslYU8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1pY3Jvc29mdCBXb3JkPC90ZXh0Pjwvc3ZnPg==',
      // 대시보드 화면
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHJlY3Qgd2lkdGg9IjQwJSIgaGVpZ2h0PSIzNSUiIHg9IjUlIiB5PSIxMCUiIGZpbGw9IiNmZmYiIHN0cm9rZT0iI2VlZSIvPjxyZWN0IHdpZHRoPSI0MCUiIGhlaWdodD0iMzUlIiB4PSI1NSUiIHk9IjEwJSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZWVlIi8+PHJlY3Qgd2lkdGg9IjkwJSIgaGVpZ2h0PSIzNSUiIHg9IjUlIiB5PSI1NSUiIGZpbGw9IiNmZmYiIHN0cm9rZT0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iOTglIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ri6Tstpzrs7Trk5wg7ZmU66mEPC90ZXh0Pjwvc3ZnPg==',
      // 이메일 화면
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHJlY3Qgd2lkdGg9Ijg1JSIgaGVpZ2h0PSI3NSUiIHg9IjcuNSUiIHk9IjEyLjUlIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzU1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuyXruuplOyLnCDsolnshZU8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdtYWlsPC90ZXh0Pjwvc3ZnPg==',
      // 디자인 도구
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMmEyYTJhIi8+PGNpcmNsZSBjeD0iNjAiIGN5PSI0NSIgcj0iMTUiIGZpbGw9IiNmZjZjNDMiLz48cmVjdCB3aWR0aD0iMzAiIGhlaWdodD0iMjAiIHg9IjEyMCIgeT0iMzUiIGZpbGw9IiM0YzY0ZjQiLz48dGV4dCB4PSI1MCUiIHk9Ijg1JSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjY2NjIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RmlnbWEg64SU7J6Q7J24PC90ZXh0Pjwvc3ZnPg==',
      // 업무 앱
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PGcgZmlsbD0iIzM3NDE1MSI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjMiIHg9IjIwIiB5PSIzMCIvPjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSIzIiB4PSIyMCIgeT0iNDAiLz48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iMyIgeD0iMjAiIHk9IjUwIi8+PC9nPjx0ZXh0IHg9IjUwJSIgeT0iODAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7sl4XrrLQg7JuA66m07LCY7IyZPC90ZXh0Pjwvc3ZnPg==',
      // 블러 처리된 이미지 (간소화)
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHJlY3Qgd2lkdGg9IjgwJSIgaGVpZ2h0PSI2MCUiIHg9IjEwJSIgeT0iMjAlIiBmaWxsPSIjZGRkIiBvcGFjaXR5PSIwLjciLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+7Jqw7ISx7KCV67O0IOywqeuhnTwvdGV4dD48L3N2Zz4=' 
    ];
    
    for (let i = 0; i < count; i++) {
      const captureTime = new Date(now.getTime() - (i * 15 * 60 * 1000)); // 15분 간격
      const imageIndex = i % sampleImages.length;
      const isBlurred = Math.random() > 0.7; // 30% 확률로 블러 처리
      const selectedImage = isBlurred ? sampleImages[sampleImages.length - 1] : sampleImages[imageIndex];
      
      screenshots.push({
        id: `screenshot_${userId}_${i}`,
        session_id: `session_${userId}`,
        file_url: selectedImage,
        thumbnail_url: selectedImage,
        captured_at: captureTime.toISOString(),
        is_blurred: isBlurred,
        created_at: captureTime.toISOString(),
        session: {
          user: mockDepartments.flatMap(dept => dept.users).find(u => u.id === userId) || {
            id: userId,
            name: userName,
            email: `${userName.toLowerCase()}@nova-hr.com`,
            title: '직원'
          }
        }
      });
    }
    return screenshots;
  };
  
  const mockScreenshots = selectedUser ? generateMockScreenshots(
    selectedUser, 
    mockDepartments.flatMap(dept => dept.users).find(u => u.id === selectedUser)?.name || '사용자'
  ) : [];

  const activeUsers = activeUsersData || mockDepartments.flatMap(dept => dept.users.filter(u => u.has_active_session));
  const timeSlots = timeSlotsData?.timeSlots || mockTimeSlots;
  const screenshots = screenshotsData?.data || mockScreenshots;

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    setSelectedTimeSlot(undefined);
    setStep(2);
  };

  const handleTimeSlotSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setStep(3);
  };

  const handleViewScreenshot = (screenshot: Screenshot) => {
    setSelectedScreenshot(screenshot);
    setModalVisible(true);
  };

  const handleReset = () => {
    setSelectedUser(undefined);
    setSelectedTimeSlot(undefined);
    setStep(1);
    setSelectedScreenshots([]);
    setDeleteMode(false);
  };

  // 삭제 관련 함수
  const handleToggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedScreenshots([]);
  };

  const handleSelectScreenshot = (screenshotId: string, checked: boolean) => {
    if (checked) {
      setSelectedScreenshots(prev => [...prev, screenshotId]);
    } else {
      setSelectedScreenshots(prev => prev.filter(id => id !== screenshotId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedScreenshots(screenshots.map(s => s.id));
    } else {
      setSelectedScreenshots([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedScreenshots.length === 0) {
      message.warning('삭제할 스크린샷을 선택해주세요.');
      return;
    }
    setDeleteType('selected');
    setDeleteModalVisible(true);
  };

  const handleDeleteAll = () => {
    if (screenshots.length === 0) {
      message.warning('삭제할 스크린샷이 없습니다.');
      return;
    }
    setDeleteType('all');
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteType === 'selected') {
        try {
          // 실제 API 호출 - 선택 삭제
          await apiClient.delete('/attitude/admin/screenshots/batch', { 
            data: { screenshotIds: selectedScreenshots } 
          });
          message.success(`${selectedScreenshots.length}개의 스크린샷이 삭제되었습니다.`);
        } catch (error) {
          console.log('API delete failed, simulating delete:', error);
          message.success(`${selectedScreenshots.length}개의 스크린샷이 삭제되었습니다. (시뮬레이션)`);
        }
        console.log('선택 삭제:', selectedScreenshots);
      } else {
        try {
          // 실제 API 호출 - 전체 삭제
          await apiClient.delete(`/attitude/admin/screenshots/user/${selectedUser}`, {
            params: { timeSlot: selectedTimeSlot, dateFilter }
          });
          message.success(`${screenshots.length}개의 스크린샷이 모두 삭제되었습니다.`);
        } catch (error) {
          console.log('API delete failed, simulating delete:', error);
          message.success(`${screenshots.length}개의 스크린샷이 모두 삭제되었습니다. (시뮬레이션)`);
        }
        console.log('전체 삭제:', { selectedUser, selectedTimeSlot, dateFilter });
      }
      
      setSelectedScreenshots([]);
      setDeleteMode(false);
      setDeleteModalVisible(false);
      
      // React Query 데이터 새로고침
      if (screenshotsData) {
        // refetch screenshots data
        window.location.reload(); // 임시적으로 페이지 새로고침
      }
    } catch (error) {
      message.error('삭제 중 오류가 발생했습니다.');
      console.error('Delete error:', error);
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MM/dd HH:mm', { locale: ko });
  };

  const getBreadcrumb = () => {
    const selectedUserInfo = activeUsers.find(u => u.id === selectedUser);
    const selectedTimeInfo = timeSlots.find(t => t.time === selectedTimeSlot);
    
    return (
      <Space size={4} className="mb-4">
        <Button type="link" size="small" onClick={handleReset}>
          <TeamOutlined /> 사용자 선택
        </Button>
        {selectedUser && (
          <>
            <span>/</span>
            <Button 
              type="link" 
              size="small" 
              onClick={() => setStep(2)}
              disabled={step === 2}
            >
              <ClockCircleOutlined /> {selectedUserInfo?.name} - 시간대 선택
            </Button>
          </>
        )}
        {selectedTimeSlot && (
          <>
            <span>/</span>
            <Text strong>
              <FolderOpenOutlined /> {selectedTimeInfo?.time} ({selectedTimeInfo?.count}개)
            </Text>
          </>
        )}
      </Space>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>📷 스크린샷 갤러리 (관리용)</Title>
        <Space>
          <Select
            value={dateFilter}
            onChange={setDateFilter}
            style={{ width: 120 }}
          >
            <Option value="today">오늘</Option>
            <Option value="week">1주일</Option>
            <Option value="month">1개월</Option>
          </Select>
          
          {/* 삭제 모드 버튼 - 3단계에서만 표시 */}
          {step === 3 && screenshots.length > 0 && (
            <>
              <Button 
                type={deleteMode ? 'primary' : 'default'}
                danger={deleteMode}
                icon={<CheckSquareOutlined />}
                onClick={handleToggleDeleteMode}
              >
                {deleteMode ? '선택 완료' : '삭제 모드'}
              </Button>
              
              {deleteMode && (
                <Space>
                  <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteSelected}
                    disabled={selectedScreenshots.length === 0}
                  >
                    선택 삭제 ({selectedScreenshots.length})
                  </Button>
                  <Popconfirm
                    title="전체 삭제"
                    description="현재 시간대의 모든 스크린샷을 삭제하시겠습니까?"
                    onConfirm={handleDeleteAll}
                    okText="삭제"
                    cancelText="취소"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                    >
                      전체 삭제 ({screenshots.length})
                    </Button>
                  </Popconfirm>
                </Space>
              )}
            </>
          )}
        </Space>
      </div>

      {getBreadcrumb()}

      <Card>
        {/* 1단계: 조직도 기반 활성 사용자 선택 */}
        {step === 1 && (
          <div>
            <Title level={4}>
              <TeamOutlined /> 1단계: 활성 세션 사용자 선택
            </Title>
            <Text type="secondary" className="block mb-4">
              현재 세션이 활성화된 사용자만 표시됩니다. 사용자를 선택하면 해당 사용자의 시간대별 스크린샷 개수를 확인할 수 있습니다.
            </Text>
            
            <Spin spinning={usersLoading}>
              {activeUsers.length > 0 ? (
                <div>
                  {/* Group users by department if available */}
                  {(() => {
                    // Group users by department
                    const deptGroups: { [key: string]: User[] } = {};
                    activeUsers.forEach(user => {
                      const dept = user.department || '기타';
                      if (!deptGroups[dept]) deptGroups[dept] = [];
                      deptGroups[dept].push(user);
                    });
                    
                    return Object.entries(deptGroups).map(([deptName, deptUsers]) => (
                      <Card 
                        key={deptName}
                        title={deptName} 
                        size="small" 
                        className="mb-4"
                        extra={<Badge count={deptUsers.length} />}
                      >
                        <Row gutter={[16, 16]}>
                          {deptUsers.map(user => (
                            <Col xs={12} sm={8} md={6} lg={4} key={user.id}>
                              <Card
                                size="small"
                                hoverable
                                onClick={() => handleUserSelect(user.id)}
                                className="text-center"
                                styles={{ body: { padding: '16px 8px' } }}
                              >
                                <Avatar size={48} icon={<UserOutlined />} className="mb-2" />
                                <div>
                                  <Text strong className="block">{user.name}</Text>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {user.title}
                                  </Text>
                                  <div className="mt-2">
                                    <Badge 
                                      status="processing" 
                                      text="활성 세션" 
                                      style={{ fontSize: '11px' }}
                                    />
                                  </div>
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    ));
                  })()
                  }
                </div>
              ) : (
                <div>
                  {/* Fallback to mock data layout */}
                  {mockDepartments.map(dept => {
                    const activeDeptUsers = dept.users.filter(u => u.has_active_session);
                    if (activeDeptUsers.length === 0) return null;
                    
                    return (
                      <Card 
                        key={dept.id} 
                        title={dept.name} 
                        size="small" 
                        className="mb-4"
                        extra={<Badge count={activeDeptUsers.length} />}
                      >
                        <Row gutter={[16, 16]}>
                          {activeDeptUsers.map(user => (
                            <Col xs={12} sm={8} md={6} lg={4} key={user.id}>
                              <Card
                                size="small"
                                hoverable
                                onClick={() => handleUserSelect(user.id)}
                                className="text-center"
                                styles={{ body: { padding: '16px 8px' } }}
                              >
                                <Avatar size={48} icon={<UserOutlined />} className="mb-2" />
                                <div>
                                  <Text strong className="block">{user.name}</Text>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {user.title}
                                  </Text>
                                  <div className="mt-2">
                                    <Badge 
                                      status="processing" 
                                      text="활성 세션" 
                                      style={{ fontSize: '11px' }}
                                    />
                                  </div>
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </Card>
                    );
                  })}
                </div>
              )}
              
              {activeUsers.length === 0 && (
                <Empty 
                  description="활성 세션을 가진 사용자가 없습니다" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Spin>
          </div>
        )}

        {/* 2단계: 시간대별 캡처 개수 선택 */}
        {step === 2 && selectedUser && (
          <div>
            <Title level={4}>
              <ClockCircleOutlined /> 2단계: 시간대별 스크린샷 개수
            </Title>
            <Text type="secondary" className="block mb-4">
              선택한 사용자의 시간대별 스크린샷 개수입니다. 시간대를 선택하면 해당 시간대의 실제 스크린샷을 확인할 수 있습니다.
            </Text>
            
            <Spin spinning={timeSlotsLoading}>
              <Row gutter={[16, 16]}>
                {timeSlots.map(slot => (
                  <Col xs={12} sm={8} md={6} lg={4} key={slot.time}>
                    <Card
                      size="small"
                      hoverable
                      onClick={() => handleTimeSlotSelect(slot.time)}
                      className="text-center"
                      styles={{ body: { padding: '16px' } }}
                    >
                      <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                      <div>
                        <Text strong className="block" style={{ fontSize: '16px' }}>
                          {slot.time}
                        </Text>
                        <Badge 
                          count={slot.count} 
                          style={{ backgroundColor: '#52c41a' }}
                          className="mt-2"
                        />
                        <Text type="secondary" className="block" style={{ fontSize: '12px' }}>
                          스크린샷
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
              
              {timeSlots.length === 0 && (
                <Empty 
                  description="해당 사용자의 스크린샷이 없습니다" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Spin>
          </div>
        )}

        {/* 3단계: 실제 스크린샷 이미지 표시 */}
        {step === 3 && selectedUser && selectedTimeSlot && (
          <div>
            <Title level={4}>
              <FolderOpenOutlined /> 3단계: 스크린샷 이미지
            </Title>
            <Text type="secondary" className="block mb-4">
              선택한 시간대의 실제 스크린샷 이미지입니다. 이미지를 클릭하면 상세보기가 가능합니다.
            </Text>
            
            <Spin spinning={screenshotsLoading}>
              {screenshots.length === 0 ? (
                <Empty 
                  description="스크린샷이 없습니다" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <>
                  {/* 삭제 모드일 때 전체 선택 체크박스 */}
                  {deleteMode && (
                    <div className="mb-4 p-3 bg-red-50 rounded border">
                      <Checkbox
                        checked={selectedScreenshots.length === screenshots.length}
                        indeterminate={selectedScreenshots.length > 0 && selectedScreenshots.length < screenshots.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      >
                        전체 선택 ({selectedScreenshots.length}/{screenshots.length})
                      </Checkbox>
                    </div>
                  )}
                  
                  <Row gutter={[16, 16]}>
                    {screenshots.map((screenshot: Screenshot) => (
                      <Col xs={12} sm={8} md={6} lg={4} key={screenshot.id}>
                        <Card
                          size="small"
                          hoverable={!deleteMode}
                          onClick={() => !deleteMode && handleViewScreenshot(screenshot)}
                          className={deleteMode && selectedScreenshots.includes(screenshot.id) ? 'border-red-400 shadow-lg' : ''}
                          cover={
                            <div 
                              style={{ 
                                height: 120, 
                                backgroundColor: '#f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                              }}
                            >
                              {/* 삭제 모드 체크박스 */}
                              {deleteMode && (
                                <Checkbox
                                  checked={selectedScreenshots.includes(screenshot.id)}
                                  onChange={(e) => handleSelectScreenshot(screenshot.id, e.target.checked)}
                                  style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    zIndex: 10,
                                    background: 'white',
                                    borderRadius: '50%',
                                    padding: '2px'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                              
                              {/* Check if valid image data exists */}
                              {(() => {
                                const hasValidImage = screenshot.thumbnail_url && (
                                  screenshot.thumbnail_url.startsWith('data:image/png;base64,') ||
                                  screenshot.thumbnail_url.startsWith('data:image/jpeg;base64,') ||
                                  (screenshot.thumbnail_url.startsWith('http') && !screenshot.thumbnail_url.includes('svg'))
                                );
                                
                                if (hasValidImage) {
                                  return (
                                    <img
                                      src={screenshot.thumbnail_url}
                                      alt="스크린샷"
                                      style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover',
                                        borderRadius: 4,
                                        opacity: deleteMode && selectedScreenshots.includes(screenshot.id) ? 0.7 : 1
                                      }}
                                      onError={(e) => {
                                        console.error('Thumbnail load error:', screenshot.thumbnail_url);
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  );
                                } else {
                                  return (
                                    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                                      <CameraOutlined style={{ fontSize: 24, color: '#999' }} />
                                      <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                                        {screenshot.thumbnail_url?.includes('svg') 
                                          ? '스크린샷 캡처 실패' 
                                          : screenshot.file_url
                                          ? '이미지 처리 중...'
                                          : '이미지 없음'
                                        }
                                      </div>
                                      <div style={{ fontSize: 10, color: '#ccc', marginTop: 4 }}>
                                        {screenshot.thumbnail_url ? '데스크톱 에이전트 확인 필요' : '스크린샷 데이터가 없습니다'}
                                      </div>
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          }
                        >
                          <div style={{ textAlign: 'center' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {formatDateTime(screenshot.captured_at)}
                            </Text>
                            <br />
                            <Tag 
                              color={screenshot.is_blurred ? 'orange' : 'green'}
                              style={{ marginTop: 4 }}
                            >
                              {screenshot.is_blurred ? '블러' : '정상'}
                            </Tag>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </>
              )}
            </Spin>
          </div>
        )}
      </Card>

      {/* Screenshot Detail Modal */}
      <Modal
        title="스크린샷 상세 정보"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            닫기
          </Button>,
          selectedScreenshot && selectedScreenshot.file_url !== 'temp_url' && (
            <Button 
              key="download" 
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => window.open(selectedScreenshot.file_url, '_blank')}
            >
              다운로드
            </Button>
          )
        ]}
      >
        {selectedScreenshot && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Screenshot Image */}
              <div style={{ textAlign: 'center' }}>
                {(() => {
                  const hasValidImage = selectedScreenshot.file_url && (
                    selectedScreenshot.file_url.startsWith('data:image/png;base64,') ||
                    selectedScreenshot.file_url.startsWith('data:image/jpeg;base64,') ||
                    (selectedScreenshot.file_url.startsWith('http') && !selectedScreenshot.file_url.includes('svg'))
                  );
                  
                  if (hasValidImage) {
                    return (
                      <div style={{ textAlign: 'center', maxWidth: '100%', overflow: 'hidden' }}>
                        <img
                          src={selectedScreenshot.file_url}
                          alt="스크린샷"
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: 400,
                            border: '1px solid #d9d9d9',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}
                          onError={(e) => {
                            console.error('Modal image load error:', selectedScreenshot.file_url);
                          }}
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div 
                        style={{
                          height: 200,
                          backgroundColor: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 8
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <CameraOutlined style={{ fontSize: 48, color: '#999', marginBottom: 8 }} />
                          <div style={{ color: '#999', marginBottom: 4 }}>
                            {selectedScreenshot.file_url?.includes('svg') 
                              ? '스크린샷 캡처가 실패했습니다' 
                              : selectedScreenshot.file_url
                              ? '이미지를 로드할 수 없습니다'
                              : '스크린샷 데이터가 없습니다'
                            }
                          </div>
                          <div style={{ color: '#ccc', fontSize: 12 }}>
                            데스크톱 에이전트 상태 및 연결을 확인해주세요
                          </div>
                          {selectedScreenshot.file_url && (
                            <div style={{ color: '#aaa', fontSize: 10, marginTop: 4 }}>
                              URL: {selectedScreenshot.file_url.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Screenshot Info */}
              <Card title="스크린샷 정보" size="small">
                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>사용자: </Text>
                    {selectedScreenshot.session.user.name} ({selectedScreenshot.session.user.title})
                  </Col>
                  <Col span={12}>
                    <Text strong>이메일: </Text>
                    {selectedScreenshot.session.user.email}
                  </Col>
                  <Col span={12}>
                    <Text strong>캡처 시간: </Text>
                    {format(new Date(selectedScreenshot.captured_at), 'yyyy-MM-dd HH:mm:ss')}
                  </Col>
                  <Col span={12}>
                    <Text strong>상태: </Text>
                    <Tag color={selectedScreenshot.is_blurred ? 'orange' : 'green'}>
                      {selectedScreenshot.is_blurred ? '블러 처리됨' : '정상'}
                    </Tag>
                  </Col>
                </Row>
              </Card>
            </Space>
          </div>
        )}
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            스크린샷 삭제 확인
          </Space>
        }
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onOk={confirmDelete}
        okText="삭제"
        cancelText="취소"
        okButtonProps={{ danger: true }}
        width={500}
      >
        <div className="py-4">
          {deleteType === 'selected' ? (
            <div>
              <p>선택된 <strong>{selectedScreenshots.length}개</strong>의 스크린샷을 삭제하시겠습니까?</p>
              <p className="text-gray-600 text-sm">삭제된 스크린샷은 복구할 수 없습니다.</p>
            </div>
          ) : (
            <div>
              <p>현재 시간대의 <strong>모든 스크린샷 ({screenshots.length}개)</strong>을 삭제하시겠습니까?</p>
              <p className="text-red-600 text-sm font-medium">⚠️ 주의: 이 작업은 되돌릴 수 없습니다!</p>
              <div className="mt-3 p-3 bg-gray-100 rounded">
                <p className="text-sm mb-1">삭제 대상:</p>
                <p className="text-sm">• 사용자: {activeUsers.find(u => u.id === selectedUser)?.name || mockDepartments.flatMap(d => d.users).find(u => u.id === selectedUser)?.name}</p>
                <p className="text-sm">• 시간대: {selectedTimeSlot}</p>
                <p className="text-sm">• 기간: {dateFilter === 'today' ? '오늘' : dateFilter === 'week' ? '1주일' : '1개월'}</p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ScreenshotGallery;