import React, { useState, useEffect } from 'react';
import { Tabs, Card, Typography } from 'antd';
import { CameraOutlined, EyeOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import ScreenshotGallery from './ScreenshotGallery';
import RealScreenshotGallery from './RealScreenshotGallery';

const { Title } = Typography;
const { TabPane } = Tabs;

const ScreenshotManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // URL에 따라 기본 탭 설정
  const getInitialTab = () => {
    if (location.pathname.includes('real-screenshots')) {
      return 'real';
    }
    return 'gallery';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // URL 변경 시 탭 업데이트
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // URL도 함께 업데이트
    if (key === 'real') {
      navigate('/admin/real-screenshots');
    } else {
      navigate('/admin/screenshots');
    }
  };

  const items = [
    {
      key: 'real',
      label: (
        <span>
          <EyeOutlined />
          실제 스크린샷
        </span>
      ),
      children: <RealScreenshotGallery />
    },
    {
      key: 'gallery',
      label: (
        <span>
          <CameraOutlined />
          스크린샷 갤러리
        </span>
      ),
      children: <ScreenshotGallery />
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <CameraOutlined /> 스크린샷 관리
        </Title>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={items}
          size="large"
          tabBarStyle={{ marginBottom: '24px' }}
        />
      </Card>
    </div>
  );
};

export default ScreenshotManagement;