import type { BackendKind } from '@/lib/llm/types';
import type { BackendSetting, ThemeSetting } from './settingsStore';

export const BACKEND_LABELS: Record<BackendKind, string> = {
  'gpu-artisan': 'GPU（Artisan）',
  gpu: 'GPU',
  cpu: 'CPU',
};

export const BACKEND_SETTING_LABELS: Record<BackendSetting, string> = {
  auto: '自動（推奨）',
  ...BACKEND_LABELS,
};

export const THEME_LABELS: Record<ThemeSetting, string> = {
  system: 'システムに合わせる',
  light: 'ライト',
  dark: 'ダーク',
};
