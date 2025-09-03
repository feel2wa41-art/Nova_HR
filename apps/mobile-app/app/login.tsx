import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { 
  Text, 
  Card, 
  TextInput, 
  Button, 
  ActivityIndicator,
  Divider 
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { authService, AuthResponse } from '../services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('employee@nova-hr.com');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      
      const response: AuthResponse = await authService.login({
        email: email.trim(),
        password: password
      });

      Alert.alert(
        '로그인 성공',
        `안녕하세요, ${response.user.name}님!`,
        [
          {
            text: '확인',
            onPress: () => {
              // Navigate to main app
              router.replace('/attendance');
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Login failed:', error);
      
      let message = '로그인 중 오류가 발생했습니다.';
      
      if (error.response?.status === 401) {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message?.includes('Network')) {
        message = '네트워크 연결을 확인해주세요.';
      }
      
      Alert.alert('로그인 실패', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('admin123');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Logo/Header */}
          <Card style={styles.headerCard}>
            <Card.Content>
              <Text variant="headlineLarge" style={styles.centerText}>
                Nova HR
              </Text>
              <Text variant="bodyLarge" style={[styles.centerText, styles.subtitle]}>
                모바일 출퇴근 시스템
              </Text>
            </Card.Content>
          </Card>

          {/* Login Form */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                로그인
              </Text>
              
              <TextInput
                label="이메일"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={isLoading}
                style={styles.input}
              />
              
              <TextInput
                label="비밀번호"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? "eye-off" : "eye"} 
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                disabled={isLoading}
                style={styles.input}
              />
              
              <Button
                mode="contained"
                onPress={handleLogin}
                disabled={isLoading}
                style={styles.loginButton}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  '로그인'
                )}
              </Button>
            </Card.Content>
          </Card>

          {/* Demo Accounts */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                테스트 계정
              </Text>
              
              <Button
                mode="outlined"
                onPress={() => handleDemoLogin('admin@nova-hr.com')}
                disabled={isLoading}
                style={styles.demoButton}
              >
                관리자 계정
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => handleDemoLogin('hr@nova-hr.com')}
                disabled={isLoading}
                style={styles.demoButton}
              >
                HR 매니저 계정
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => handleDemoLogin('employee@nova-hr.com')}
                disabled={isLoading}
                style={styles.demoButton}
              >
                직원 계정
              </Button>
            </Card.Content>
          </Card>

          {/* API Status */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={[styles.centerText, styles.grayText]}>
                API 서버: localhost:3005/api/v1
              </Text>
              <Text variant="bodySmall" style={[styles.centerText, styles.grayText]}>
                개발 모드 - 실제 GPS 기능 포함
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 50,
  },
  headerCard: {
    marginBottom: 24,
    backgroundColor: '#3b82f6',
  },
  card: {
    marginBottom: 16,
  },
  centerText: {
    textAlign: 'center',
    color: 'white',
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.9,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  loginButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  demoButton: {
    marginBottom: 8,
  },
  grayText: {
    color: '#6b7280',
  },
});