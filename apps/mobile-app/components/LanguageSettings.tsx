import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { List, RadioButton, Text, Divider, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n/i18n';
import { authService } from '../services/auth';

export const LanguageSettings = () => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (language: 'ko' | 'en') => {
    if (language === currentLanguage) return;

    setLoading(true);
    try {
      // Update language in backend
      const token = await authService.getStoredToken();
      if (token) {
        await authService.updateLanguageSetting(language);
      }
      
      // Update local language
      await changeLanguage(language);
      setCurrentLanguage(language);
      
      Alert.alert(
        t('common.success'),
        t('settings.languageChanged'),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      Alert.alert(
        t('common.error'),
        'Failed to update language setting',
        [{ text: t('common.ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <List.Section>
        <List.Subheader>{t('settings.changeLanguage')}</List.Subheader>
        <RadioButton.Group 
          onValueChange={(value) => handleLanguageChange(value as 'ko' | 'en')} 
          value={currentLanguage}
        >
          <List.Item
            title={t('settings.korean')}
            description="한국어"
            left={() => <Text style={styles.flag}>🇰🇷</Text>}
            right={() => <RadioButton value="ko" />}
            onPress={() => handleLanguageChange('ko')}
          />
          <Divider />
          <List.Item
            title={t('settings.english')}
            description="English"
            left={() => <Text style={styles.flag}>🇺🇸</Text>}
            right={() => <RadioButton value="en" />}
            onPress={() => handleLanguageChange('en')}
          />
        </RadioButton.Group>
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  flag: {
    fontSize: 24,
    marginHorizontal: 16,
  },
});