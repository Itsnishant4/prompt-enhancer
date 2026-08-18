import { useState, useEffect } from 'react';
import { Save, Loader2, Keyboard, Cpu, Download, CheckCircle2, AlertCircle, StopCircle } from 'lucide-react';
import type { Settings, LlamaServerStatus } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';

export function SettingsPanel({ platform }: { platform?: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [llamaStatus, setLlamaStatus] = useState<LlamaServerStatus | null>(null);
  const [llamaDownloading, setLlamaDownloading] = useState(false);

  const [formData, setFormData] = useState<Partial<Settings>>({
    useLocalModel: DEFAULT_SETTINGS.useLocalModel,
    localModelName: DEFAULT_SETTINGS.localModelName,
    systemPrompt: DEFAULT_SETTINGS.systemPrompt,
    shortcut: DEFAULT_SETTINGS.shortcut,
    launchAtLogin: DEFAULT_SETTINGS.launchAtLogin,
    showLoadingOverlay: DEFAULT_SETTINGS.showLoadingOverlay,
  });

  useEffect(() => {
    window.electronAPI.settings.get().then(s => setSettings(s));
  }, []);

  // Track llama.cpp model download / server status
  useEffect(() => {
    const model = DEFAULT_SETTINGS.localModelName;
    window.electronAPI.llama.status(model).then(setLlamaStatus);

    const unsubscribe = window.electronAPI.llama.onProgress((state) => {
      if (state.modelId === model) {
        setLlamaStatus(prev => ({ ...prev!, downloaded: state.percent === 100, downloadPercent: state.percent }));
      }
    });
    return unsubscribe;
  }, []);

  const saveSettings = async (newSettings: Partial<Settings>) => {
    setSaving(true);
    const updated = await window.electronAPI.settings.save(newSettings);
    setSettings(updated);
    setSaving(false);
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        useLocalModel: settings.useLocalModel ?? DEFAULT_SETTINGS.useLocalModel,
        localModelName: settings.localModelName || DEFAULT_SETTINGS.localModelName,
        systemPrompt: settings.systemPrompt || DEFAULT_SETTINGS.systemPrompt,
        shortcut: settings.shortcut || DEFAULT_SETTINGS.shortcut,
        launchAtLogin: settings.launchAtLogin ?? DEFAULT_SETTINGS.launchAtLogin,
        showLoadingOverlay: settings.showLoadingOverlay ?? DEFAULT_SETTINGS.showLoadingOverlay,
      });
    }
  }, [settings]);

  const handleChange = (key: keyof Settings, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await saveSettings(formData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  const isMac = platform === 'darwin';

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <div className="text-center pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Preferences</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Configure your local AI model and global shortcut.</p>
      </div>

      {/* Model Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
          <Cpu size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase">AI Model</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Local Model Name
            </label>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Cpu size={14} className="text-purple-500" />
              <span className="font-medium">MiniCPM-V 4.6</span>
              <span className="text-xs text-slate-400">(1.3B, llama.cpp)</span>
            </div>

            <div className="mt-3 flex flex-col gap-2 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {llamaStatus?.serverRunning ? (
                    <><CheckCircle2 size={13} className="text-emerald-500" /> Server running{llamaStatus.port ? ` on port ${llamaStatus.port}` : ''}</>
                  ) : llamaStatus?.downloaded ? (
                    <><CheckCircle2 size={13} className="text-emerald-500" /> Model downloaded, server idle</>
                  ) : llamaStatus?.error ? (
                    <><AlertCircle size={13} className="text-red-500" /> {llamaStatus.error}</>
                  ) : (
                    <><Cpu size={13} className="text-slate-400" /> Not downloaded yet</>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {llamaStatus?.serverRunning ? (
                    <button
                      onClick={() => window.electronAPI.llama.stop().then(() => window.electronAPI.llama.status(DEFAULT_SETTINGS.localModelName).then(setLlamaStatus))}
                      className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    >
                      <StopCircle size={13} /> Stop
                    </button>
                  ) : !llamaStatus?.downloaded && !llamaDownloading ? (
                    <button
                      onClick={async () => {
                        setLlamaDownloading(true);
                        const res = await window.electronAPI.llama.download(DEFAULT_SETTINGS.localModelName);
                        if (!res.ok) {
                          setLlamaStatus(prev => ({ ...prev!, error: res.error || 'Download failed' }));
                        }
                        setLlamaDownloading(false);
                      }}
                      className="text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                    >
                      <Download size={13} /> Download
                    </button>
                  ) : null}
                </div>
              </div>

              {llamaDownloading || (llamaStatus != null && llamaStatus.downloadPercent != null && llamaStatus.downloadPercent < 100) ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span>Downloading model...</span>
                    <span>{llamaStatus?.downloadPercent ?? 0}%</span>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${llamaStatus?.downloadPercent ?? 0}%` }} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* System Prompt */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase">System Prompt</h2>
        </div>
        <textarea
          value={formData.systemPrompt || ''}
          onChange={(e) => handleChange('systemPrompt', e.target.value)}
          className="textarea-field-minimal text-xs leading-relaxed min-h-[120px]"
          placeholder="Enter system prompt..."
        />
      </section>

      {/* Behavior */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
          <Keyboard size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase">System</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-500 mb-1.5 block">Global Shortcut</label>
            <input
              type="text"
              value={formData.shortcut || ''}
              onChange={(e) => handleChange('shortcut', e.target.value)}
              className="input-field-minimal text-center max-w-[200px]"
              placeholder={isMac ? 'CmdOrCtrl+E' : 'CommandOrControl+E'}
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-4 h-4">
                <input
                  type="checkbox"
                  checked={formData.launchAtLogin ?? true}
                  onChange={(e) => handleChange('launchAtLogin', e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 peer-checked:bg-slate-800 peer-checked:border-slate-800 dark:peer-checked:bg-slate-100 dark:peer-checked:border-slate-100 transition-colors" />
                <svg className="absolute w-3 h-3 text-white dark:text-slate-900 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Launch at login</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-4 h-4">
                <input
                  type="checkbox"
                  checked={formData.showLoadingOverlay ?? true}
                  onChange={(e) => handleChange('showLoadingOverlay', e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 peer-checked:bg-slate-800 peer-checked:border-slate-800 dark:peer-checked:bg-slate-100 dark:peer-checked:border-slate-100 transition-colors" />
                <svg className="absolute w-3 h-3 text-white dark:text-slate-900 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Show loading overlay</span>
            </label>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="pt-8 flex justify-center pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-full hover:bg-slate-800 dark:hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}