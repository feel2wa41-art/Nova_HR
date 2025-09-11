/**
 * 사용자 휴가 잔여 관리 페이지
 * 
 * 주요 기능:
 * 1. 회사별 사용자 휴가 잔여 현황 조회
 * 2. 휴가 할당량 인라인 편집 (0.5일 단위 지원)
 * 3. 실시간 잔여 계산 (할당량 - 사용량 - 대기량 = 잔여량)
 * 4. 테넌트별 데이터 격리
 * 
 * 기술 특징:
 * - Ant Design Table의 인라인 편집
 * - InputNumber로 0.5일 단위 입력 지원
 * - 실시간 API 호출로 즉시 반영
 * - 사용자 친화적 UI/UX
 */
import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  message,
  InputNumber,
  Form,
  Modal,
  Select,
  Input,
  Alert,
  Tag,
  Tooltip,
  Spin,
  Upload,
  Row,
  Col
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  HistoryOutlined,
  UserOutlined,
  CalendarOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface UserLeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  available: number;
  notes?: string;
  user: {
    id: string;
    name: string;
    email: string;
    employee_profile?: {
      employee_id?: string;
      department?: string;
      position?: string;
    };
  };
  leaveType: {
    id: string;
    name: string;
    code: string;
    colorHex: string;
    allowHalfDays: boolean;
  };
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  colorHex: string;
  allowHalfDays: boolean;
}

interface UserSummary {
  user: {
    id: string;
    name: string;
    email: string;
    employee_profile?: {
      employee_id?: string;
      department?: string;
      position?: string;
    };
  };
  leaveBalances: {
    leaveTypeId: string;
    leaveTypeName: string;
    leaveTypeCode: string;
    colorHex: string;
    allocated: number;
    used: number;
    pending: number;
    available: number;
    allowHalfDays: boolean;
  }[];
}

interface LeaveBalanceSummary {
  year: number;
  leaveTypes: LeaveType[];
  userSummaries: UserSummary[];
}

