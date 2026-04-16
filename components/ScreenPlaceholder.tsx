import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenPlaceholderProps {
  title: string;
}

export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" style={{ backgroundColor: '#0A0A0A' }}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-2xl font-semibold text-white">{title}</Text>
        <Text className="mt-3 text-center text-sm text-text-muted">
          Tela base criada. Implementacao fiel sera ligada aos componentes web correspondentes.
        </Text>
      </View>
    </SafeAreaView>
  );
}
