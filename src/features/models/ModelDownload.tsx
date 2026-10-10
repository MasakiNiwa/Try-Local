import { useMemo, useState } from 'react';
import { Download, ExternalLink, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { fileNameFromUrl } from '@/lib/llm/download';
import { isOpfsSupported } from '@/lib/llm/modelStorage';
import { formatBytes, formatPercent } from '@/lib/utils/format';
import { useEngine } from '@/features/engine/engineStore';
import { downloadUrl, RECOMMENDED_MODELS } from './recommendedModels';

function DownloadProgressCard() {
  const download = useEngine((s) => s.download);
  const cancel = useEngine((s) => s.cancelDownload);
  if (!download) return null;
  const { name, loadedBytes, totalBytes, bytesPerSec } = download;
  const ratio = totalBytes ? loadedBytes / totalBytes : undefined;
  const remainSec = totalBytes && bytesPerSec ? (totalBytes - loadedBytes) / bytesPerSec : 0;
  return (
    <Card className="animate-fade-in space-y-2 p-4">
      <div className="flex items-center gap-2">
        <Download className="size-4 animate-pulse text-accent-600" />
        <span className="min-w-0 flex-1 truncate font-medium">{name || '接続中…'}</span>
        <Button size="sm" variant="ghost" onClick={cancel}>
          <X />
          中止
        </Button>
      </div>
      <Progress value={ratio} />
      <div className="flex flex-wrap justify-between gap-x-3 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
        <span>
          {formatBytes(loadedBytes)}
          {totalBytes ? ` / ${formatBytes(totalBytes)} (${formatPercent(ratio ?? 0)})` : ''}
        </span>
        <span>
          {formatBytes(bytesPerSec)}/s
          {remainSec > 0 && ` · 残り約 ${Math.ceil(remainSec / 60)} 分`}
        </span>
      </div>
    </Card>
  );
}

/** Hugging Face などの URL からモデルを直接ダウンロードして OPFS に保存する */
export function ModelDownload() {
  const downloading = useEngine((s) => s.download !== null);
  const downloadModel = useEngine((s) => s.downloadModel);
  const storedModels = useEngine((s) => s.storedModels);
  const storedNames = useMemo(() => new Set(storedModels.map((m) => m.name)), [storedModels]);
  const [url, setUrl] = useState('');
  const urlValid = fileNameFromUrl(url) !== null;
  const opfs = isOpfsSupported();

  return (
    <Section
      title="モデルを入手"
      icon={<Download />}
      description={
        opfs
          ? 'Hugging Face から直接ダウンロードしてブラウザ内に保存します（数 GB あるので Wi-Fi 推奨）'
          : 'このブラウザは OPFS に対応していないため、直接ダウンロードは使えません。ファイルを取り込んでください。'
      }
    >
      <DownloadProgressCard />
      {RECOMMENDED_MODELS.map((m) => {
        const stored = storedNames.has(m.file);
        return (
          <div key={m.file} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{m.file}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                {m.note}
                <a
                  href={m.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-accent-700 hover:underline dark:text-accent-300"
                >
                  Hugging Face
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
            <Button
              size="sm"
              variant={stored ? 'secondary' : 'primary'}
              disabled={!opfs || downloading || stored}
              onClick={() => void downloadModel(downloadUrl(m))}
            >
              <Download />
              {stored ? '保存済み' : 'ダウンロード'}
            </Button>
          </div>
        );
      })}
      <form
        className="space-y-2 px-4 py-3.5 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!urlValid) return;
          void downloadModel(url);
          setUrl('');
        }}
      >
        <label htmlFor="model-url" className="block text-sm font-medium">
          URL を指定してダウンロード
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="model-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://huggingface.co/…/model.litertlm"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <Button type="submit" variant="primary" disabled={!opfs || downloading || !urlValid}>
            取得
          </Button>
        </div>
        {url && !urlValid && (
          <p className="text-xs text-rose-600">
            末尾が .litertlm のファイル URL を入力してください
          </p>
        )}
      </form>
    </Section>
  );
}
