import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { MODAL_ANIMATION_PRESETS } from '@/constants/animationTokens';

export interface UseModalAnimationOptions {
  durationIn?: number;
  durationOut?: number;
  translateFrom?: number;
  scaleFrom?: number;
}

export { MODAL_ANIMATION_PRESETS };

export function useModalAnimation(visible: boolean, options?: UseModalAnimationOptions) {
  const durationIn = options?.durationIn ?? 180;
  const durationOut = options?.durationOut ?? 140;
  const translateFrom = options?.translateFrom ?? 8;
  const scaleFrom = options?.scaleFrom ?? 0.98;
  const [shouldRender, setShouldRender] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useLayoutEffect(() => {
    if (visible) {
      setShouldRender(true);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, {
        toValue: 1,
        duration: durationIn,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: durationOut,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShouldRender(false);
    });
  }, [durationIn, durationOut, progress, visible]);

  const animatedContentStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [translateFrom, 0],
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
    [progress, scaleFrom, translateFrom]
  );

  const animatedBackdropStyle = useMemo(
    () => ({
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    }),
    [progress]
  );

  return { shouldRender, animatedContentStyle, animatedBackdropStyle };
}
