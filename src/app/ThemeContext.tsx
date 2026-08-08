import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const { darkAlgorithm, compactAlgorithm } = theme;

// ── Shared compact token overrides for the old Transmission desktop-app feel ──
// Matches EasyUI default theme: 12px font, dense layout, muted blue tones
const COMPACT_TOKENS: ThemeConfig['token'] = {
  // Typography — old UI uses 12px 微软雅黑
  fontSize: 12,
  fontSizeSM: 11,
  fontSizeLG: 13,
  fontSizeXL: 15,
  lineHeight: 1.25,
  fontFamily: `'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif`,
  // Borders — EasyUI uses sharp 2px radius
  borderRadius: 2,
  borderRadiusSM: 2,
  borderRadiusLG: 2,
  // Padding — aggressively compact
  paddingXXS: 1,
  paddingXS: 3,
  paddingSM: 5,
  padding: 7,
  paddingMD: 9,
  paddingLG: 12,
  paddingXL: 16,
  paddingContentHorizontal: 8,
  paddingContentVertical: 3,
  // Control heights — old UI controls are very compact
  controlHeightXS: 18,
  controlHeightSM: 20,
  controlHeight: 24,
  controlHeightLG: 30,
  // Margin
  marginXXS: 1,
  marginXS: 3,
  marginSM: 6,
  margin: 9,
  marginMD: 12,
  marginLG: 16,
  marginXL: 24,
  // Size
  sizeXXS: 12,
  sizeXS: 16,
  sizeSM: 18,
  size: 20,
  sizeMD: 22,
  sizeLG: 26,
  sizeXL: 36,
  sizeXXL: 48,
  // Misc
  lineWidth: 1,
  motionDurationFast: '0.1s',
  motionDurationMid: '0.2s',
  motionDurationSlow: '0.25s',
};

