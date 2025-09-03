import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Spin,
  message,
  Button,
  Space,
  Select,
  Modal,
  Tag,
  Typography,
  Empty,
  DatePicker,
  Input,
  Pagination,
  Checkbox,
  Popconfirm
} from 'antd';
import {
  CameraOutlined,
  ReloadOutlined,
  EyeOutlined,
  DownloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

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
    }
  }
}

interface ScreenshotResponse {
  data: Screenshot[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const RealScreenshotViewer: React.FC = () => {
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    userId: undefined as string | undefined,
    dateFilter: 'month' as 'today' | 'yesterday' | 'week' | 'month' | 'custom',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
    page: 1,
    limit: 20
  });
  
  // 삭제 관련 상태
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedScreenshots, setSelectedScreenshots] = useState<string[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteType, setDeleteType] = useState<'selected' | 'all'>('selected');
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDateTime = (dateStr: string) => {
    return dayjs(dateStr).format('MM-DD HH:mm:ss');
  };

  // API에서 실제 스크린샷 데이터 가져오기
  const { 
    data: screenshotsResponse, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<ScreenshotResponse>({
    queryKey: ['real-screenshots', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.dateFilter !== 'custom') {
        params.append('dateFilter', filters.dateFilter);
      } else {
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
      }
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      console.log('Fetching real screenshots with params:', params.toString());
      const response = await apiClient.get(`/attitude/admin/screenshots?${params.toString()}`);
      console.log('Real screenshots response:', response.data);
      return response.data;
    },
    retry: 1,
    staleTime: 30000,
  });

  // 사용자 목록 가져오기
  const { data: users } = useQuery({
    queryKey: ['users-for-screenshots'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/users');
        return response.data;
      } catch (error) {
        console.log('Failed to fetch users:', error);
        return [];
      }
    }
  });

  const screenshots = screenshotsResponse?.data || [];
  const total = screenshotsResponse?.total || 0;
  const currentPage = screenshotsResponse?.page || 1;
  const totalPages = screenshotsResponse?.totalPages || 0;

  const handleViewScreenshot = (screenshot: Screenshot) => {
    setSelectedScreenshot(screenshot);
    setModalVisible(true);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1 // Reset to first page when changing filters
    }));
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
        dateFilter: 'custom',
        page: 1
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: undefined,
        endDate: undefined,
        dateFilter: 'today',
        page: 1
      }));
    }
  };

  const isValidImage = (url: string | null | undefined): boolean => {
    if (!url) return false;
    // SVG placeholder는 제외하고 실제 PNG/JPG 이미지만 허용
    return url.startsWith('data:image/png;base64,') || 
           url.startsWith('data:image/jpeg;base64,') ||
           url.startsWith('http');
  };

  // 삭제 관련 함수들
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
    setIsDeleting(true);
    try {
      if (deleteType === 'selected') {
        // 선택된 스크린샷 삭제
        await apiClient.delete('/attitude/admin/screenshots/batch', {
          data: { screenshotIds: selectedScreenshots }
        });
        message.success(`${selectedScreenshots.length}개의 스크린샷이 삭제되었습니다.`);
      } else {
        // 현재 필터 조건의 모든 스크린샷 삭제
        const params = new URLSearchParams();
        if (filters.userId) params.append('userId', filters.userId);
        if (filters.dateFilter !== 'custom') {
          params.append('dateFilter', filters.dateFilter);
        } else {
          if (filters.startDate) params.append('startDate', filters.startDate);
          if (filters.endDate) params.append('endDate', filters.endDate);
        }
        
        await apiClient.delete(`/attitude/admin/screenshots/all?${params.toString()}`);
        message.success(`필터 조건의 모든 스크린샷이 삭제되었습니다.`);
      }
      
      // 상태 초기화 및 데이터 새로고침
      setSelectedScreenshots([]);
      setDeleteMode(false);
      setDeleteModalVisible(false);
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
      message.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3}>
          <CameraOutlined /> 실제 스크린샷 뷰어
        </Title>
        <Text type="secondary">
          데이터베이스에 저장된 실제 스크린샷 이미지를 표시합니다.
        </Text>
      </div>

      {/* 필터 컨트롤 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Select
            placeholder="사용자 선택"
            value={filters.userId}
            onChange={(value) => handleFilterChange('userId', value)}
            style={{ width: 160 }}
            allowClear
          >
            {users?.map((user: any) => (
              <Option key={user.id} value={user.id}>
                {user.name}
              </Option>
            ))}
          </Select>

          <Select
            value={filters.dateFilter}
            onChange={(value) => handleFilterChange('dateFilter', value)}
            style={{ width: 120 }}
          >
            <Option value="today">오늘</Option>
            <Option value="yesterday">어제</Option>
            <Option value="week">1주일</Option>
            <Option value="month">1개월</Option>
            <Option value="custom">기간 선택</Option>
          </Select>

          {filters.dateFilter === 'custom' && (
            <RangePicker
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              placeholder={['시작일', '종료일']}
            />
          )}

          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            새로고침
          </Button>

          {/* 삭제 모드 토글 */}
          <Button 
            type={deleteMode ? "primary" : "default"}
            icon={<CheckSquareOutlined />}
            onClick={handleToggleDeleteMode}
          >
            {deleteMode ? "선택 취소" : "삭제 모드"}
          </Button>

          {/* 삭제 모드일 때만 표시되는 버튼들 */}
          {deleteMode && screenshots.length > 0 && (
            <>
              <Checkbox
                checked={selectedScreenshots.length === screenshots.length && screenshots.length > 0}
                indeterminate={selectedScreenshots.length > 0 && selectedScreenshots.length < screenshots.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                전체 선택 ({selectedScreenshots.length}/{screenshots.length})
              </Checkbox>

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
                description="현재 필터 조건의 모든 스크린샷을 삭제하시겠습니까?"
                onConfirm={handleDeleteAll}
                okText="삭제"
                cancelText="취소"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  전체 삭제 ({total})
                </Button>
              </Popconfirm>
            </>
          )}

          <Text type="secondary">
            총 {total}개 스크린샷 (페이지 {currentPage}/{totalPages})
          </Text>
        </Space>
      </Card>

      {/* 스크린샷 그리드 */}
      <Spin spinning={isLoading}>
        {error ? (
          <Card>
            <Empty
              description={
                <div>
                  <Text type="danger">스크린샷 로드 실패</Text>
                  <br />
                  <Text type="secondary">{(error as any)?.message || '서버 오류'}</Text>
                </div>
              }
            />
          </Card>
        ) : screenshots.length === 0 ? (
          <Card>
            <Empty description="조건에 맞는 스크린샷이 없습니다" />
          </Card>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {screenshots.map((screenshot) => (
                <Col key={screenshot.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                  <Card
                    size="small"
                    hoverable={!deleteMode}
                    onClick={() => !deleteMode && handleViewScreenshot(screenshot)}
                    className={deleteMode && selectedScreenshots.includes(screenshot.id) ? 'border-red-400 shadow-lg' : ''}
                    cover={
                      <div
                        style={{
                          height: 120,
                          backgroundColor: '#f5f5f5',
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
                        {isValidImage(screenshot.thumbnail_url) ? (
                          <img
                            src={screenshot.thumbnail_url}
                            alt="스크린샷"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '4px 4px 0 0'
                            }}
                            onError={(e) => {
                              console.error('Image load error:', screenshot.id, screenshot.thumbnail_url);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: '#999' }}>
                            <CameraOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                            <br />
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {screenshot.file_url?.includes('svg') ? '캡처 실패' : '이미지 없음'}
                            </Text>
                          </div>
                        )}
                        
                        {/* 블러 표시 */}
                        {screenshot.is_blurred && (
                          <Tag
                            color="orange"
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              fontSize: 10
                            }}
                          >
                            블러
                          </Tag>
                        )}
                      </div>
                    }
                  >
                    <div style={{ textAlign: 'center' }}>
                      <Text strong style={{ fontSize: 12 }}>
                        {screenshot.session.user.name}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        {formatDateTime(screenshot.captured_at)}
                      </Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 페이지네이션 */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Pagination
                current={currentPage}
                total={total}
                pageSize={filters.limit}
                onChange={(page) => handleFilterChange('page', page)}
                onShowSizeChange={(current, size) => handleFilterChange('limit', size)}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} of ${total} 스크린샷`
                }
              />
            </div>
          </>
        )}
      </Spin>

      {/* 스크린샷 상세 모달 */}
      <Modal
        title="스크린샷 상세 정보"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            닫기
          </Button>,
          selectedScreenshot && isValidImage(selectedScreenshot.file_url) && (
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                if (selectedScreenshot?.file_url) {
                  const link = document.createElement('a');
                  link.href = selectedScreenshot.file_url;
                  link.download = `screenshot_${selectedScreenshot.session.user.name}_${dayjs(selectedScreenshot.captured_at).format('YYYY-MM-DD_HH-mm-ss')}.png`;
                  link.click();
                }
              }}
            >
              다운로드
            </Button>
          )
        ]}
      >
        {selectedScreenshot && (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* 스크린샷 이미지 */}
              <div style={{ textAlign: 'center' }}>
                {isValidImage(selectedScreenshot.file_url) ? (
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
                    />
                  </div>
                ) : (
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
                          : '스크린샷을 표시할 수 없습니다'
                        }
                      </div>
                      <div style={{ color: '#ccc', fontSize: 12 }}>
                        데스크톱 에이전트 상태를 확인해주세요
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 상세 정보 */}
              <div>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text strong>사용자:</Text>
                  </Col>
                  <Col span={16}>
                    <Text>{selectedScreenshot.session.user.name}</Text>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>직책:</Text>
                  </Col>
                  <Col span={16}>
                    <Text>{selectedScreenshot.session.user.title}</Text>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>캡처 시간:</Text>
                  </Col>
                  <Col span={16}>
                    <Text>{dayjs(selectedScreenshot.captured_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>상태:</Text>
                  </Col>
                  <Col span={16}>
                    <Tag color={selectedScreenshot.is_blurred ? 'orange' : 'green'}>
                      {selectedScreenshot.is_blurred ? '블러 처리됨' : '정상'}
                    </Tag>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>세션 ID:</Text>
                  </Col>
                  <Col span={16}>
                    <Text code style={{ fontSize: 10 }}>{selectedScreenshot.session_id}</Text>
                  </Col>
                </Row>
              </div>
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
        okButtonProps={{ danger: true, loading: isDeleting }}
        cancelButtonProps={{ disabled: isDeleting }}
        width={500}
        closable={!isDeleting}
        maskClosable={!isDeleting}
      >
        <div style={{ paddingTop: '16px' }}>
          {deleteType === 'selected' ? (
            <div>
              <p>선택된 <strong>{selectedScreenshots.length}개</strong>의 스크린샷을 삭제하시겠습니까?</p>
              <p style={{ color: '#666', fontSize: '14px' }}>삭제된 스크린샷은 복구할 수 없습니다.</p>
            </div>
          ) : (
            <div>
              <p>현재 필터 조건의 <strong>모든 스크린샷 ({total}개)</strong>을 삭제하시겠습니까?</p>
              <p style={{ color: '#ff4d4f', fontSize: '14px', fontWeight: 'medium' }}>
                ⚠️ 주의: 이 작업은 되돌릴 수 없습니다!
              </p>
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                backgroundColor: '#f5f5f5', 
                borderRadius: '6px' 
              }}>
                <p style={{ fontSize: '13px', marginBottom: '4px', fontWeight: 'medium' }}>
                  삭제 대상 조건:
                </p>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>
                  • 사용자: {filters.userId ? 
                    users?.find((u: any) => u.id === filters.userId)?.name || '지정됨' : 
                    '전체'
                  }
                </p>
                <p style={{ fontSize: '13px', margin: '2px 0' }}>
                  • 기간: {filters.dateFilter === 'today' ? '오늘' : 
                           filters.dateFilter === 'week' ? '1주일' :
                           filters.dateFilter === 'month' ? '1개월' : '사용자 지정'}
                </p>
                {filters.dateFilter === 'custom' && filters.startDate && filters.endDate && (
                  <p style={{ fontSize: '13px', margin: '2px 0' }}>
                    • 날짜: {filters.startDate} ~ {filters.endDate}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RealScreenshotViewer;