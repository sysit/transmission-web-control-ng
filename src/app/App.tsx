import { Component } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { routes } from './routes.tsx';
import { ThemeProvider, useAppTheme } from './ThemeContext';
import DropZone from '@/components/DropZone';
import '../core/i18n';

const { Paragraph } = Typography;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 2, staleTime: 5000 },
  },
});

// Error boundary
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ff4d4f' }}>Application Error</h2>
          <Paragraph code copyable style={{ background: '#fff2f0', padding: 16, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}{'\n\n'}{this.state.error?.stack}
          </Paragraph>
          <p><a href="/" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>Reload page</a></p>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return useRoutes(routes);
}

/** Inner app that reads theme from context and renders ConfigProvider */
function ThemedApp() {
  const { themeConfig } = useAppTheme();
  return (
    <ConfigProvider theme={themeConfig} locale={zhCN}>
      <AntApp>
        <HashRouter>
          <DropZone />
          <AppRoutes />
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
