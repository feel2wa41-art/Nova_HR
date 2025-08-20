import { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  InputNumber,
  message,
  Tag,
  Typography,
  Tooltip,
  AutoComplete,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EnvironmentOutlined,
  AimOutlined,
  RadiusSettingOutlined,
  SearchOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
// import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
// import { LatLng } from 'leaflet';
// import 'leaflet/dist/leaflet.css';

const { Text } = Typography;

interface CompanyLocation {
  id: string;
  name: string;
  code?: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
}

interface SearchResult {
  value: string;
  label: string;
  latitude: number;
  longitude: number;
}

// Leaflet icon fix - 임시 비활성화
// import L from 'leaflet';

// Fix for default markers
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
// });

const mockLocations: CompanyLocation[] = [
  {
    id: '1',
    name: 'Jakarta Head Office',
    code: 'JKT-HQ',
    address: 'Gandaria City, Jl. Sultan Iskandar Muda, Gandaria, Kebayoran Lama, South Jakarta City, Jakarta 12240',
    latitude: -6.2441,
    longitude: 106.7833,
    radius: 200,
    status: 'ACTIVE',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Bandung Branch',
    code: 'BDG-01',
    address: 'Jl. Asia Afrika No. 8, Bandung, Jawa Barat 40111',
    latitude: -6.9175,
    longitude: 107.6191,
    radius: 150,
    status: 'ACTIVE',
    isDefault: false,
  },
];

interface LocationFormData {
  name: string;
  code?: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
}

// 지오코딩 서비스 개선 - 인도네시아 주소 지원
const geocodeAddress = async (address: string): Promise<SearchResult[]> => {
  try {
    console.log('Searching for address:', address);
    
    // 인도네시아 주소를 위한 개선된 Nominatim 검색
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=id&limit=10&addressdetails=1&bounded=0`;
    
    console.log('Search URL:', searchUrl);
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    console.log('Search results:', data);
    
    if (!data || data.length === 0) {
      // 전 세계 검색으로 폴백
      console.log('No results with country filter, trying global search...');
      const globalUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=10&addressdetails=1`;
      const globalResponse = await fetch(globalUrl);
      const globalData = await globalResponse.json();
      
      console.log('Global search results:', globalData);
      
      return globalData.map((item: any) => ({
        value: item.display_name,
        label: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));
    }
    
    return data.map((item: any) => ({
      value: item.display_name,
      label: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
};

// 역지오코딩 서비스
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name || `${lat}, ${lng}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return `${lat}, ${lng}`;
  }
};

// 지도에서 클릭한 위치를 처리하는 컴포넌트 - 임시 비활성화
// const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
//   useMapEvents({
//     click: async (e) => {
//       const { lat, lng } = e.latlng;
//       onLocationSelect(lat, lng);
//     },
//   });
//   return null;
// };

export const CompanyLocationSettings = () => {
  const [locations, setLocations] = useState<CompanyLocation[]>(mockLocations);
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2088, 106.8456]); // Jakarta
  const [mapZoom, setMapZoom] = useState(10);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();
  const [form] = Form.useForm<LocationFormData>();

  const handleEdit = (location: CompanyLocation) => {
    setSelectedLocation(location);
    form.setFieldsValue(location);
    setMapCenter([location.latitude, location.longitude]);
    setMarkerPosition([location.latitude, location.longitude]);
    setMapZoom(15);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedLocation(null);
    form.resetFields();
    form.setFieldsValue({
      radius: 200,
      status: 'ACTIVE',
      isDefault: false,
    });
    setMapCenter([-6.2088, 106.8456]);
    setMarkerPosition(null);
    setMapZoom(10);
    setIsModalOpen(true);
  };

  // 주소 검색 핸들러
  const handleAddressSearch = async (value: string) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await geocodeAddress(value);
        setSearchResults(results);
      } catch (error) {
        message.error('주소 검색에 실패했습니다');
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  // 검색 결과 선택 핸들러
  const handleSearchSelect = async (value: string, option: SearchResult) => {
    form.setFieldsValue({
      address: option.label,
      latitude: option.latitude,
      longitude: option.longitude,
    });
    
    setMapCenter([option.latitude, option.longitude]);
    setMarkerPosition([option.latitude, option.longitude]);
    setMapZoom(15);
    message.success('위치가 지도에 표시되었습니다');
  };

  // 지도에서 위치 선택 핸들러
  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    form.setFieldsValue({
      latitude: lat,
      longitude: lng,
    });

    // 역지오코딩으로 주소 가져오기
    try {
      const address = await reverseGeocode(lat, lng);
      form.setFieldsValue({ address });
    } catch (error) {
      console.error('Failed to get address:', error);
    }
    
    message.success('지도에서 위치가 선택되었습니다');
  };

  const handleDelete = (location: CompanyLocation) => {
    if (location.isDefault) {
      message.warning('기본 위치는 삭제할 수 없습니다');
      return;
    }

    Modal.confirm({
      title: '위치 삭제',
      content: `${location.name} 위치를 삭제하시겠습니까?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        setIsLoading(true);
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setLocations(prev => prev.filter(l => l.id !== location.id));
          message.success('위치가 삭제되었습니다');
        } catch (error) {
          message.error('위치 삭제에 실패했습니다');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setFieldsValue({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          message.success('현재 위치가 설정되었습니다');
        },
        (error) => {
          message.error('위치 정보를 가져올 수 없습니다');
        }
      );
    } else {
      message.error('브라우저에서 위치 정보를 지원하지 않습니다');
    }
  };

  const handleSubmit = async (values: LocationFormData) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (selectedLocation) {
        // Update existing location
        setLocations(prev => prev.map(loc => 
          loc.id === selectedLocation.id ? { ...loc, ...values } : loc
        ));
        message.success('위치 정보가 업데이트되었습니다');
      } else {
        // Add new location
        const newLocation: CompanyLocation = {
          id: Date.now().toString(),
          ...values,
        };
        setLocations(prev => [...prev, newLocation]);
        message.success('새 위치가 추가되었습니다');
      }
      
      setIsModalOpen(false);
      setSelectedLocation(null);
      form.resetFields();
    } catch (error) {
      message.error('위치 정보 저장에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnsType<CompanyLocation> = [
    {
      title: '위치명',
      key: 'location',
      render: (_, record) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            {record.name}
            {record.isDefault && <Tag color="blue">기본</Tag>}
          </div>
          {record.code && (
            <div className="text-gray-500 text-sm">{record.code}</div>
          )}
        </div>
      ),
    },
    {
      title: '주소',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: '좌표',
      key: 'coordinates',
      render: (_, record) => (
        <div className="text-sm">
          <div>위도: {record.latitude.toFixed(6)}</div>
          <div>경도: {record.longitude.toFixed(6)}</div>
        </div>
      ),
    },
    {
      title: '허용 반경',
      key: 'radius',
      render: (_, record) => (
        <span className="text-blue-600 font-medium">{record.radius}m</span>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="수정">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {!record.isDefault && (
            <Tooltip title="삭제">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Text strong className="text-lg">회사 위치 관리</Text>
          <div className="text-gray-500 text-sm mt-1">
            직원들이 출석 체크를 할 수 있는 회사 위치를 관리하세요
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          위치 추가
        </Button>
      </div>

      <Card className="bg-blue-50">
        <div className="flex items-start gap-3">
          <EnvironmentOutlined className="text-blue-600 mt-1" />
          <div>
            <Text strong className="text-blue-800">위치 기반 출석 체크</Text>
            <div className="text-blue-700 text-sm mt-1">
              직원들은 등록된 회사 위치의 허용 반경 내에서만 출석 체크를 할 수 있습니다.
              GPS 좌표와 허용 반경을 정확히 설정해주세요.
            </div>
          </div>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={locations}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
        }}
      />

      {/* Location Form Modal */}
      <Modal
        title={selectedLocation ? '위치 수정' : '새 위치 추가'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedLocation(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="위치명"
            name="name"
            rules={[
              { required: true, message: '위치명을 입력해주세요' },
            ]}
          >
            <Input size="large" placeholder="예: Jakarta Office" />
          </Form.Item>

          <Form.Item
            label="위치 코드 (선택사항)"
            name="code"
          >
            <Input size="large" placeholder="예: JKT-HQ" />
          </Form.Item>

          <Form.Item
            label="주소 검색"
            name="address"
            rules={[
              { required: true, message: '주소를 입력해주세요' },
            ]}
          >
            <AutoComplete
              size="large"
              placeholder="주소를 검색하세요 (예: 강남역, 서울시 강남구)"
              options={searchResults.map(result => ({
                value: result.value,
                label: result.label,
                ...result
              }))}
              onSearch={handleAddressSearch}
              onSelect={handleSearchSelect}
              notFoundContent={searchLoading ? <Spin size="small" /> : '검색 결과가 없습니다'}
            >
              <Input
                prefix={<SearchOutlined className="text-gray-400" />}
                suffix={searchLoading ? <Spin size="small" /> : null}
              />
            </AutoComplete>
          </Form.Item>

          {/* 지도 컴포넌트 - 임시 비활성화 */}
          <Form.Item label="위치 미리보기">
            <div className="border rounded-lg p-4 bg-gray-50" style={{ height: '200px' }}>
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <EnvironmentOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                  <div>주소 검색 후 지도가 표시됩니다</div>
                  {markerPosition && (
                    <div className="mt-2 text-sm">
                      <div>위도: {markerPosition[0].toFixed(6)}</div>
                      <div>경도: {markerPosition[1].toFixed(6)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              💡 주소 검색으로 위치를 선택하세요
            </div>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="위도 (Latitude)"
              name="latitude"
              rules={[
                { required: true, message: '위도를 입력해주세요' },
                { type: 'number', min: -90, max: 90, message: '올바른 위도 값을 입력하세요' },
              ]}
            >
              <InputNumber
                size="large"
                style={{ width: '100%' }}
                precision={6}
                placeholder="-6.194400"
              />
            </Form.Item>

            <Form.Item
              label="경도 (Longitude)"
              name="longitude"
              rules={[
                { required: true, message: '경도를 입력해주세요' },
                { type: 'number', min: -180, max: 180, message: '올바른 경도 값을 입력하세요' },
              ]}
            >
              <InputNumber
                size="large"
                style={{ width: '100%' }}
                precision={6}
                placeholder="106.822900"
              />
            </Form.Item>
          </div>

          <div className="flex justify-end mb-4">
            <Button
              type="dashed"
              icon={<AimOutlined />}
              onClick={handleGetCurrentLocation}
            >
              현재 위치 가져오기
            </Button>
          </div>

          <Form.Item
            label="허용 반경 (미터)"
            name="radius"
            rules={[
              { required: true, message: '허용 반경을 입력해주세요' },
              { type: 'number', min: 50, max: 1000, message: '50m ~ 1000m 사이의 값을 입력하세요' },
            ]}
          >
            <InputNumber
              size="large"
              style={{ width: '100%' }}
              min={50}
              max={1000}
              addonAfter="미터"
              placeholder="200"
            />
          </Form.Item>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <RadiusSettingOutlined className="text-orange-500" />
              <Text strong>허용 반경 가이드</Text>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• 50-100m: 소규모 사무실</div>
              <div>• 100-200m: 일반 사무 건물</div>
              <div>• 200-500m: 대형 빌딩 또는 캠퍼스</div>
              <div>• 500m+: 넓은 산업단지</div>
            </div>
          </div>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button 
                size="large" 
                onClick={() => setIsModalOpen(false)}
              >
                취소
              </Button>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={isLoading}
              >
                {selectedLocation ? '수정' : '추가'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};