import { Card, Row, Col, Statistic, Typography, Table, Tag } from 'antd';
import { UserOutlined, ClockCircleOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

const recentRequests = [
  {
    key: '1',
    employee: '홍길동',
    type: '연차 신청',
    date: '2024-08-19',
    status: 'pending',
  },
  {
    key: '2',
    employee: '김철수',
    type: '출근 정정',
    date: '2024-08-18',
    status: 'approved',
  },
  {
    key: '3',
    employee: '이영희',
    type: '비용 청구',
    date: '2024-08-17',
    status: 'pending',
  },
];

const columns = [
  {
    title: '직원명',
    dataIndex: 'employee',
    key: 'employee',
  },
  {
    title: '유형',
    dataIndex: 'type',
    key: 'type',
  },
  {
    title: '신청일',
    dataIndex: 'date',
    key: 'date',
  },
  {
    title: '상태',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const color = status === 'pending' ? 'orange' : 'green';
      const text = status === 'pending' ? '대기중' : '승인됨';
      return <Tag color={color}>{text}</Tag>;
    },
  },
];

export const Dashboard = () => {
  return (
    <div className='space-y-6'>
      <div>
        <Title level={2}>HR 관리 대시보드</Title>
        <p className='text-gray-600'>조직 현황을 한눈에 확인하세요</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='전체 직원'
              value={47}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#0ea5e9' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='금일 출근'
              value={43}
              suffix='/ 47'
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='승인 대기'
              value={8}
              suffix='건'
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title='이번달 처리'
              value={156}
              suffix='건'
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title='최근 요청사항' className='h-full'>
            <Table
              columns={columns}
              dataSource={recentRequests}
              pagination={false}
              size='small'
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title='빠른 액션' className='h-full'>
            <div className='space-y-4'>
              <div className='p-4 bg-blue-50 rounded-lg'>
                <div className='font-medium text-blue-900'>사용자 관리</div>
                <div className='text-sm text-blue-700 mt-1'>새 직원 등록 및 권한 설정</div>
              </div>
              <div className='p-4 bg-green-50 rounded-lg'>
                <div className='font-medium text-green-900'>근태 승인</div>
                <div className='text-sm text-green-700 mt-1'>출퇴근 정정 및 휴가 승인</div>
              </div>
              <div className='p-4 bg-purple-50 rounded-lg'>
                <div className='font-medium text-purple-900'>정책 설정</div>
                <div className='text-sm text-purple-700 mt-1'>근무 시간 및 휴가 정책 관리</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};