import { View, type StyleProp, type ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return (
    <View className="rounded-2xl border border-[#2D2D2D] bg-[#1A1A1A] p-5" style={style}>
      {children}
    </View>
  );
}
