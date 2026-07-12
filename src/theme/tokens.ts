/**
 * Design tokens — transcribed from docs/design/design-tokens.json
 * (频率 · 暖沙静谧 v0.1.0). Do not edit values here without updating the JSON.
 */

export const lightColors = {
  bg: '#F5F1E8',
  surface: '#FBF8F1',
  textPrimary: '#2A2622',
  textSecondary: '#8A8378',
  textInverse: '#F5F1E8',
  accent: '#C97B5A',
  accentSoft: '#EDD9C8',
  presence: '#6E8B96',
  presenceSoft: '#D8E3E6',
  success: '#7C9473',
  danger: '#B5493A',
  hairline: 'rgba(42,38,34,0.08)',
};

export type ThemeColors = typeof lightColors;

// Dark set from colorDark; keys missing there (presenceSoft/success/danger/
// textInverse) are derived to keep contrast on the deep-plum background.
export const darkColors: ThemeColors = {
  bg: '#1F1B2E',
  surface: '#2A2440',
  textPrimary: '#F5F1E8',
  textSecondary: 'rgba(245,241,232,0.55)',
  textInverse: '#2A2622',
  accent: '#D9916D',
  accentSoft: 'rgba(201,123,90,0.22)',
  presence: '#86A5AF',
  presenceSoft: 'rgba(134,165,175,0.22)',
  success: '#7C9473',
  danger: '#C96A5C',
  hairline: 'rgba(245,241,232,0.12)',
};

export const fontFamily = {
  /** Serif for headings — Noto Serif SC covers both Chinese and Latin. */
  serif: 'NotoSerifSC_500Medium',
  serifLatin: 'Fraunces_500Medium',
  serifLatinSemiBold: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

export const type = {
  display: { size: 40, lineHeight: 44, weight: '500', font: 'serif' },
  title: { size: 28, lineHeight: 36, weight: '500', font: 'serif' },
  heading: { size: 20, lineHeight: 28, weight: '600', font: 'sans' },
  body: { size: 17, lineHeight: 28, weight: '400', font: 'sans' },
  caption: { size: 14, lineHeight: 20, weight: '400', font: 'sans' },
} as const;

export const spacing = [4, 8, 12, 16, 24, 32, 48, 64, 96] as const;

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 } as const;

/** RN-compatible shadows converted from the CSS box-shadows. */
export const shadow = {
  // css: 0 8px 24px rgba(42,38,34,0.08)
  soft: {
    shadowColor: '#2A2622',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  // css: 0 12px 40px rgba(42,38,34,0.07)
  card: {
    shadowColor: '#2A2622',
    shadowOpacity: 0.07,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  // css: 0 10px 24px rgba(201,123,90,0.35)
  accentGlow: {
    shadowColor: '#C97B5A',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

/** Component-level tokens（design-tokens.json `component`，对应设计稿 27/28）。 */
export const component = {
  /** 长按消息浮出的操作胶囊（28a/28d）。 */
  messageActionPopover: {
    surface: '#FBF8F1',
    surfaceDark: '#342C4E',
    radius: 18,
    itemRadius: 12,
    enterMs: 240,
  },
  /** 「已复制」提示（28b/28e）：浅色模式深底浅字，深色模式反转。 */
  toast: {
    bg: '#2A2622',
    bgDark: '#F5F1E8',
    text: '#F5F1E8',
    textDark: '#1F1B2E',
    radius: 999,
    durationMs: 1500,
  },
  /** 历史记录左滑删除（27a/27b）。 */
  swipeDelete: {
    revealBg: '#EAD9CC',
    revealBgDark: '#3A2C33',
    confirmLabel: '放下',
    cancelLabel: '留着',
    collapseMs: 300,
  },
} as const;

export const motion = {
  /** 无弹跳曲线；步骤切换用淡入+8px位移 */
  easing: 'ease-in-out',
  durationMs: { base: 300, slow: 600 },
  breatheCycleMs: 5000,
} as const;