// ── Shared compact component overrides ──
const COMPACT_COMPONENTS: ThemeConfig['components'] = {
  Table: {
    cellPaddingBlock: 2,
    cellPaddingInline: 6,
    fontSize: 12,
    headerBg: '#E0ECFF',
    headerColor: '#0E2D5F',
    headerSortActiveBg: '#D0DCF0',
    headerSplitColor: 'transparent',
    rowHoverBg: 'rgba(14,45,95,0.04)',
    rowSelectedBg: 'rgba(14,45,95,0.06)',
    rowSelectedHoverBg: 'rgba(14,45,95,0.08)',
    borderColor: '#d0d0d0',
    stickyScrollBarBg: '#E0ECFF',
    bodySortBg: 'transparent',
    expandIconBg: 'transparent',
  },
  Tree: {
    fontSize: 12,
    indentSize: 12,
    titleHeight: 20,
    directoryNodeSelectedBg: '#0E2D5F',
    directoryNodeSelectedColor: '#ffffff',
    nodeSelectedBg: '#0E2D5F',
    nodeSelectedColor: '#ffffff',
    nodeHoverBg: 'rgba(14,45,95,0.06)',
  },
  Button: {
    controlHeight: 24,
    controlHeightSM: 18,
    controlHeightLG: 30,
    fontSize: 12,
    fontSizeSM: 11,
    fontSizeLG: 13,
    paddingInline: 8,
    paddingInlineSM: 5,
    paddingInlineLG: 12,
    paddingBlock: 1,
    paddingBlockSM: 0,
    paddingBlockLG: 3,
    borderRadius: 2,
    borderRadiusSM: 2,
    borderRadiusLG: 2,
  },
  Input: {
    controlHeight: 24,
    controlHeightSM: 20,
    controlHeightLG: 30,
    fontSize: 12,
    fontSizeSM: 11,
    fontSizeLG: 13,
    paddingInline: 6,
    paddingBlock: 1,
    borderRadius: 2,
    borderRadiusSM: 2,
    borderRadiusLG: 2,
  },
  Select: {
    controlHeight: 24,
    fontSize: 12,
    fontSizeSM: 11,
    fontSizeLG: 13,
    borderRadius: 2,
    optionFontSize: 12,
    optionPadding: '3px 8px',
  },
  Tag: {
    fontSizeSM: 9,
    fontSize: 10,
    fontSizeLG: 11,
    lineHeightSM: 14,
    lineHeight: 16,
    lineHeightLG: 18,
    paddingXXS: 1,
    paddingXS: 2,
    marginXXS: 0,
  },
  Tabs: {
    titleFontSize: 12,
    titleFontSizeSM: 11,
    titleFontSizeLG: 13,
    horizontalMargin: '0',
    horizontalItemPadding: '4px 10px',
    verticalItemPadding: '3px 8px',
    cardPadding: '3px 8px',
    cardPaddingSM: '2px 6px',
    cardPaddingLG: '4px 10px',
  },
  Layout: {
    headerHeight: 40,
    headerPadding: '0 8px',
    footerBg: '#fafafa',
    footerPadding: '0 12px',
    siderBg: '#fff',
  },
  Menu: {
    fontSize: 12,
    itemHeight: 24,
    itemPaddingInline: 8,
    collapsedWidth: 0,
    iconMarginInlineEnd: 4,
    iconSize: 14,
  },
  Tooltip: {
    fontSize: 11,
    paddingSM: 3,
    paddingXS: 2,
    borderRadius: 2,
  },
  Dropdown: {
    fontSize: 12,
    borderRadius: 2,
    paddingBlock: 2,
  },
  Form: {
    fontSize: 12,
    itemMarginBottom: 8,
    labelFontSize: 12,
    verticalLabelPadding: '0 0 2px',
    verticalLabelMargin: 0,
  },
  Card: {
    padding: 8,
    paddingLG: 12,
    paddingSM: 4,
    borderRadius: 2,
    borderRadiusLG: 2,
  },
  Switch: {
    trackHeightSM: 14,
    trackHeight: 18,
    trackMinWidthSM: 28,
    trackMinWidth: 36,
    handleSizeSM: 10,
    handleSize: 14,
  },
  Checkbox: {
    fontSize: 12,
    controlInteractiveSize: 14,
  },
  Radio: {
    fontSize: 12,
    radioSize: 14,
  },
  Modal: {
    fontSize: 12,
    titleFontSize: 13,
    borderRadius: 2,
    padding: 12,
    paddingContentHorizontal: 16,
    paddingMD: 14,
    paddingLG: 18,
  },
  Pagination: {
    fontSize: 12,
    itemSize: 22,
    itemSizeSM: 18,
  },
  DatePicker: {
    fontSize: 12,
    controlHeight: 24,
  },
  InputNumber: {
    controlHeight: 24,
    fontSize: 12,
    borderRadius: 2,
  },
  Progress: {
    fontSize: 10,
    lineBorderRadius: 0,
    remainingColor: '#ffffff',
    defaultColor: '#3c8b3c',
  },
  Badge: {
    fontSize: 10,
    textFontSizeSM: 10,
    textFontSize: 11,
  },
  Segmented: {
    fontSize: 11,
    borderRadius: 2,
  },
  Statistic: {
    fontSize: 12,
    titleFontSize: 11,
  },
  Timeline: { fontSize: 11 },
  Breadcrumb: { fontSize: 11 },
  Notification: { fontSize: 12 },
  Alert: { fontSize: 12 },
  Transfer: {
    fontSize: 12,
    headerHeight: 28,
    itemHeight: 24,
  },
  Slider: {
    handleSize: 12,
    handleLineWidth: 2,
    railSize: 2,
    dotSize: 6,
    controlSize: 16,
  },
  Upload: { fontSize: 12 },
  Spin: { fontSize: 12 },
  Collapse: {
    fontSize: 12,
    headerPadding: '4px 8px',
    contentPadding: '4px 8px',
  },
};

// ── Theme definitions matching old EasyUI themes ──

