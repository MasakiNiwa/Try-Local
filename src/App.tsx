import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppLayout } from '@/app/AppLayout';
import { useStartup } from '@/app/useStartup';
import { useTheme } from '@/app/useTheme';
import ChatPage from '@/pages/ChatPage';
import { useSettings } from '@/features/settings/settingsStore';

// チャット以外のページは必要になってから読み込む
const ImagePage = lazy(() => import('@/pages/ImagePage'));
const ModelsPage = lazy(() => import('@/pages/ModelsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const HelpPage = lazy(() => import('@/pages/HelpPage'));

export default function App() {
  useTheme();
  useStartup();
  const theme = useSettings((s) => s.theme);
  return (
    // GitHub Pages ではサーバー側のルーティングができないためハッシュルーティングを使う
    <Router hook={useHashLocation}>
      <AppLayout>
        <Suspense fallback={null}>
          <Switch>
            <Route path="/image" component={ImagePage} />
            <Route path="/models" component={ModelsPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/help" component={HelpPage} />
            <Route component={ChatPage} />
          </Switch>
        </Suspense>
      </AppLayout>
      <Toaster
        theme={theme}
        position="top-center"
        richColors
        closeButton
        toastOptions={{ className: 'text-sm' }}
      />
    </Router>
  );
}
