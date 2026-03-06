import { Text, View } from 'react-native';

import { SubmenuBackButton } from '@/components/ui/SubmenuBackButton';

interface SubmenuHeaderCardProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export function SubmenuHeaderCard({ title, subtitle, onBack, right }: SubmenuHeaderCardProps) {
  return (
    <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <SubmenuBackButton onPress={onBack} />
        {right ? <View>{right}</View> : null}
      </View>
      <Text className="text-xl font-semibold text-white">{title}</Text>
      {subtitle ? <Text className="mt-1 text-sm text-[#9CA3AF]">{subtitle}</Text> : null}
    </View>
  );
}
