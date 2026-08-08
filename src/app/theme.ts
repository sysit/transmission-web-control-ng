import type { ThemeConfig } from 'antd';

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 2,
    fontSize: 13,
    lineHeight: 1.4,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Table: {
      rowHoverBg: 'rgba(22, 119, 255, 0.04)',
      headerBg: '#fafafa',
    },
    Tree: {
      directoryNodeSelectedBg: 'rgba(22, 119, 255, 0.08)',
    },
  },
};

export const compactTheme: ThemeConfig = {
  components: {
    Table: {
      cellPaddingBlock: 4,
      cellPaddingInline: 8,
    },
    Tree: {
      indentSize: 16,
    },
  },
};
