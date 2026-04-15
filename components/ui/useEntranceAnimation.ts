import { useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

import { ENTRANCE_ANIMATION_TOKENS } from '@/constants/animationTokens';

interface UseEntranceAnimationOptions {
  index?: number;
  duration?: number;
  distance?: number;
  scaleFrom?: number;
  baseDelay?: number;
  stepDelay?: number;
  disabled?: boolean;
}

export function useEntranceAnimation(options?: UseEntranceAnimationOptions) {
  const index = options?.index ?? 0;
  const duration = options?.duration ?? ENTRANCE_ANIMATION_TOKENS.section.duration;
  const distance = options?.distance ?? ENTRANCE_ANIMATION_TOKENS.section.distance;
  const scaleFrom = options?.scaleFrom ?? ENTRANCE_ANIMATION_TOKENS.section.scaleFrom;
  const baseDelay = options?.baseDelay ?? ENTRANCE_ANIMATION_TOKENS.section.baseDelay;
  const stepDelay = options?.stepDelay ?? ENTRANCE_ANIMATION_TOKENS.section.stepDelay;
  const disabled = options?.disabled ?? false;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (disabled) {
      progress.stopAnimation();
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: baseDelay + stepDelay * index,
      useNativeDriver: true,
    }).start();
  }, [baseDelay, disabled, duration, index, progress, stepDelay]);

  return useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [scaleFrom, 1],
          }),
        },
      ],
    }),
    [distance, progress, scaleFrom]
  );
}
