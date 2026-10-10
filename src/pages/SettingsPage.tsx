import { useEffect, useState } from 'react';
import { Database, Gauge, HardDrive, MessageSquareText, Palette, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { deleteAllStoredModels, isOpfsSupported } from '@/lib/llm/modelStorage';
import { errorMessage, formatBytes } from '@/lib/utils/format';
import { useChat } from '@/features/chat/chatStore';
import { useEmbed } from '@/features/embed/embedStore';
import { useEngine } from '@/features/engine/engineStore';
import { BACKEND_SETTING_LABELS, THEME_LABELS } from '@/features/settings/labels';
import {
  useSettings,
  type BackendSetting,
  type ThemeSetting,
} from '@/features/settings/settingsStore';

const CONTEXT_OPTIONS = [1024, 2048, 4096, 8192, 16384, 32768].map((n) => ({
  value: String(n),
  label: `${n.toLocaleString()} トークン`,
}));

function StorageUsage() {
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const storedModels = useEngine((s) => s.storedModels);
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then((e) => setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 }));
  }, [storedModels]);
  if (!est) return <span className="text-sm text-slate-500">-</span>;
  return (
    <span className="font-mono text-sm tabular-nums">
      {formatBytes(est.usage)} / {formatBytes(est.quota)}
    </span>
  );
}

