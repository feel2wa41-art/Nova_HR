import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';
import { updateLanguageFromUser } from '../i18n/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await authService.getStoredToken();
      
      if (token) {
        // Load user data and update language preference
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          await updateLanguageFromUser(user);
        }
        
        // User is logged in, redirect to attendance
        router.replace('/attendance');
      } else {
        // User is not logged in, redirect to login
        router.replace('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // On error, go to login
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Nova HR 시작 중...</Text>
      </View>
    );
  }

  return null; // This component will redirect, so nothing to render
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
  },
});