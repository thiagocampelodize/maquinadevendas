import { Text, View } from 'react-native';

interface HomeHeaderProps {
  statusTitle: string;
  statusSubtitle: string;
  statusColor: string;
}

export function HomeHeader({ statusTitle, statusSubtitle, statusColor }: HomeHeaderProps) {
  return (
    <View className={`rounded-xl p-5 shadow-sm ${statusColor}`}>
      <Text className="text-lg font-semibold leading-tight text-white">{statusTitle}</Text>
      <Text className="mt-1 text-sm leading-relaxed text-white/90">{statusSubtitle}</Text>
    </View>
  );
}
