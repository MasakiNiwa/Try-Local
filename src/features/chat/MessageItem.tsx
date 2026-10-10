import { lazy, memo, Suspense, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Brain,
  Check,
  ChevronRight,
  Copy,
  Pencil,
  RotateCcw,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { formatDuration } from '@/lib/utils/format';
import { useChat, type ChatMessage } from './chatStore';

const Markdown = lazy(() => import('./markdown/Markdown'));

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="考え中">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <ActionButton
      label="コピー"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('コピーできませんでした');
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
    </ActionButton>
  );
}

function Stats({ message }: { message: ChatMessage }) {
  const s = message.stats;
  if (!s) return null;
  const parts: string[] = [];
  if (s.decodeTokensPerSec) parts.push(`${s.decodeTokensPerSec.toFixed(1)} tok/s`);
  if (s.decodeTokens) parts.push(`${s.decodeTokens} tok`);
  if (s.ttftMs !== undefined) parts.push(`初回 ${formatDuration(s.ttftMs)}`);
  parts.push(`計 ${formatDuration(s.totalMs)}`);
  if (s.contextTokens) parts.push(`文脈 ${s.contextTokens} tok`);
  return <span className="font-mono tabular-nums">{parts.join(' · ')}</span>;
}

function ChannelPanel({ name, text, live }: { name: string; text: string; live: boolean }) {
  const [open, setOpen] = useState(false);
  const label = name === 'thought' ? '思考' : name;
  return (
    <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-slate-600 dark:text-slate-300"
      >
        <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
        <Brain className="size-4" />
        {label}
        {live && <span className="ml-1 text-xs text-slate-400">生成中…</span>}
      </button>
      {open && (
        <div className="border-t border-slate-200 px-3 py-2 whitespace-pre-wrap text-slate-600 dark:border-slate-700 dark:text-slate-400">
          {text}
        </div>
      )}
    </div>
  );
}

function UserMessage({ message, busy }: { message: ChatMessage; busy: boolean }) {
  const editAndResend = useChat((s) => s.editAndResend);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  if (editing) {
    return (
      <div className="flex animate-fade-in justify-end">
        <form
          className="w-full max-w-[85%] space-y-2 sm:max-w-[75%]"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
            void editAndResend(message.id, draft);
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            rows={3}
            aria-label="メッセージを編集"
            className="w-full resize-y rounded-2xl border border-accent-400 bg-white px-4 py-2.5 text-[0.95rem] leading-relaxed outline-none dark:bg-slate-900"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              キャンセル
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={busy || !draft.trim()}>
              送信
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="group flex animate-fade-in flex-col items-end [contain-intrinsic-size:auto_60px] [content-visibility:auto]">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-600 px-4 py-2.5 text-[0.95rem] leading-relaxed whitespace-pre-wrap text-white shadow-sm sm:max-w-[75%]">
        {message.text}
      </div>
      <div className="mt-0.5 flex gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <CopyButton text={message.text} />
        <ActionButton
          label="編集して送り直す"
          disabled={busy}
          onClick={() => {
            setDraft(message.text);
            setEditing(true);
          }}
        >
          <Pencil />
        </ActionButton>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  showStats,
  isLast,
  busy,
}: {
  message: ChatMessage;
  showStats: boolean;
  isLast: boolean;
  busy: boolean;
}) {
  const regenerate = useChat((s) => s.regenerate);
  const live = message.status === 'pending' || message.status === 'streaming';
  const channels = Object.entries(message.channels ?? {});
  return (
    <div className="group flex animate-fade-in flex-col items-start [contain-intrinsic-size:auto_120px] [content-visibility:auto]">
      <div className="w-full max-w-full min-w-0">
        {channels.map(([name, text]) => (
          <ChannelPanel key={name} name={name} text={text} live={live && !message.text} />
        ))}
        {message.status === 'pending' && !message.text && channels.length === 0 ? (
          <TypingDots />
        ) : (
          <div className={cn('prose-chat', live && 'streaming-caret')}>
            <Suspense fallback={<div className="whitespace-pre-wrap">{message.text}</div>}>
              <Markdown text={message.text} />
            </Suspense>
          </div>
        )}
        {message.status === 'error' && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="break-all">{message.error}</span>
          </div>
        )}
      </div>
      {!live && (
        <div className="mt-1 flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex gap-0.5">
            {message.text && <CopyButton text={message.text} />}
            {isLast && (
              <ActionButton label="再生成" onClick={() => void regenerate()} disabled={busy}>
                <RotateCcw />
              </ActionButton>
            )}
          </div>
          {message.status === 'cancelled' && (
            <span className="inline-flex items-center gap-1">
              <Square className="size-3" />
              停止しました
            </span>
          )}
          {showStats && <Stats message={message} />}
        </div>
      )}
    </div>
  );
}

interface MessageItemProps {
  message: ChatMessage;
  showStats: boolean;
  isLast: boolean;
  /** 生成中（編集・再生成を無効にする） */
  busy: boolean;
}

/** 1 件のメッセージ。props が変わらない限り再描画しない（memo） */
export const MessageItem = memo(function MessageItem({
  message,
  showStats,
  isLast,
  busy,
}: MessageItemProps) {
  return message.role === 'user' ? (
    <UserMessage message={message} busy={busy} />
  ) : (
    <AssistantMessage message={message} showStats={showStats} isLast={isLast} busy={busy} />
  );
});
