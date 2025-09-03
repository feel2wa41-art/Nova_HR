import React, { useState } from 'react';
import { Dropdown, Button, Space, App } from 'antd';
import { GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { updateLanguageFromAPI } from '../../i18n/i18n';
import { getLanguageOptions, LanguageCode } from '../../constants/languages';

const languages = getLanguageOptions();

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);
  const { message } = App.useApp();

  const updateLanguageMutation = useMutation({
    mutationFn: async (language: string) => {
      const response = await apiClient.put('/users/me/language', { language });
      return response.data;
    },
    onSuccess: (data, language) => {
      updateLanguageFromAPI(language as LanguageCode);
      setCurrentLang(language);
      message.success(t('messages.languageChanged'));
    },
    onError: () => {
      message.error('Failed to update language setting');
    }
  });

  const handleLanguageChange = (language: string) => {
    if (language !== currentLang) {
      // 즉시 언어 변경 적용
      i18n.changeLanguage(language);
      localStorage.setItem('language', language);
      localStorage.setItem('i18nextLng', language);
      setCurrentLang(language);
      
      // API 호출은 백그라운드에서 처리
      updateLanguageMutation.mutate(language);
    }
  };

  const items: MenuProps['items'] = languages.map(lang => ({
    key: lang.value,
    label: (
      <Space>
        <span>{lang.flag}</span>
        <span>{lang.label}</span>
        {currentLang === lang.value && <CheckOutlined style={{ color: '#1890ff' }} />}
      </Space>
    ),
    onClick: () => handleLanguageChange(lang.value)
  }));

  const currentLanguage = languages.find(lang => lang.value === currentLang);

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Button 
        type="text" 
        icon={<GlobalOutlined />}
        loading={updateLanguageMutation.isPending}
      >
        <Space>
          <span>{currentLanguage?.flag}</span>
          <span className="hidden sm:inline">{currentLanguage?.label}</span>
        </Space>
      </Button>
    </Dropdown>
  );
};