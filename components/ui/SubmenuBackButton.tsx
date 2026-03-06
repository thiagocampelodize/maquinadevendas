import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

export function SubmenuBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="self-start">
      <View className="flex-row items-center gap-2 rounded-full border border-[#2D2D2D] bg-[#1A1A1A] px-3 py-2">
        <ChevronLeft size={16} color="#FFFFFF" />
        <Text className="text-sm font-semibold text-white">Voltar</Text>
      </View>
    </Pressable>
  );
}
