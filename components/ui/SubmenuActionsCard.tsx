import { View } from 'react-native';

export function SubmenuActionsCard({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl border border-border bg-surface p-4">{children}</View>;
}