export const THEME_DEFS: Record<string, ThemeConfig> = {
  // Default — matches EasyUI "default" theme: soft blue, light background
  default: {
    token: {
      ...COMPACT_TOKENS,
      // Old EasyUI default color scheme
      colorPrimary: '#0E2D5F',
      colorInfo: '#1677ff',
      colorSuccess: '#3c8b3c',
      colorWarning: '#cc9900',
      colorError: '#bf4040',
      colorLink: '#0E2D5F',
      colorLinkHover: '#2984a4',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorBgLayout: '#f5f5f5',
      colorBgSpotlight: 'rgba(0,0,0,0.85)',
      colorBorder: '#d0d0d0',
      colorBorderSecondary: '#e8e8e8',
      colorSplit: '#f0f0f0',
      colorText: '#222',
      colorTextSecondary: '#666',
      colorTextTertiary: '#999',
      colorTextQuaternary: '#bbb',
      colorFillAlter: '#fafafa',
      colorFillContent: 'rgba(0,0,0,0.04)',
      colorFillContentHover: 'rgba(0,0,0,0.08)',
    },
    components: {
      ...COMPACT_COMPONENTS,
      Table: {
        ...COMPACT_COMPONENTS.Table,
        headerBg: '#E0ECFF',
        rowHoverBg: 'rgba(14,45,95,0.04)',
        rowSelectedBg: 'rgba(14,45,95,0.06)',
      },
    },
  },

  // Gray — matches EasyUI "gray" theme
  gray: {
    token: {
      ...COMPACT_TOKENS,
      colorPrimary: '#575765',
      colorInfo: '#575765',
      colorSuccess: '#3c8b3c',
      colorWarning: '#cc9900',
      colorError: '#bf4040',
      colorLink: '#0092dc',
      colorLinkHover: '#0070a9',
      colorBgContainer: '#f8f8f8',
      colorBgElevated: '#fff',
      colorBgLayout: '#f3f3f3',
      colorBorder: '#d3d3d3',
      colorBorderSecondary: '#e2e2e2',
      colorSplit: '#e2e2e2',
      colorText: '#000',
      colorTextSecondary: '#575765',
    },
    components: {
      ...COMPACT_COMPONENTS,
      Table: {
        ...COMPACT_COMPONENTS.Table,
        headerBg: '#f3f3f3',
        headerColor: '#000',
        rowHoverBg: 'rgba(0,146,220,0.06)',
        rowSelectedBg: 'rgba(0,146,220,0.12)',
      },
    },
  },

  // Metro — matches EasyUI "metro-green" theme: flat olive-green, square corners
  metro: {
    token: {
      ...COMPACT_TOKENS,
      colorPrimary: '#b1c242',
      colorInfo: '#b1c242',
      colorSuccess: '#b1c242',
      colorWarning: '#d4a017',
      colorError: '#bf4040',
      colorLink: '#b1c242',
      colorLinkHover: '#859416',
      colorBgContainer: '#fafafa',
      colorBgElevated: '#fafafa',
      colorBgLayout: '#fafafa',
      colorBorder: '#ddd',
      colorBorderSecondary: '#e5f0c9',
      colorSplit: '#e5f0c9',
      colorText: '#404040',
      colorTextSecondary: '#808040',
      borderRadius: 0,
      borderRadiusSM: 0,
      borderRadiusLG: 0,
    },
    components: {
      ...COMPACT_COMPONENTS,
      Table: {
        ...COMPACT_COMPONENTS.Table,
        headerBg: '#e5f0c9',
        headerColor: '#404040',
        rowHoverBg: 'rgba(177,194,66,0.10)',
        rowSelectedBg: '#c8d47b',
      },
    },
  },

  // Bootstrap — matches EasyUI "bootstrap" theme
  bootstrap: {
    token: {
      ...COMPACT_TOKENS,
      colorPrimary: '#337ab7',
      colorInfo: '#5bc0de',
      colorSuccess: '#5cb85c',
      colorWarning: '#f0ad4e',
      colorError: '#d9534f',
      colorLink: '#337ab7',
      colorLinkHover: '#23527c',
      colorBgContainer: '#fff',
      colorBgElevated: '#fff',
      colorBgLayout: '#f5f5f5',
      colorBorder: '#ccc',
      borderRadius: 4,
      borderRadiusSM: 3,
      borderRadiusLG: 4,
    },
    components: {
      ...COMPACT_COMPONENTS,
      Table: {
        ...COMPACT_COMPONENTS.Table,
        headerBg: '#F2F2F2',
        headerColor: '#333',
        rowHoverBg: 'rgba(51,122,183,0.06)',
        rowSelectedBg: 'rgba(51,122,183,0.1)',
      },
    },
  },

  // Black — matches EasyUI "black" theme: dark background
  black: {
    token: {
      ...COMPACT_TOKENS,
      colorPrimary: '#177ddc',
      colorInfo: '#177ddc',
      colorSuccess: '#49aa19',
      colorWarning: '#d89614',
      colorError: '#a61d24',
      colorLink: '#177ddc',
      colorLinkHover: '#3c9ae8',
      colorBgContainer: '#141414',
      colorBgElevated: '#1f1f1f',
      colorBgLayout: '#000',
      colorBgSpotlight: 'rgba(0,0,0,0.9)',
      colorBorder: '#434343',
      colorBorderSecondary: '#303030',
      colorSplit: '#303030',
      colorText: 'rgba(255,255,255,0.85)',
      colorTextSecondary: 'rgba(255,255,255,0.45)',
      colorTextTertiary: 'rgba(255,255,255,0.35)',
      colorTextQuaternary: 'rgba(255,255,255,0.25)',
      colorFillAlter: 'rgba(255,255,255,0.04)',
      colorFillContent: 'rgba(255,255,255,0.08)',
      colorFillContentHover: 'rgba(255,255,255,0.12)',
    },
    algorithm: [darkAlgorithm],
    components: {
      ...COMPACT_COMPONENTS,
      Table: {
        ...COMPACT_COMPONENTS.Table,
        headerBg: '#383838',
        headerColor: '#fff',
        headerSplitColor: '#383838',
        rowHoverBg: 'rgba(23,125,220,0.12)',
        rowSelectedBg: 'rgba(23,125,220,0.16)',
        borderColor: '#444',
        stickyScrollBarBg: '#383838',
      },
      Layout: {
        ...COMPACT_COMPONENTS.Layout,
        footerBg: '#1a1a1a',
        siderBg: '#141414',
      },
    },
  },
};

