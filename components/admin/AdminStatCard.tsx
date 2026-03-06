import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

interface AdminStatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: 'orange' | 'blue' | 'green' | 'red' | 'gray';
  subtitle?: string;
}

const toneStyles: Record<NonNullable<AdminStatCardProps['tone']>, { icon: string; bg: string }> = {
  orange: { icon: '#FF6B35', bg: '#3B1D12' },
  blue: { icon: '#60A5FA', bg: '#10243D' },
  green: { icon: '#34D399', bg: '#112D25' },
  red: { icon: '#F87171', bg: '#3D1616' },
  gray: { icon: '#9CA3AF', bg: '#1F2937' },
};

export function AdminStatCard({ title, value, icon: Icon, tone = 'orange', subtitle }: AdminStatCardProps) {
  const palette = toneStyles[tone];

  return (
    <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-sm text-[#9CA3AF]">{title}</Text>
        <View className="rounded-lg p-2" style={{ backgroundColor: palette.bg }}>
          <Icon size={16} color={palette.icon} />
        </View>
      </View>
      <Text className="text-2xl font-bold text-white">{value}</Text>
      {subtitle ? <Text className="mt-1 text-xs text-[#6B7280]">{subtitle}</Text> : null}
    </View>
  );
}
