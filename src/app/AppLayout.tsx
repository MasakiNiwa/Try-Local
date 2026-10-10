import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils/cn';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import { NAV_ITEMS } from './navItems';

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <img src="./favicon.svg" alt="" className="size-8" />
      <div className="leading-tight">
        <div className="font-bold tracking-tight">Try Local</div>
        <div className="text-[0.7rem] text-slate-500 dark:text-slate-400">LiteRT-LM on Web</div>
      </div>
    </div>
  );
}

/** PC: 左サイドバー */
function SideNav() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white/70 p-3 md:flex dark:border-slate-800 dark:bg-slate-900/60">
      <div className="py-2">
        <Logo />
      </div>
      <nav className="mt-4 flex flex-col gap-1" aria-label="メイン">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            href={to}
            className={(isActive) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-50 text-accent-800 dark:bg-accent-900/30 dark:text-accent-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <ModelStatusChip className="w-full justify-start" />
      </div>
    </aside>
  );
}

/** スマホ: 画面下部のナビゲーションバー */
function BottomNav() {
  const [location] = useLocation();
  return (
    <nav
      aria-label="メイン"
      className="pb-safe shrink-0 border-t border-slate-200 bg-white/90 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/90"
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive = location === to;
          return (
            <Link
              key={to}
              href={to}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[0.7rem] font-medium transition-colors',
                isActive
                  ? 'text-accent-700 dark:text-accent-300'
                  : 'text-slate-500 active:text-slate-800 dark:text-slate-400',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-14 items-center justify-center rounded-full transition-colors',
                  isActive && 'bg-accent-100 dark:bg-accent-900/40',
                )}
              >
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="relative flex min-h-0 flex-1 flex-col">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
