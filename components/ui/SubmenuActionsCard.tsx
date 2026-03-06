import { View } from 'react-native';

export function SubmenuActionsCard({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl border border-[#2D2D2D] bg-[#111111] p-4">{children}</View>;
}
