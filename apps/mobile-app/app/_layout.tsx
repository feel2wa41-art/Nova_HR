import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});

const theme = {
  colors: {
    primary: '#0ea5e9',
    primaryContainer: '#bae6fd',
    secondary: '#64748b',
    secondaryContainer: '#f1f5f9',
    surface: '#ffffff',
    surfaceVariant: '#f8fafc',
    background: '#ffffff',
    error: '#ef4444',
    errorContainer: '#fecaca',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#0c4a6e',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#1e293b',
    onSurface: '#1e293b',
    onSurfaceVariant: '#64748b',
    onError: '#ffffff',
    onErrorContainer: '#7f1d1d',
    onBackground: '#1e293b',
    outline: '#cbd5e1',
    outlineVariant: '#e2e8f0',
    inverseSurface: '#334155',
    inverseOnSurface: '#f8fafc',
    inversePrimary: '#7dd3fc',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#0ea5e9',
  },
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#ffffff',
            },
            headerTintColor: '#1e293b',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Nova HR' }} />
          <Stack.Screen name="attendance" options={{ title: '출퇴근' }} />
          <Stack.Screen name="leave" options={{ title: '휴가' }} />
          <Stack.Screen name="approval" options={{ title: '전자결재' }} />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}