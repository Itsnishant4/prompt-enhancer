import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';

interface AccessibilityGateProps {
  onGranted: () => void;
}

export function AccessibilityGate({ onGranted }: AccessibilityGateProps) {
  const [granted, setGranted] = useState(false);

  const checkStatus = useCallback(async () => {
    const isGranted = await window.electronAPI.system.checkAccessibility();
    if (isGranted) {
      setGranted(true);
      setTimeout(() => {
        onGranted();
      }, 600);
    }
  }, [onGranted]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 1200);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleRequest = async () => {
    await window.electronAPI.system.requestAccessibility();
    checkStatus();
  };

  return (
    <div className="h-screen bg-white dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          {granted ? (
            <CheckCircle2 size={28} className="text-emerald-500" />
          ) : (
            <ShieldAlert size={28} className="text-amber-500" />
          )}
        </div>

        <h1 className="text-xl font-bold tracking-tight">
          {granted ? 'Permission Granted!' : 'Accessibility Permission Required'}
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Prompt Enhancer needs <span className="font-semibold text-slate-700 dark:text-slate-200">Accessibility</span> permission to read selected text and paste enhanced prompts in any application.
        </p>

        {!granted ? (
          <div className="mt-8 w-full flex flex-col items-center gap-4">
            <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 text-left text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">How to enable:</div>
              <div className="flex items-start gap-2">
                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px]">1</span>
                <span>Click <strong>Grant Permission</strong> below to open System Settings.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded text-[10px]">2</span>
                <span>Toggle the switch for <strong>Prompt Enhancer</strong> ON.</span>
              </div>
            </div>

            <button
              onClick={handleRequest}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
            >
              <ExternalLink size={16} />
              Grant Permission
            </button>

            <button
              onClick={checkStatus}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors pt-1"
            >
              <RefreshCw size={12} />
              Re-check status
            </button>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-2 text-sm text-emerald-500 font-medium">
            <CheckCircle2 size={16} />
            Setting up your app...
          </div>
        )}
      </div>
    </div>
  );
}
