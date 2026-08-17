import { useState, useEffect, useCallback } from 'react';
import { Download, Loader2, AlertCircle, Cpu } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@shared/constants';

interface DownloadGateProps {
  onComplete: () => void;
}

type Phase = 'checking' | 'idle' | 'downloading' | 'starting' | 'error';

export function DownloadGate({ onComplete }: DownloadGateProps) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const modelId = DEFAULT_SETTINGS.localModelName;

  const startDownload = useCallback(async () => {
    setError(null);
    setPhase('downloading');
    const res = await window.electronAPI.llama.download(modelId);
    if (!res.ok) {
      setError(res.error || 'Download failed');
      setPhase('error');
      return;
    }
    setProgress(100);
    setPhase('starting');
    const startRes = await window.electronAPI.llama.start(modelId);
    if (!startRes.ok) {
      setError(startRes.error || 'Failed to load model');
      setPhase('error');
      return;
    }
    onComplete();
  }, [modelId, onComplete]);

  useEffect(() => {
    window.electronAPI.llama.status(modelId).then((status) => {
      if (status.downloaded) {
        // Already downloaded — just load into RAM and proceed
        window.electronAPI.llama.start(modelId).then((res) => {
          if (res.ok) {
            onComplete();
          } else {
            setError(res.error || 'Failed to load model');
            setPhase('error');
          }
        });
      } else {
        setPhase('idle');
      }
    });
  }, [modelId, onComplete]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.llama.onProgress((state) => {
      if (state.modelId === modelId) {
        setProgress(state.percent ?? 0);
        setError(state.error);
        if (state.inProgress) {
          setPhase('downloading');
        }
      }
    });
    return unsubscribe;
  }, [modelId]);

  return (
    <div className="h-screen bg-white dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
          <Cpu size={28} className="text-indigo-500" />
        </div>

        <h1 className="text-xl font-bold tracking-tight">Set up your AI model</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Prompt Enhancer needs <span className="font-medium text-slate-700 dark:text-slate-300">MiniCPM-V 4.6</span> (505&nbsp;MB) downloaded and loaded before you can start enhancing prompts.
        </p>

        <div className="mt-8 w-full flex flex-col gap-4">
          {phase === 'checking' && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Checking model...
            </div>
          )}

          {phase === 'idle' && (
            <button
              onClick={startDownload}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-full transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Download size={16} />
              Download Model (505 MB)
            </button>
          )}

          {(phase === 'downloading' || phase === 'starting') && (
            <div className="w-full flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin text-indigo-500" />
                  {phase === 'starting' ? 'Loading model into memory...' : `Downloading model...`}
                </span>
                <span className="font-medium tabular-nums">{progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              {phase === 'downloading' && (
                <p className="text-[11px] text-slate-400">First download takes a few minutes depending on your connection.</p>
              )}
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle size={15} />
                <span>{error || 'Something went wrong'}</span>
              </div>
              <button
                onClick={startDownload}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-full transition-all active:scale-95 flex items-center gap-2"
              >
                <Download size={14} />
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}