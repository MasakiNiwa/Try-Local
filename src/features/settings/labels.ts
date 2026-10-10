import type { BackendKind } from '@/lib/llm/types';
import type { ThemeSetting } from './settingsStore';

export const BACKEND_LABELS: Record<BackendKind, string> = {
  'gpu-artisan': 'GPU（Artisan・推奨）',
  gpu: 'GPU',
  cpu: 'CPU',
};

export const THEME_LABELS: Record<ThemeSetting, string> = {
  system: 'システムに合わせる',
  light: 'ライト',
  dark: 'ダーク',
};
