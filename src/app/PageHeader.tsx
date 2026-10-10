import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: string;
  /** タイトル右側（見出しの横）に置く要素 */
  meta?: ReactNode;
  /** 右端のアクション */
  actions?: ReactNode;
  /** スマホではタイトルを隠す（下部ナビで現在地が分かるため。ヘッダーの幅を確保） */
  hideTitleOnMobile?: boolean;
}

export function PageHeader({ title, meta, actions, hideTitleOnMobile }: PageHeaderProps) {
  return (
    <header className="pt-safe sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <img src="./favicon.svg" alt="" className="size-7 md:hidden" />
        <h1
          className={cn(
            'truncate text-base font-semibold sm:text-lg',
            hideTitleOnMobile && 'max-sm:sr-only',
          )}
        >
          {title}
        </h1>
        {meta && <div className="min-w-0">{meta}</div>}
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>
    </header>
  );
}

/** スクロール可能なページ本体 */
export function PageBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4 sm:py-6">{children}</div>
    </div>
  );
}
