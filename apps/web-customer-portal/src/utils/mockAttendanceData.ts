// Utility to generate mock attendance data for testing
export const generateMockAttendanceData = () => {
  const users = [
    { id: '1', name: '홍길동' },
    { id: '2', name: '김인사' },
    { id: '3', name: '시스템 관리자' },
    { id: '4', name: '이개발' },
    { id: '5', name: '박디자인' },
    { id: '6', name: '최영업' }
  ];

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Generate attendance records for the last 30 days
  const attendanceRecords: any[] = [];
  const lateRequests: any[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    users.forEach((user, userIndex) => {
      // 80% chance of attendance
      if (Math.random() < 0.8) {
        const startOfDay = new Date(date);
        startOfDay.setHours(9, 0, 0, 0); // 9:00 AM standard start time
        
        // Generate check-in time (with some being late)
        const isLate = Math.random() < 0.2; // 20% chance of being late
        const lateMinutes = isLate ? Math.floor(Math.random() * 60) + 5 : 0; // 5-65 minutes late
        
        const checkInTime = new Date(startOfDay);
        checkInTime.setMinutes(checkInTime.getMinutes() + lateMinutes + Math.floor(Math.random() * 30) - 15); // ±15 minutes variation
        
        // Generate check-out time
        const checkOutTime = new Date(checkInTime);
        checkOutTime.setHours(checkOutTime.getHours() + 8 + Math.floor(Math.random() * 2)); // 8-10 hours later
        
        const status = isLate ? 'LATE' : 'NORMAL';
        
        const record = {
          date: dateString,
          checkInTime: checkInTime.toISOString(),
          checkOutTime: checkOutTime.toISOString(),
          isLate,
          lateMinutes,
          status,
          workingHours: Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60) * 100) / 100
        };

        attendanceRecords.push({
          userId: user.id,
          ...record
        });

        // Generate late request if late and within last 7 days
        if (isLate && i < 7 && Math.random() < 0.7) { // 70% chance of submitting late request
          const reasons = [
            '교통체증으로 인한 지각입니다.',
            '병원 진료로 인해 늦었습니다.',
            '가족 응급상황이 발생했습니다.',
            '대중교통 연착으로 지각했습니다.',
            '개인 사정으로 인한 지각입니다.',
            '차량 고장으로 늦었습니다.',
            '아이 등원 문제로 지각했습니다.'
          ];

          const submittedTime = new Date(checkInTime);
          submittedTime.setMinutes(submittedTime.getMinutes() + 30); // Submit 30 minutes after check-in

          const lateRequest = {
            userId: user.id,
            date: dateString,
            lateMinutes,
            reason: reasons[Math.floor(Math.random() * reasons.length)],
            photoData: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCABkAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9U6ACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgAoAKACgD/9k=`, // Mock base64 image
            status: i < 3 ? 'PENDING_APPROVAL' : (Math.random() < 0.8 ? 'APPROVED' : 'REJECTED'), // Recent ones pending, older ones processed
            submittedAt: submittedTime.toISOString(),
            reviewedAt: i >= 3 ? new Date(submittedTime.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
            reviewComment: i >= 3 ? (Math.random() < 0.8 ? '정당한 사유로 인정하여 승인합니다.' : '사전 연락 없는 지각으로 반려합니다.') : undefined
          };

          lateRequests.push(lateRequest);
        }

        // Store individual user attendance
        const existingData = JSON.parse(localStorage.getItem(`nova_hr_today_attendance_${user.id}`) || '[]');
        const updatedData = [...existingData.filter((r: any) => r.date !== dateString), record];
        localStorage.setItem(`nova_hr_today_attendance_${user.id}`, JSON.stringify(updatedData));
      }
    });
  }

  // Store late requests
  localStorage.setItem('nova_hr_late_requests', JSON.stringify(lateRequests));
  
  console.log(`Generated ${attendanceRecords.length} attendance records and ${lateRequests.length} late requests`);
  
  return {
    attendanceRecords,
    lateRequests
  };
};

// Generate sample data for users who don't have attendance data
export const initializeMockData = () => {
  const users = ['1', '2', '3', '4', '5', '6'];
  
  users.forEach(userId => {
    const existingData = localStorage.getItem(`nova_hr_today_attendance_${userId}`);
    if (!existingData || JSON.parse(existingData).length === 0) {
      // User has no data, generate some
      console.log(`Generating mock data for user ${userId}`);
    }
  });

  // Check if late requests exist
  const existingLateRequests = localStorage.getItem('nova_hr_late_requests');
  if (!existingLateRequests || JSON.parse(existingLateRequests).length === 0) {
    generateMockAttendanceData();
  }
};