export default function SettingsPage() {
  const s = useSettings();
  const update = s.update;
  const deleteAllConversations = useChat((st) => st.deleteAllConversations);
  const conversationCount = useChat((st) => st.conversations.length);
  const unload = useEngine((st) => st.unload);
  const unloadEmbed = useEmbed((st) => st.unload);
  const refreshStored = useEngine((st) => st.refreshStoredModels);
  const storedCount = useEngine((st) => st.storedModels.length);
  const webgpu = useEngine((st) => st.webgpu);
  const [confirm, setConfirm] = useState<null | 'models' | 'reset' | 'conversations'>(null);

  const deleteModels = async () => {
    try {
      await unload();
      await unloadEmbed();
      await deleteAllStoredModels();
      update({ lastModelName: null, lastEmbedModelName: null });
      toast.success('保存済みモデルをすべて削除しました');
    } catch (e) {
      toast.error('削除に失敗しました', { description: errorMessage(e) });
    }
    void refreshStored();
  };

  return (
    <>
      <PageHeader title="設定" />
      <PageBody>
        <Section
          title="生成"
          icon={<MessageSquareText />}
          description="次のメッセージ送信から反映されます（履歴は引き継がれます）"
        >
          <Field label="システムプロンプト" htmlFor="system-prompt" stacked>
            <textarea
              id="system-prompt"
              value={s.systemPrompt}
              onChange={(e) => update({ systemPrompt: e.target.value })}
              rows={3}
              placeholder="例: あなたは親切なアシスタントです。日本語で簡潔に答えてください。"
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </Field>
          <Field label="Temperature" htmlFor="temperature" hint="0 で毎回同じ出力（Greedy）">
            <Slider
              id="temperature"
              value={s.temperature}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => update({ temperature: v })}
              format={(v) => v.toFixed(2)}
            />
          </Field>
          <Field label="Top-K" htmlFor="top-k">
            <Slider
              id="top-k"
              value={s.topK}
              min={1}
              max={100}
              step={1}
              onChange={(v) => update({ topK: v })}
            />
          </Field>
          <Field label="Top-P" htmlFor="top-p">
            <Slider
              id="top-p"
              value={s.topP}
              min={0.05}
              max={1}
              step={0.01}
              onChange={(v) => update({ topP: v })}
              format={(v) => v.toFixed(2)}
            />
          </Field>
          <Field label="最大出力トークン数" htmlFor="max-output" hint="1 回の応答で生成する上限">
            <Slider
              id="max-output"
              value={s.maxOutputTokens}
              min={128}
              max={8192}
              step={128}
              onChange={(v) => update({ maxOutputTokens: v })}
            />
          </Field>
          <Field
            label="思考モード"
            htmlFor="thinking"
            hint="対応モデル（Gemma 4・Qwen3 など）で、回答前に推論過程を出力します。オフの方が速く答えます"
          >
            <Switch
              id="thinking"
              checked={s.enableThinking}
              onChange={(v) => update({ enableThinking: v })}
            />
          </Field>
        </Section>

        <Section
          title="エンジン"
          icon={<Gauge />}
          description="変更後はモデルを読み込み直すと反映されます"
        >
          <Field
            label="バックエンド"
            htmlFor="backend"
            hint={
              webgpu === false
                ? 'この端末では WebGPU が使えないため、自動では CPU で実行します'
                : '自動: WebGPU が使えれば GPU、使えなければ CPU'
            }
          >
            <Select<BackendSetting>
              id="backend"
              value={s.backend}
              onChange={(v) => update({ backend: v })}
              options={(Object.keys(BACKEND_SETTING_LABELS) as BackendSetting[]).map((k) => ({
                value: k,
                label: BACKEND_SETTING_LABELS[k],
              }))}
              className="w-40 sm:w-48"
            />
          </Field>
          <Field
            label="最大文脈長"
            htmlFor="context"
            hint="大きいほど長い会話が可能ですがメモリを消費します"
          >
            <Select
              id="context"
              value={String(s.maxNumTokens)}
              onChange={(v) => update({ maxNumTokens: Number(v) })}
              options={CONTEXT_OPTIONS}
              className="w-40 sm:w-48"
            />
          </Field>
        </Section>

        <Section title="モデルの保存" icon={<HardDrive />}>
          <Field
            label="取り込んだモデルをブラウザに保存"
            htmlFor="save-models"
            hint={
              isOpfsSupported()
                ? 'OPFS に保存し、次回からファイル選択なしで読み込めます'
                : 'このブラウザは OPFS に対応していません'
            }
          >
            <Switch
              id="save-models"
              checked={s.saveImportedModels && isOpfsSupported()}
              disabled={!isOpfsSupported()}
              onChange={(v) => update({ saveImportedModels: v })}
            />
          </Field>
          <Field
            label="起動時に前回のモデルを自動で読み込む"
            htmlFor="auto-load"
            hint="保存済みモデルのみが対象です"
          >
            <Switch
              id="auto-load"
              checked={s.autoLoadLastModel}
              onChange={(v) => update({ autoLoadLastModel: v })}
            />
          </Field>
        </Section>

        <Section title="表示と操作" icon={<Palette />}>
          <Field label="テーマ" htmlFor="theme">
            <Select<ThemeSetting>
              id="theme"
              value={s.theme}
              onChange={(v) => update({ theme: v })}
              options={(Object.keys(THEME_LABELS) as ThemeSetting[]).map((k) => ({
                value: k,
                label: THEME_LABELS[k],
              }))}
              className="w-40 sm:w-48"
            />
          </Field>
          <Field
            label="Enter キーで送信"
            htmlFor="enter-send"
            hint="オフ時は Ctrl/⌘ + Enter で送信。スマホでは常に改行です"
          >
            <Switch
              id="enter-send"
              checked={s.enterToSend}
              onChange={(v) => update({ enterToSend: v })}
            />
          </Field>
          <Field label="生成速度などの統計を表示" htmlFor="show-stats">
            <Switch
              id="show-stats"
              checked={s.showStats}
              onChange={(v) => update({ showStats: v })}
            />
          </Field>
        </Section>

        <Section title="データ" icon={<Database />}>
          <Field label="ストレージ使用量" hint="このサイトがブラウザ内で使用している容量">
            <StorageUsage />
          </Field>
          <Field label="会話履歴をすべて削除" hint={`${conversationCount} 件`}>
            <Button
              size="sm"
              variant="danger"
              disabled={conversationCount === 0}
              onClick={() => setConfirm('conversations')}
            >
              削除
            </Button>
          </Field>
          <Field label="保存済みモデルをすべて削除" hint={`${storedCount} 件`}>
            <Button
              size="sm"
              variant="danger"
              disabled={storedCount === 0}
              onClick={() => setConfirm('models')}
            >
              削除
            </Button>
          </Field>
          <Field label="設定を初期値に戻す">
            <Button size="sm" onClick={() => setConfirm('reset')}>
              <RotateCcw />
              リセット
            </Button>
          </Field>
        </Section>

        <p className="pb-2 text-center text-xs text-slate-400">
          Try Local v{__APP_VERSION__} · LiteRT-LM {__LITERTLM_VERSION__}
        </p>
      </PageBody>

      <ConfirmDialog
        open={confirm === 'models'}
        title="保存済みモデルをすべて削除しますか？"
        description="ブラウザ内（OPFS）に保存したすべてのモデルファイルを削除します。"
        confirmLabel="すべて削除"
        danger
        onConfirm={() => void deleteModels()}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'conversations'}
        title="会話履歴をすべて削除しますか？"
        description="保存されているすべての会話を削除します。元に戻せません。"
        confirmLabel="すべて削除"
        danger
        onConfirm={() => {
          void deleteAllConversations().then(() => toast.success('会話履歴を削除しました'));
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        title="設定をリセットしますか？"
        description="すべての設定が初期値に戻ります。保存済みモデルと会話は削除されません。"
        confirmLabel="リセット"
        onConfirm={() => {
          s.reset();
          toast.success('設定をリセットしました');
        }}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
