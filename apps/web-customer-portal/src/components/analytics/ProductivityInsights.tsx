import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Progress,
  List,
  Tag,
  Space,
  Button,
  Alert,
  Timeline,
  Tooltip,
  Badge,
  Spin,
  Empty,
} from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  RiseOutlined,
  FallOutlined,
  QuestionCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/charts';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface ProductivityPattern {
  period: 'morning' | 'afternoon' | 'evening';
  score: number;
  trend: 'up' | 'down' | 'stable';
  peak_hours: string[];
}

interface AIInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'achievement' | 'pattern';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actions?: string[];
}

export const ProductivityInsights: React.FC = () => {
  const [loading] = useState(false);

  // Mock data - would come from API
  const productivityPatterns: ProductivityPattern[] = [
    {
      period: 'morning',
      score: 85,
      trend: 'up',
      peak_hours: ['09:00', '10:30'],
    },
    {
      period: 'afternoon',
      score: 72,
      trend: 'stable',
      peak_hours: ['14:00', '15:30'],
    },
    {
      period: 'evening',
      score: 45,
      trend: 'down',
      peak_hours: ['17:00', '18:00'],
    },
  ];

  const aiInsights: AIInsight[] = [
    {
      id: '1',
      type: 'recommendation',
      title: '최적 근무 시간 발견',
      description: '오전 9시-11시에 생산성이 가장 높습니다. 중요한 업무는 이 시간대에 배치하는 것을 추천합니다.',
      impact: 'high',
      confidence: 92,
      actions: ['중요 업무 오전 배치', '집중 시간 블록 설정'],
    },
    {
      id: '2',
      type: 'pattern',
      title: '주말 전 생산성 저하',
      description: '금요일 오후에 생산성이 평균 15% 낮아지는 패턴이 발견되었습니다.',
      impact: 'medium',
      confidence: 78,
      actions: ['금요일 업무량 조정', '가벼운 업무로 전환'],
    },
    {
      id: '3',
      type: 'achievement',
      title: '월간 생산성 목표 달성',
      description: '이번 달 평균 생산성이 80%를 넘어섰습니다. 목표를 5% 초과 달성했습니다!',
      impact: 'high',
      confidence: 100,
    },
    {
      id: '4',
      type: 'warning',
      title: '휴식 시간 부족',
      description: '최근 2주간 연속 근무 시간이 길어지고 있습니다. 적절한 휴식을 취하세요.',
      impact: 'medium',
      confidence: 85,
      actions: ['휴식 시간 늘리기', '포모도로 기법 적용'],
    },
  ];

  // Chart data
  const weeklyProductivity = [
    { day: '월', productivity: 78, focus: 85 },
    { day: '화', productivity: 82, focus: 90 },
    { day: '수', productivity: 88, focus: 92 },
    { day: '목', productivity: 85, focus: 88 },
    { day: '금', productivity: 75, focus: 80 },
  ];

  const appUsageData = [
    { category: '업무도구', time: 240, percentage: 60 },
    { category: '커뮤니케이션', time: 80, percentage: 20 },
    { category: '브라우징', time: 40, percentage: 10 },
    { category: '기타', time: 40, percentage: 10 },
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return <BulbOutlined style={{ color: '#1890ff' }} />;
      case 'warning': return <QuestionCircleOutlined style={{ color: '#faad14' }} />;
      case 'achievement': return <TrophyOutlined style={{ color: '#52c41a' }} />;
      case 'pattern': return <BarChartOutlined style={{ color: '#722ed1' }} />;
      default: return <BulbOutlined />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'recommendation': return 'blue';
      case 'warning': return 'orange';
      case 'achievement': return 'green';
      case 'pattern': return 'purple';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <RiseOutlined style={{ color: '#52c41a' }} />;
      case 'down': return <FallOutlined style={{ color: '#ff4d4f' }} />;
      default: return <span style={{ color: '#faad14' }}>→</span>;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'morning': return '오전 (09:00-12:00)';
      case 'afternoon': return '오후 (13:00-17:00)';
      case 'evening': return '저녁 (18:00-21:00)';
      default: return period;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>AI가 생산성 패턴을 분석하고 있습니다...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          AI 생산성 인사이트
        </Title>
        <Paragraph>
          AI가 분석한 개인 생산성 패턴과 맞춤형 개선 제안을 확인하세요.
        </Paragraph>
      </div>

      {/* AI 인사이트 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {aiInsights.map((insight) => (
          <Col xs={24} lg={12} key={insight.id}>
            <Card
              size="small"
              style={{
                borderLeft: `4px solid ${
                  insight.type === 'achievement' ? '#52c41a' :
                  insight.type === 'warning' ? '#faad14' :
                  insight.type === 'recommendation' ? '#1890ff' : '#722ed1'
                }`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Space>
                  {getInsightIcon(insight.type)}
                  <Text strong>{insight.title}</Text>
                </Space>
                <Space>
                  <Tooltip title={`신뢰도: ${insight.confidence}%`}>
                    <Badge
                      count={`${insight.confidence}%`}
                      style={{
                        backgroundColor: insight.confidence >= 90 ? '#52c41a' :
                                        insight.confidence >= 70 ? '#faad14' : '#ff4d4f'
                      }}
                    />
                  </Tooltip>
                  <Tag color={getInsightColor(insight.type)}>
                    {insight.impact === 'high' ? '높음' : 
                     insight.impact === 'medium' ? '보통' : '낮음'}
                  </Tag>
                </Space>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {insight.description}
              </Text>
              {insight.actions && (
                <div style={{ marginTop: 12 }}>
                  <Text strong style={{ fontSize: 12 }}>추천 액션:</Text>
                  <ul style={{ margin: '4px 0 0 16px', fontSize: 12 }}>
                    {insight.actions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* 시간대별 생산성 패턴 */}
        <Col xs={24} lg={12}>
          <Card title="시간대별 생산성 패턴" extra={<FireOutlined />}>
            <div style={{ marginBottom: 16 }}>
              {productivityPatterns.map((pattern) => (
                <div
                  key={pattern.period}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    padding: 8,
                    backgroundColor: '#fafafa',
                    borderRadius: 4,
                  }}
                >
                  <Space>
                    <Text strong>{getPeriodLabel(pattern.period)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      피크: {pattern.peak_hours.join(', ')}
                    </Text>
                  </Space>
                  <Space>
                    <Progress
                      type="circle"
                      size={40}
                      percent={pattern.score}
                      format={() => `${pattern.score}%`}
                      strokeColor={
                        pattern.score >= 80 ? '#52c41a' :
                        pattern.score >= 60 ? '#faad14' : '#ff4d4f'
                      }
                    />
                    {getTrendIcon(pattern.trend)}
                  </Space>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 주간 생산성 트렌드 */}
        <Col xs={24} lg={12}>
          <Card title="주간 생산성 트렌드">
            <Line
              data={weeklyProductivity}
              xField="day"
              yField="productivity"
              seriesField="type"
              point={{
                size: 5,
                shape: 'diamond',
              }}
              color={['#1890ff', '#52c41a']}
              height={200}
            />
          </Card>
        </Col>

        {/* 앱 사용 시간 분석 */}
        <Col xs={24} lg={12}>
          <Card title="앱 사용 시간 분석">
            <Pie
              data={appUsageData}
              angleField="time"
              colorField="category"
              radius={0.8}
              innerRadius={0.4}
              label={{
                type: 'inner',
                offset: '-30%',
                content: (data: any) => `${data.percentage}%`,
                style: {
                  textAlign: 'center',
                  fontSize: 14,
                },
              }}
              height={250}
            />
          </Card>
        </Col>

        {/* 생산성 향상 팁 */}
        <Col xs={24} lg={12}>
          <Card 
            title="AI 추천 생산성 팁"
            extra={
              <Button type="link" size="small">
                더 보기
              </Button>
            }
          >
            <Timeline
              items={[
                {
                  dot: <BulbOutlined style={{ fontSize: 16 }} />,
                  children: (
                    <div>
                      <Text strong>포모도로 기법 활용</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        25분 집중 + 5분 휴식으로 생산성 15% 향상 예상
                      </Text>
                    </div>
                  ),
                },
                {
                  dot: <ClockCircleOutlined style={{ fontSize: 16 }} />,
                  children: (
                    <div>
                      <Text strong>오전 집중 시간 활용</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        9시-11시 높은 집중도를 중요 업무에 활용
                      </Text>
                    </div>
                  ),
                },
                {
                  dot: <EyeOutlined style={{ fontSize: 16 }} />,
                  children: (
                    <div>
                      <Text strong>규칙적인 휴식</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        1시간마다 5분 휴식으로 지속 가능한 생산성 유지
                      </Text>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* 추가 정보 */}
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Alert
            message="AI 인사이트 정보"
            description="이 분석은 지난 30일간의 데이터를 기반으로 합니다. 더 정확한 분석을 위해 꾸준히 데이터를 수집하고 있습니다."
            type="info"
            showIcon
            style={{ borderRadius: 8 }}
          />
        </Col>
      </Row>
    </div>
  );
};