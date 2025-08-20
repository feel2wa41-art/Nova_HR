import { Card, Row, Col, Statistic, Typography, Button, Badge } from 'antd';
import { ClockCircleOutlined, CalendarOutlined, FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { AttendanceCard } from '../components/attendance/AttendanceCard';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';

const { Title } = Typography;

export const Dashboard = () => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState({
    lateRequests: 0,
    leaveRequests: 0,
    totalPending: 0
  });

  // Check for pending approvals for HR managers
  useEffect(() => {
    if (user?.permissions?.includes('manage_leaves') || user?.permissions?.includes('view_all_attendance')) {
      // Get late approval requests
      const lateRequests = JSON.parse(localStorage.getItem('nova_hr_late_requests') || '[]');
      const pendingLateRequests = lateRequests.filter((req: any) => req.status === 'PENDING_APPROVAL').length;
      
      // Get leave requests (from existing leave system)
      const leaveRequests = JSON.parse(localStorage.getItem('nova_hr_leave_requests') || '[]');
      const pendingLeaveRequests = leaveRequests.filter((req: any) => req.status === 'PENDING').length;
      
      setPendingApprovals({
        lateRequests: pendingLateRequests,
        leaveRequests: pendingLeaveRequests,
        totalPending: pendingLateRequests + pendingLeaveRequests
      });
    }
  }, [user]);

  const isHRManager = user?.permissions?.includes('manage_leaves') || user?.permissions?.includes('view_all_attendance');

  return (
    <div className='space-y-6'>
      <div>
        <Title level={2}>대시보드</Title>
        <p className='text-gray-600'>오늘의 현황을 확인하세요</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='오늘 근무시간'
              value='8시간 30분'
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#0ea5e9' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='잔여 연차'
              value={12.5}
              suffix='일'
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={isHRManager ? '대기중인 결재' : '대기중인 결재'}
              value={isHRManager ? pendingApprovals.totalPending : 3}
              suffix='건'
              prefix={<FileTextOutlined />}
              valueStyle={{ color: pendingApprovals.totalPending > 0 ? '#f59e0b' : '#22c55e' }}
            />
            {isHRManager && pendingApprovals.totalPending > 0 && (
              <Link to="/hr-management">
                <Button type="link" size="small" className="mt-2 p-0">
                  승인 처리하기 →
                </Button>
              </Link>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='이번 달 출근일'
              value={22}
              suffix='일'
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <AttendanceCard className='h-full' />
        </Col>
        <Col xs={24} lg={12}>
          <Card title='빠른 액션' className='h-full'>
            <div className='space-y-3'>
              <Link to="/leave">
                <Button size='large' block icon={<CalendarOutlined />}>
                  휴가 신청
                </Button>
              </Link>
              <Button size='large' block icon={<FileTextOutlined />}>
                전자결재 작성
              </Button>
              <Button size='large' block icon={<CheckCircleOutlined />}>
                근태 현황 조회
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* HR Manager Approval Summary */}
      {isHRManager && pendingApprovals.totalPending > 0 && (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <ExclamationCircleOutlined className="text-orange-500" />
                  승인 대기 현황
                  <Badge count={pendingApprovals.totalPending} />
                </div>
              } 
              className='border-orange-200'
            >
              <Row gutter={[16, 16]}>
                {pendingApprovals.lateRequests > 0 && (
                  <Col xs={24} sm={12}>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-orange-800">지각 승인 요청</h4>
                          <p className="text-orange-600">{pendingApprovals.lateRequests}건 대기중</p>
                        </div>
                        <Link to="/hr-management?tab=attendance">
                          <Button type="primary" size="small" className="bg-orange-500 border-orange-500">
                            처리하기
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Col>
                )}
                {pendingApprovals.leaveRequests > 0 && (
                  <Col xs={24} sm={12}>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-blue-800">휴가 신청 요청</h4>
                          <p className="text-blue-600">{pendingApprovals.leaveRequests}건 대기중</p>
                        </div>
                        <Link to="/hr-management?tab=leave">
                          <Button type="primary" size="small">
                            처리하기
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title='최근 활동' className='h-full'>
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <span>출근 체크인</span>
                <span className='text-gray-500'>09:00</span>
              </div>
              <div className='flex justify-between items-center'>
                <span>점심시간</span>
                <span className='text-gray-500'>12:00 - 13:00</span>
              </div>
              <div className='flex justify-between items-center'>
                <span>회의실 예약</span>
                <span className='text-gray-500'>14:00 - 15:00</span>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};