export const UserLeaveBalanceManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [data, setData] = useState<LeaveBalanceSummary | null>(null);
  const [filteredData, setFilteredData] = useState<LeaveBalanceSummary | null>(null);
  const [editingCell, setEditingCell] = useState<{userId: string, leaveTypeId: string} | null>(null);
  const [tempValue, setTempValue] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<any>(null);
  const [form] = Form.useForm();
  
  // 검색 및 필터 상태
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // 데이터 로드
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/user-leave-balance/summary?year=${selectedYear}`);
      setData(response.data);
    } catch (error: any) {
      console.error('Failed to fetch leave balance data:', error);
      message.error('휴가 할당량 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  // 데이터 필터링
  useEffect(() => {
    if (!data) {
      setFilteredData(null);
      return;
    }

    let filtered = { ...data };
    
    // 사용자명/이메일 검색
    if (searchText) {
      filtered.userSummaries = data.userSummaries.filter(userSummary => 
        userSummary.user.name.toLowerCase().includes(searchText.toLowerCase()) ||
        userSummary.user.email.toLowerCase().includes(searchText.toLowerCase()) ||
        userSummary.user.employee_profile?.employee_id?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // 부서별 필터링
    if (selectedDepartment) {
      filtered.userSummaries = filtered.userSummaries.filter(userSummary => 
        userSummary.user.employee_profile?.department === selectedDepartment
      );
    }

    setFilteredData(filtered);
  }, [data, searchText, selectedDepartment]);

  // 부서 목록 추출
  const getDepartments = () => {
    if (!data) return [];
    const departments = new Set<string>();
    data.userSummaries.forEach(userSummary => {
      if (userSummary.user.employee_profile?.department) {
        departments.add(userSummary.user.employee_profile.department);
      }
    });
    return Array.from(departments).sort();
  };

  // 할당량 수정
  const updateAllocation = async (userId: string, leaveTypeId: string, newAllocated: number, notes?: string) => {
    try {
      setSaving(`${userId}-${leaveTypeId}`);
      
      // 먼저 기존 balance를 찾기 위해 API 호출
      const balancesResponse = await apiClient.get(`/user-leave-balance?year=${selectedYear}&userId=${userId}`);
      const existingBalance = balancesResponse.data.find((b: any) => b.leaveTypeId === leaveTypeId);
      
      if (!existingBalance) {
        // 새로 생성
        await apiClient.post('/user-leave-balance', {
          userId,
          leaveTypeId,
          year: selectedYear,
          allocated: newAllocated,
          notes
        });
      } else {
        // 기존 항목 업데이트
        await apiClient.put(`/user-leave-balance/${existingBalance.id}`, {
          allocated: newAllocated,
          notes,
          reason: `관리자에 의한 ${selectedYear}년 할당량 조정`
        });
      }

      message.success('할당량이 업데이트되었습니다.');
      await fetchData(); // 데이터 새로고침
    } catch (error: any) {
      console.error('Failed to update allocation:', error);
      message.error('할당량 업데이트에 실패했습니다.');
    } finally {
      setSaving(null);
      setEditingCell(null);
    }
  };

  // 편집 시작
  const startEdit = (userId: string, leaveTypeId: string, currentValue: number) => {
    setEditingCell({ userId, leaveTypeId });
    setTempValue(currentValue);
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingCell(null);
    setTempValue(0);
  };

  // 편집 저장
  const saveEdit = async () => {
    if (!editingCell) return;
    await updateAllocation(editingCell.userId, editingCell.leaveTypeId, tempValue);
  };

  // 엑셀 다운로드 (템플릿)
  const downloadTemplate = () => {
    if (!data) return;
    
    // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    
    // 필터링된 데이터 사용 (검색/필터 적용된 결과)
    const exportData = filteredData || data;
    
    // CSV 형식으로 템플릿 생성
    const headers = ['사용자ID', '사용자명', '이메일', '부서', ...data.leaveTypes.map(lt => lt.name)];
    const csvContent = BOM + [
      headers.join(','),
      ...exportData.userSummaries.map(userSummary => [
        `"${userSummary.user.id}"`,
        `"${userSummary.user.name}"`,
        `"${userSummary.user.email}"`,
        `"${userSummary.user.employee_profile?.department || ''}"`,
        ...data.leaveTypes.map(leaveType => {
          const balance = userSummary.leaveBalances.find(b => b.leaveTypeId === leaveType.id);
          return balance?.allocated || 0;
        })
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // 파일명에 필터 정보 포함
    let fileName = `휴가할당_${selectedYear}`;
    if (searchText || selectedDepartment) {
      fileName += '_필터링됨';
    }
    fileName += '.csv';
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`${exportData.userSummaries.length}명의 데이터가 다운로드되었습니다.`);
  };

  // 엑셀 업로드 처리
  const handleUpload = async (file: File) => {
    // 파일 크기 체크 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      message.error('파일 크기가 10MB를 초과합니다.');
      return false;
    }

    // 파일 확장자 체크
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      message.error('CSV 또는 Excel 파일만 업로드 가능합니다.');
      return false;
    }

    setUploadModalVisible(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          message.error('파일에 데이터가 없습니다.');
          setUploadModalVisible(false);
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // 필수 헤더 검증
        const requiredHeaders = ['사용자ID', '사용자명'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          message.error(`필수 컬럼이 누락되었습니다: ${missingHeaders.join(', ')}`);
          setUploadModalVisible(false);
          return;
        }

        // 휴가 타입 컬럼 찾기
        const leaveTypeHeaders = data?.leaveTypes.filter(lt => headers.includes(lt.name)) || [];
        if (leaveTypeHeaders.length === 0) {
          message.error('휴가 타입 컬럼을 찾을 수 없습니다.');
          setUploadModalVisible(false);
          return;
        }

        // 데이터 파싱
        const uploadData = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length < headers.length) continue;

          const rowData: any = {
            userId: values[headers.indexOf('사용자ID')],
            userName: values[headers.indexOf('사용자명')],
            allocations: {}
          };

          // 각 휴가 타입별 할당량 추출
          leaveTypeHeaders.forEach(leaveType => {
            const value = values[headers.indexOf(leaveType.name)];
            const allocation = parseFloat(value);
            if (!isNaN(allocation) && allocation >= 0) {
              rowData.allocations[leaveType.id] = allocation;
            }
          });

          uploadData.push(rowData);
        }

        if (uploadData.length === 0) {
          message.error('처리할 수 있는 데이터가 없습니다.');
          setUploadModalVisible(false);
          return;
        }

        // 업로드 확인 모달 표시
        Modal.confirm({
          title: '휴가 할당량 일괄 업로드',
          content: (
            <div>
              <p>{uploadData.length}명의 휴가 할당량을 업데이트합니다.</p>
              <p>기존 할당량은 덮어쓰여집니다. 계속하시겠습니까?</p>
            </div>
          ),
          okText: '업로드',
          cancelText: '취소',
          onOk: async () => {
            try {
              setLoading(true);
              
              // 각 사용자별로 API 호출
              for (const userData of uploadData) {
                for (const [leaveTypeId, allocation] of Object.entries(userData.allocations)) {
                  await updateAllocation(
                    userData.userId, 
                    leaveTypeId, 
                    allocation as number,
                    `엑셀 업로드를 통한 ${selectedYear}년 할당량 일괄 업데이트`
                  );
                  // API 호출 간 짧은 대기시간 (서버 부하 방지)
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
              
              message.success(`${uploadData.length}명의 휴가 할당량이 업데이트되었습니다.`);
              await fetchData();
              
            } catch (error) {
              message.error('일괄 업로드 중 오류가 발생했습니다.');
            } finally {
              setLoading(false);
              setUploadModalVisible(false);
            }
          },
          onCancel: () => {
            setUploadModalVisible(false);
          }
        });
        
      } catch (error) {
        console.error('Upload error:', error);
        message.error('파일을 읽는데 실패했습니다.');
        setUploadModalVisible(false);
      }
    };

    // CSV 파일은 텍스트로, Excel 파일은 ArrayBuffer로 읽기
    if (fileExtension === '.csv') {
      reader.readAsText(file, 'UTF-8');
    } else {
      // Excel 파일 처리는 추후 라이브러리 추가 후 구현
      message.info('Excel 파일 지원은 추후 추가됩니다. 현재는 CSV 파일만 지원합니다.');
      setUploadModalVisible(false);
    }
    
    return false; // 자동 업로드 방지
  };

  // 테이블 컬럼 생성
  const createColumns = () => {
    if (!data) return [];

    const baseColumns = [
      {
        title: '사용자',
        key: 'user',
        width: 200,
        fixed: 'left' as const,
        render: (_: any, record: UserSummary) => (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <UserOutlined className="text-blue-600" />
            </div>
            <div>
              <div className="font-medium">{record.user.name}</div>
              <div className="text-sm text-gray-500">{record.user.employee_profile?.department || ''}</div>
              <div className="text-xs text-gray-400">{record.user.employee_profile?.employee_id || record.user.email}</div>
            </div>
          </div>
        ),
      }
    ];

    // 휴가 유형별 컬럼 추가
    const leaveTypeColumns = data.leaveTypes.map((leaveType) => ({
      title: (
        <div className="text-center">
          <Tag color={leaveType.colorHex} className="mb-1">{leaveType.name}</Tag>
          <div className="text-xs text-gray-500">할당/사용/대기/가능</div>
          <div className="text-xs text-orange-500">반차 가능</div>
        </div>
      ),
      key: leaveType.id,
      width: 150,
      align: 'center' as const,
      render: (_: any, record: UserSummary) => {
        const balance = record.leaveBalances.find(b => b.leaveTypeId === leaveType.id);
        if (!balance) {
          return (
            <Button 
              size="small" 
              type="dashed" 
              icon={<PlusOutlined />}
              onClick={() => startEdit(record.user.id, leaveType.id, 0)}
            >
              할당
            </Button>
          );
        }

        const isEditing = editingCell?.userId === record.user.id && editingCell?.leaveTypeId === leaveType.id;
        const isSaving = saving === `${record.user.id}-${leaveType.id}`;

        if (isEditing) {
          return (
            <div className="space-y-2">
              <InputNumber
                size="small"
                value={tempValue}
                onChange={(value) => setTempValue(value || 0)}
                min={0}
                max={999}
                step={0.5}
                precision={1}
                style={{ width: '100%' }}
                autoFocus
              />
              <Space>
                <Button size="small" type="primary" icon={<SaveOutlined />} onClick={saveEdit}>
                  저장
                </Button>
                <Button size="small" icon={<CloseOutlined />} onClick={cancelEdit}>
                  취소
                </Button>
              </Space>
            </div>
          );
        }

        return (
          <div className="text-center">
            <Spin spinning={isSaving}>
              <div 
                className="space-y-1 p-2 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => startEdit(record.user.id, leaveType.id, balance.allocated)}
              >
                <div className="flex justify-center items-center space-x-1">
                  <span className="font-semibold text-blue-600">{balance.allocated}</span>
                  <EditOutlined className="text-xs text-gray-400" />
                </div>
                <div className="text-xs text-gray-600">
                  사용: <span className="text-red-500">{balance.used}</span> | 
                  대기: <span className="text-orange-500">{balance.pending}</span>
                </div>
                <div className="text-sm">
                  가능: <span className="font-medium text-green-600">{balance.available}</span>
                </div>
              </div>
            </Spin>
            <div className="mt-1">
              <Tooltip title="할당 히스토리 보기">
                <Button 
                  size="small" 
                  type="text" 
                  icon={<HistoryOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUser(record.user);
                    setSelectedLeaveType(leaveType);
                    setHistoryModalVisible(true);
                  }}
                />
              </Tooltip>
            </div>
          </div>
        );
      },
    }));

    return [...baseColumns, ...leaveTypeColumns];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={2} className="!mb-1">사용자별 휴가 할당 관리</Title>
            <p className="text-gray-600">직원들의 휴가 할당량을 개별적으로 관리합니다.</p>
          </div>
          <Space>
            <Select 
              value={selectedYear} 
              onChange={setSelectedYear}
              style={{ width: 120 }}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() + i - 2;
                return (
                  <Option key={year} value={year}>{year}년</Option>
                );
              })}
            </Select>
            <Button 
              type="primary" 
              icon={<CalendarOutlined />}
              onClick={() => fetchData()}
            >
              새로고침
            </Button>
          </Space>
        </div>

        {/* 검색 및 필터 영역 */}
        <Card className="mb-4">
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8}>
              <Input
                placeholder="사용자명, 이메일, 사번으로 검색"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={6}>
              <Select
                placeholder="부서 선택"
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                allowClear
                style={{ width: '100%' }}
                suffixIcon={<FilterOutlined />}
              >
                {getDepartments().map(department => (
                  <Option key={department} value={department}>
                    {department}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={10}>
              <Space wrap>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={downloadTemplate}
                  disabled={!data}
                >
                  템플릿 다운로드
                </Button>
                <Upload
                  accept=".csv,.xlsx,.xls"
                  beforeUpload={handleUpload}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />}>
                    엑셀 업로드
                  </Button>
                </Upload>
                {(searchText || selectedDepartment) && (
                  <Button 
                    onClick={() => {
                      setSearchText('');
                      setSelectedDepartment(undefined);
                    }}
                  >
                    필터 초기화
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        <Alert
          message="휴가 할당 관리 안내"
          description={
            <div>
              <p>• 각 셀을 클릭하여 사용자별 휴가 할당량을 직접 수정할 수 있습니다.</p>
              <p>• 반차 가능한 휴가 유형은 0.5일 단위로 설정 가능합니다.</p>
              <p>• 할당량 변경 시 사용 가능 일수는 자동으로 계산됩니다 (할당 - 사용 - 대기).</p>
              <p>• 모든 변경 사항은 히스토리에 기록됩니다.</p>
              <p>• 엑셀 템플릿을 다운로드하여 대량 업로드가 가능합니다.</p>
            </div>
          }
          type="info"
          showIcon
          className="mb-4"
        />
      </div>

      <Card>
        <Table
          columns={createColumns()}
          dataSource={filteredData?.userSummaries || data?.userSummaries || []}
          rowKey={(record) => record.user.id}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range?.[0]}-${range?.[1]} / 총 ${total}명`,
          }}
          locale={{
            emptyText: searchText || selectedDepartment ? '검색 조건에 맞는 직원이 없습니다' : '등록된 직원이 없습니다'
          }}
        />
      </Card>

      {/* 할당 히스토리 모달 */}
      <Modal
        title={`할당 히스토리 - ${selectedUser?.name} (${selectedLeaveType?.name})`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={600}
      >
        <div className="space-y-4">
          <Alert
            message="개발 중"
            description="할당 히스토리 기능은 API 연결 후 구현됩니다."
            type="info"
          />
          
          {/* Mock history data */}
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">초기 할당</div>
                <div className="text-sm text-gray-500">2024-01-01</div>
              </div>
              <div className="text-right">
                <div>0 → 15일</div>
                <div className="text-xs text-gray-500">관리자: {user?.name}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">성과 보상</div>
                <div className="text-sm text-gray-500">2024-06-01</div>
              </div>
              <div className="text-right">
                <div>15 → 18일</div>
                <div className="text-xs text-gray-500">관리자: {user?.name}</div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 업로드 진행 모달 */}
      <Modal
        title="파일 업로드 중"
        open={uploadModalVisible}
        footer={null}
        closable={false}
        width={400}
        centered
      >
        <div className="text-center py-8">
          <Spin size="large" />
          <div className="mt-4">
            <p>파일을 처리하고 있습니다...</p>
            <p className="text-gray-500 text-sm">잠시만 기다려주세요.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};