import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Typography,
  Progress,
  Tag,
  Avatar,
  List,
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface ApprovalStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  avgProcessingTime: number;
}

interface CategoryStats {
  category_name: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  approval_rate: number;
}

interface UserStats {
  user_id: string;
  user_name: string;
  user_title?: string;
  total_approvals: number;
  avg_response_time: number;
  approval_rate: number;
}

interface RecentActivity {
  id: string;
  title: string;
  user_name: string;
  category_name: string;
  status: string;
  created_at: string;
  processed_at?: string;
}

export const ApprovalStatistics = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [stats, setStats] = useState<ApprovalStats>({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    avgProcessingTime: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const categoryColumns: ColumnsType<CategoryStats> = [
    {
      title: '카테고리',
      dataIndex: 'category_name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '전체',
      dataIndex: 'total',
      width: 80,
      align: 'center',
    },
    {
      title: '승인',
      dataIndex: 'approved',
      width: 80,
      align: 'center',
      render: (value) => <Text style={{ color: '#52c41a' }}>{value}</Text>,
    },
    {
      title: '반려',
      dataIndex: 'rejected',
      width: 80,
      align: 'center',
      render: (value) => <Text style={{ color: '#ff4d4f' }}>{value}</Text>,
    },
    {
      title: '대기',
      dataIndex: 'pending',
      width: 80,
      align: 'center',
      render: (value) => <Text style={{ color: '#faad14' }}>{value}</Text>,
    },
    {
      title: '승인율',
      dataIndex: 'approval_rate',
      width: 120,
      align: 'center',
      render: (rate) => (
        <Progress
          percent={rate}
          size="small"
          format={(percent) => `${percent}%`}
        />
      ),
    },
  ];

  const userColumns: ColumnsType<UserStats> = [
    {
      title: '승인자',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <Text strong>{record.user_name}</Text>
            {record.user_title && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {record.user_title}
                </Text>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '처리 건수',
      dataIndex: 'total_approvals',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.total_approvals - b.total_approvals,
    },
    {
      title: '평균 응답시간',
      dataIndex: 'avg_response_time',
      width: 120,
      align: 'center',
      render: (hours) => `${hours.toFixed(1)}시간`,
      sorter: (a, b) => a.avg_response_time - b.avg_response_time,
    },
    {
      title: '승인율',
      dataIndex: 'approval_rate',
      width: 120,
      align: 'center',
      render: (rate) => (
        <Progress
          percent={rate}
          size="small"
          format={(percent) => `${percent}%`}
          strokeColor={rate >= 80 ? '#52c41a' : rate >= 60 ? '#faad14' : '#ff4d4f'}
        />
      ),
      sorter: (a, b) => a.approval_rate - b.approval_rate,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      case 'PENDING': return 'orange';
      case 'IN_PROGRESS': return 'blue';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return '승인';
      case 'REJECTED': return '반려';
      case 'PENDING': return '대기';
      case 'IN_PROGRESS': return '진행중';
      default: return status;
    }
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      // TODO: API 호출
      // const [statsRes, categoryRes, userRes, activityRes] = await Promise.all([
      //   api.get('/approval/statistics', { params: { start_date: dateRange[0], end_date: dateRange[1] } }),
      //   api.get('/approval/statistics/categories', { params: { start_date: dateRange[0], end_date: dateRange[1] } }),
      //   api.get('/approval/statistics/users', { params: { start_date: dateRange[0], end_date: dateRange[1] } }),
      //   api.get('/approval/activities/recent'),
      // ]);

      // 임시 데이터
      setStats({
        total: 245,
        approved: 189,
        rejected: 23,
        pending: 33,
        avgProcessingTime: 4.2,
      });

      setCategoryStats([
        { category_name: '휴가 신청', total: 120, approved: 98, rejected: 8, pending: 14, approval_rate: 85.2 },
        { category_name: '출장 신청', total: 67, approved: 52, rejected: 7, pending: 8, approval_rate: 88.1 },
        { category_name: '교육 신청', total: 43, approved: 32, rejected: 6, pending: 5, approval_rate: 84.2 },
        { category_name: '기타', total: 15, approved: 7, rejected: 2, pending: 6, approval_rate: 77.8 },
      ]);

      setUserStats([
        { user_id: '1', user_name: '김팀장', user_title: '팀장', total_approvals: 67, avg_response_time: 2.1, approval_rate: 92.5 },
        { user_id: '2', user_name: '박부장', user_title: '부장', total_approvals: 45, avg_response_time: 3.8, approval_rate: 88.9 },
        { user_id: '3', user_name: '이과장', user_title: '과장', total_approvals: 34, avg_response_time: 1.9, approval_rate: 94.1 },
        { user_id: '4', user_name: '최대리', user_title: '대리', total_approvals: 23, avg_response_time: 4.2, approval_rate: 87.0 },
      ]);

      setRecentActivities([
        {
          id: '1',
          title: '연차 휴가 신청',
          user_name: '홍길동',
          category_name: '휴가 신청',
          status: 'APPROVED',
          created_at: dayjs().subtract(2, 'hours').toISOString(),
          processed_at: dayjs().subtract(1, 'hours').toISOString(),
        },
        {
          id: '2',
          title: '서울 출장 신청',
          user_name: '김직원',
          category_name: '출장 신청',
          status: 'PENDING',
          created_at: dayjs().subtract(4, 'hours').toISOString(),
        },
        {
          id: '3',
          title: '외부 교육 신청',
          user_name: '박사원',
          category_name: '교육 신청',
          status: 'REJECTED',
          created_at: dayjs().subtract(6, 'hours').toISOString(),
          processed_at: dayjs().subtract(3, 'hours').toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">결재 통계</h3>
          <p className="text-gray-600">전자결재 처리 현황과 통계를 확인합니다.</p>
        </div>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]]);
            }
          }}
          format="YYYY-MM-DD"
        />
      </div>

      {/* 전체 통계 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="전체 문서"
              value={stats.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="승인 완료"
              value={stats.approved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="반려"
              value={stats.rejected}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="대기중"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card>
            <Statistic
              title="평균 처리 시간"
              value={stats.avgProcessingTime}
              suffix="시간"
              precision={1}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="전체 승인율"
              value={stats.total > 0 ? ((stats.approved / (stats.total - stats.pending)) * 100) : 0}
              suffix="%"
              precision={1}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 카테고리별 통계 */}
      <Card title="카테고리별 통계" loading={loading}>
        <Table
          columns={categoryColumns}
          dataSource={categoryStats}
          rowKey="category_name"
          pagination={false}
          size="small"
        />
      </Card>

      <Row gutter={16}>
        {/* 승인자별 통계 */}
        <Col span={16}>
          <Card title={<div className="flex items-center gap-2"><TrophyOutlined />승인자별 성과</div>} loading={loading}>
            <Table
              columns={userColumns}
              dataSource={userStats}
              rowKey="user_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* 최근 활동 */}
        <Col span={8}>
          <Card title="최근 활동" loading={loading}>
            <List
              dataSource={recentActivities}
              renderItem={(item) => (
                <List.Item className="border-0 px-0">
                  <div className="w-full">
                    <div className="flex justify-between items-start mb-1">
                      <Text strong className="text-sm">{item.title}</Text>
                      <Tag color={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Tag>
                    </div>
                    <div className="text-xs text-gray-500">
                      <div>{item.user_name} • {item.category_name}</div>
                      <div>{dayjs(item.created_at).format('MM-DD HH:mm')}</div>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};