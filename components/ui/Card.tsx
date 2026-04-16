import { View, type StyleProp, type ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return (
    <View className="rounded-2xl border border-border bg-card p-5" style={style}>
      {children}
    </View>
  );
}
