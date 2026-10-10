import { Boxes, CircleHelp, MessageSquare, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** ナビゲーション項目。ページを追加するときはここと App.tsx のルートに追加する */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'チャット', icon: MessageSquare },
  { to: '/models', label: 'モデル', icon: Boxes },
  { to: '/settings', label: '設定', icon: Settings },
  { to: '/help', label: 'ヘルプ', icon: CircleHelp },
];
