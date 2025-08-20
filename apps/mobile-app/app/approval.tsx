import { View } from 'react-native';
import { Text } from 'react-native-paper';

export default function ApprovalScreen() {
  return (
    <View className='flex-1 justify-center items-center p-4'>
      <Text variant='headlineMedium'>전자결재</Text>
      <Text variant='bodyLarge' className='mt-2 text-center'>
        전자결재 화면 개발 예정
      </Text>
    </View>
  );
}