// ── Apply compact algorithm on top of theme ──
function withCompact(base: ThemeConfig): ThemeConfig {
  const algos: any[] = [
    ...(Array.isArray(base.algorithm) ? base.algorithm : base.algorithm ? [base.algorithm] : []),
    compactAlgorithm,
  ];
  return {
    ...base,
    algorithm: algos,
    components: {
      ...COMPACT_COMPONENTS,
      ...base.components,
    },
  };
}

// ── Context ──

interface Ctx {
  themeName: string;
  setThemeName: (n: string) => void;
  themeConfig: ThemeConfig;
}

const ThemeContext = createContext<Ctx>({
  themeName: 'default',
  setThemeName: () => {},
  themeConfig: withCompact(THEME_DEFS.default),
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState(
    () => localStorage.getItem('tr-web-control-theme') ?? 'default',
  );

  // Wire the active theme to CSS: `body[data-theme='<name>']` drives the
  // --eui-* variable blocks in global.css (Task #8: theme chrome theming).
  useEffect(() => {
    document.body.dataset.theme = themeName;
    localStorage.setItem('tr-web-control-theme', themeName);
  }, [themeName]);

  const themeConfig = useMemo(() => {
    const base = THEME_DEFS[themeName] ?? THEME_DEFS.default;
    return withCompact(base);
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}
