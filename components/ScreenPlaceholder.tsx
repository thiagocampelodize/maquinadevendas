import { SafeAreaView, Text, View } from 'react-native';

interface ScreenPlaceholderProps {
  title: string;
}

export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-2xl font-semibold text-white">{title}</Text>
        <Text className="mt-3 text-center text-sm text-[#9CA3AF]">
          Tela base criada. Implementacao fiel sera ligada aos componentes web correspondentes.
        </Text>
      </View>
    </SafeAreaView>
  );
}
