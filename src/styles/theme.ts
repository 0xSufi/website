import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineSemanticTokens,
  defineTokens,
} from "@chakra-ui/react";

const colors = defineTokens.colors({
  brand: {
    50: { value: "#e8fff4" },
    100: { value: "#c6ffdf" },
    200: { value: "#95ffc4" },
    300: { value: "#5fffa6" },
    400: { value: "#32f488" },
    500: { value: "#1bd96f" },
    600: { value: "#12b75b" },
    700: { value: "#0d9146" },
    800: { value: "#0a6b34" },
    900: { value: "#054423" },
  },
  neutral: {
    50: { value: "#f7f7f8" },
    100: { value: "#e1e2e5" },
    200: { value: "#c9cbd0" },
    300: { value: "#a5a8b0" },
    400: { value: "#7f838c" },
    500: { value: "#5b5f69" },
    600: { value: "#3d4048" },
    700: { value: "#2a2d34" },
    800: { value: "#1b1d23" },
    900: { value: "#0e0f14" },
    950: { value: "#050608" },
  },
  accent: {
    500: { value: "#4ade80" },
    600: { value: "#38c76a" },
    700: { value: "#27ac57" },
  },
  error: {
    500: { value: "#f87171" },
    600: { value: "#ef4444" },
  },
  success: {
    500: { value: "#34d399" },
    600: { value: "#10b981" },
  },
  warning: {
    500: { value: "#fbbf24" },
    600: { value: "#f59e0b" },
  },
});

const fonts = defineTokens.fonts({
  heading: {
    value:
      "'Space Grotesk', 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  body: {
    value:
      "'Inter', 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  mono: {
    value:
      "'IBM Plex Mono', ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

const radii = defineTokens.radii({
  xs: { value: "6px" },
  sm: { value: "10px" },
  md: { value: "14px" },
  lg: { value: "18px" },
  xl: { value: "24px" },
  "2xl": { value: "32px" },
});

const shadows = defineTokens.shadows({
  outline: { value: "0 0 0 2px rgba(74, 222, 128, 0.45)" },
  focus: { value: "0 0 0 2px rgba(74, 222, 128, 0.3)" },
  surface: { value: "0 20px 60px rgba(0, 0, 0, 0.45)" },
  subtle: { value: "0 10px 30px rgba(0, 0, 0, 0.25)" },
});

const semanticColors = defineSemanticTokens.colors({
  "bg.canvas": {
    value: {
      _light: "{colors.neutral.950}",
      _dark: "{colors.neutral.950}",
    },
  },
  "bg.surface": {
    value: {
      _light: "linear-gradient(135deg, rgba(27,27,31,0.95) 0%, rgba(9,9,11,0.95) 100%)",
      _dark: "linear-gradient(135deg, rgba(27,27,31,0.95) 0%, rgba(9,9,11,0.95) 100%)",
    },
  },
  "bg.surfaceSolid": {
    value: {
      _light: "{colors.neutral.900}",
      _dark: "{colors.neutral.900}",
    },
  },
  "bg.raised": {
    value: {
      _light: "rgba(27, 27, 31, 0.75)",
      _dark: "rgba(27, 27, 31, 0.75)",
    },
  },
  "border.muted": {
    value: {
      _light: "rgba(255, 255, 255, 0.08)",
      _dark: "rgba(255, 255, 255, 0.08)",
    },
  },
  "border.accent": {
    value: {
      _light: "rgba(74, 222, 128, 0.45)",
      _dark: "rgba(74, 222, 128, 0.45)",
    },
  },
  "text.muted": {
    value: {
      _light: "{colors.neutral.400}",
      _dark: "{colors.neutral.400}",
    },
  },
  "text.default": {
    value: {
      _light: "{colors.neutral.100}",
      _dark: "{colors.neutral.100}",
    },
  },
  "text.subtle": {
    value: {
      _light: "{colors.neutral.500}",
      _dark: "{colors.neutral.500}",
    },
  },
  "shadow.accent": {
    value: {
      _light: "rgba(74, 222, 128, 0.35)",
      _dark: "rgba(74, 222, 128, 0.35)",
    },
  },
  "shadow.surface": {
    value: {
      _light: "rgba(0, 0, 0, 0.6)",
      _dark: "rgba(0, 0, 0, 0.6)",
    },
  },
});

const globalCss = {
  "html, body": {
    background: "bg.canvas",
    color: "text.default",
    lineHeight: 1.6,
    WebkitFontSmoothing: "antialiased",
  },
  "*::selection": {
    background: "accent.500",
    color: "neutral.950",
  },
  a: {
    color: "accent.500",
    transition: "color 0.2s ease, box-shadow 0.2s ease",
    textDecoration: "none",
    _hover: {
      color: "accent.600",
    },
  },
  "::-webkit-scrollbar": {
    width: "10px",
    height: "10px",
  },
  "::-webkit-scrollbar-thumb": {
    background: "rgba(255, 255, 255, 0.08)",
    borderRadius: "full",
  },
  "::-webkit-scrollbar-track": {
    background: "rgba(255, 255, 255, 0.02)",
  },
};

const customConfig = defineConfig({
  cssVarsPrefix: "noma",
  cssVarsRoot: ":where(html, .chakra-theme, .noma-theme)",
  preflight: true,
  theme: {
    tokens: {
      colors,
      fonts,
      radii,
      shadows,
    },
    semanticTokens: {
      colors: semanticColors,
    },
  },
  globalCss,
});

export const system = createSystem(defaultConfig, customConfig);
