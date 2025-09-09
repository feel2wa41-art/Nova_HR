import { useState } from 'react';
import { Card, Row, Col, Button, Typography, Statistic, Space, Alert } from 'antd';
import { CalendarOutlined, PlusOutlined, ClockCircleOutlined, CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { LeaveApplicationForm } from '../components/leave/LeaveApplicationForm';
import { LeaveRequestsList } from '../components/leave/LeaveRequestsList';
import { useLeave } from '../hooks/useLeave';
import { useEffect } from 'react';

const { Title } = Typography;

export const Leave = () => {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const { leaveBalances, fetchLeaveBalances } = useLeave();

  useEffect(() => {
    if (leaveBalances.length === 0) {
      fetchLeaveBalances().catch(console.error);
    }
  }, [leaveBalances.length, fetchLeaveBalances]);

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false);
    // Refresh data if needed
  };

  const totalAllocated = leaveBalances.reduce((sum, balance) => sum + balance.allocated, 0);
  const totalUsed = leaveBalances.reduce((sum, balance) => sum + balance.used, 0);
  const totalPending = leaveBalances.reduce((sum, balance) => sum + balance.pending, 0);
  const totalRemaining = leaveBalances.reduce((sum, balance) => sum + balance.remaining, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={2}>휴가 관리</Title>
          <p className="text-gray-600">휴가 신청 및 현황을 관리하세요</p>
        </div>
        <Space direction="vertical" align="end">
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setShowApplicationForm(true)}
          >
            휴가 신청
          </Button>
          <div className="text-xs text-gray-500 flex items-center">
            <FileTextOutlined className="mr-1" />
            전자결재 시스템 연동
          </div>
        </Space>
      </div>

      {/* Leave Balance Overview */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="총 배정 휴가"
              value={totalAllocated}
              suffix="일"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="사용한 휴가"
              value={totalUsed}
              suffix="일"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="승인 대기"
              value={totalPending}
              suffix="일"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="잔여 휴가"
              value={totalRemaining}
              suffix="일"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Detailed Leave Balances */}
      <Card title="휴가 종류별 현황">
        <Row gutter={[16, 16]}>
          {leaveBalances.map((balance) => (
            <Col xs={24} sm={12} lg={8} key={balance.leaveType}>
              <Card size="small" className="bg-gray-50">
                <div className="space-y-2">
                  <div className="font-medium text-lg">{balance.leaveType}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>배정:</span>
                      <span className="font-medium">{balance.allocated}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span>사용:</span>
                      <span className="font-medium text-red-600">{balance.used}일</span>
                    </div>
                    <div className="flex justify-between">
                      <span>대기:</span>
                      <span className="font-medium text-orange-600">{balance.pending}일</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span>잔여:</span>
                      <span className="font-bold text-green-600">{balance.remaining}일</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${(balance.remaining / balance.allocated) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Leave Requests List */}
      <LeaveRequestsList />

      {/* Leave Application Form Modal */}
      <LeaveApplicationForm
        open={showApplicationForm}
        onCancel={() => setShowApplicationForm(false)}
        onSuccess={handleApplicationSuccess}
      />
    </div>
  );
};