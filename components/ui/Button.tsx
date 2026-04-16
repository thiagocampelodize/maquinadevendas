import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { PRESS_ANIMATION_TOKENS } from '@/constants/animationTokens';

type Variant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  textClassName?: string;
  textStyle?: StyleProp<TextStyle>;
}

const sizeClasses: Record<Size, string> = {
  default: 'h-12 px-4',
  sm: 'h-10 px-3',
  lg: 'h-14 px-6',
  icon: 'h-12 w-12',
};

const variantClasses: Record<Variant, string> = {
  default: 'bg-[#FF6B35] border border-[#FF6B35]',
  destructive: 'bg-[#DC2626] border border-[#DC2626]',
  outline: 'bg-transparent border border-border',
  ghost: 'bg-transparent border border-transparent',
  link: 'bg-transparent border border-transparent',
};

const textVariantClasses: Record<Variant, string> = {
  default: 'text-white',
  destructive: 'text-white',
  outline: 'text-text-primary',
  ghost: 'text-text-primary',
  link: 'text-[#FF6B35] underline',
};

export function Button({
  variant = 'default',
  size = 'default',
  disabled,
  loading,
  onPress,
  children,
  style,
  className,
  textClassName,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressPreset = size === 'sm' || size === 'icon'
    ? PRESS_ANIMATION_TOKENS.buttonCompact
    : PRESS_ANIMATION_TOKENS.button;

  const animateTo = (toValue: number, duration: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: pressScale }] }, style]}>
      <Pressable
        className={`items-center justify-center rounded-xl ${sizeClasses[size]} ${variantClasses[variant]} ${isDisabled ? 'opacity-50' : 'opacity-100'} ${className || ''}`}
        android_ripple={{ color: '#ffffff22' }}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => {
          if (isDisabled) return;
          animateTo(pressPreset.pressedScale, pressPreset.inDuration);
        }}
        onPressOut={() => {
          if (isDisabled) return;
          animateTo(1, pressPreset.outDuration);
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            className={`text-base font-semibold ${textVariantClasses[variant]} ${textClassName || ''}`}
            style={textStyle}
          >
            {children}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
