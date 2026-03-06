export interface MotionPreset {
  durationIn: number;
  durationOut: number;
  translateFrom: number;
  scaleFrom: number;
}

export interface EntranceMotionPreset {
  duration: number;
  distance: number;
  scaleFrom: number;
  baseDelay: number;
  stepDelay: number;
}

export interface PressMotionPreset {
  inDuration: number;
  outDuration: number;
  pressedScale: number;
}

export const ANIMATION_TOKENS = {
  fastDialog: {
    durationIn: 180,
    durationOut: 140,
    translateFrom: 10,
    scaleFrom: 0.96,
  },
  defaultSheet: {
    durationIn: 220,
    durationOut: 170,
    translateFrom: 16,
    scaleFrom: 1,
  },
  dropdown: {
    durationIn: 180,
    durationOut: 140,
    translateFrom: -6,
    scaleFrom: 0.98,
  },
} satisfies Record<string, MotionPreset>;

export const MODAL_ANIMATION_PRESETS = {
  dialog: ANIMATION_TOKENS.fastDialog,
  sheet: ANIMATION_TOKENS.defaultSheet,
  dropdown: ANIMATION_TOKENS.dropdown,
} as const;

export const ENTRANCE_ANIMATION_TOKENS = {
  section: {
    duration: 260,
    distance: 12,
    scaleFrom: 0.995,
    baseDelay: 0,
    stepDelay: 70,
  },
  dashboard: {
    duration: 300,
    distance: 14,
    scaleFrom: 0.995,
    baseDelay: 0,
    stepDelay: 90,
  },
  sales: {
    duration: 240,
    distance: 12,
    scaleFrom: 0.996,
    baseDelay: 0,
    stepDelay: 65,
  },
  routine: {
    duration: 220,
    distance: 10,
    scaleFrom: 0.997,
    baseDelay: 0,
    stepDelay: 55,
  },
} satisfies Record<string, EntranceMotionPreset>;

export const PRESS_ANIMATION_TOKENS = {
  button: {
    inDuration: 90,
    outDuration: 130,
    pressedScale: 0.98,
  },
  buttonCompact: {
    inDuration: 80,
    outDuration: 120,
    pressedScale: 0.985,
  },
} satisfies Record<string, PressMotionPreset>;
