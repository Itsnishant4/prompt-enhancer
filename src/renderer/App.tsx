import { useState, useEffect, useCallback } from 'react';
import { Settings, History, ChevronLeft, Minimize, Maximize, X } from 'lucide-react';
import { SettingsPanel } from './components/SettingsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { DownloadGate } from './components/DownloadGate';
import { ToastContainer, useToast } from './components/Toast';
import { windowControls } from './hooks/useWindowControls';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

import { useSettings } from './hooks/useSettings';
import { DEFAULT_SETTINGS } from '@shared/constants';

type Tab = 'settings' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [isMaximized, setIsMaximized] = useState(false);
  const [platform, setPlatform] = useState<string>('');
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const { toasts, dismiss } = useToast();
  const { minimize, maximize, close, checkMaximized } = windowControls();
  
  const { settings } = useSettings();

  useEffect(() => {
    window.electronAPI.app.getPlatform().then(setPlatform);
  }, []);

  // Check if the llama.cpp model is downloaded before allowing app use
  useEffect(() => {
    window.electronAPI.llama.status(DEFAULT_SETTINGS.localModelName).then((status) => {
      setModelReady(status.downloaded);
    });
  }, []);

  useEffect(() => {
    checkMaximized().then(setIsMaximized);
    
    const unsubscribe = window.electronAPI.window.onNavigateToTab((tab) => {
      setActiveTab(tab as Tab);
    });
    
    return unsubscribe;
  }, [checkMaximized]);

  // Listen to IPC from main process for global shortcut enhancement
  const handleMaximize = useCallback(async () => {
    await maximize();
    const max = await checkMaximized();
    setIsMaximized(max);
  }, [maximize, checkMaximized]);

  if (modelReady === false) {
    return <DownloadGate onComplete={() => setModelReady(true)} />;
  }

  if (modelReady === null) {
    return (
      <div className="h-screen bg-white dark:bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-white dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 flex flex-col font-sans overflow-hidden">
      <TitleBar 
        onMinimize={minimize} 
        onMaximize={handleMaximize} 
        onClose={close} 
        isMaximized={isMaximized}
        platform={platform}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-y-auto overflow-x-hidden pt-8 px-8 custom-scrollbar pb-24"
            >
              <SettingsPanel platform={platform} />
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, filter: 'blur(4px)', y: 4 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(4px)', y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-0 overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto p-8 pb-16">
                <HistoryPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}



interface TitleBarProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  isMaximized: boolean;
  platform: string;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function TitleBar({ 
  onMinimize, 
  onMaximize, 
  onClose, 
  isMaximized,
  platform,
  activeTab,
  onTabChange
}: TitleBarProps) {
  const dragStyle: React.CSSProperties = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDragStyle: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;
  
  // Checking userAgent to synchronously detect mac
  const isMac = platform === 'darwin' || navigator.userAgent.toLowerCase().includes('mac');

  return (
    <div 
      className="flex items-center justify-between h-14 border-b border-slate-100 dark:border-slate-900/50 select-none bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-50 relative"
      style={dragStyle}
    >
      {/* Spacer for Traffic Lights (Title removed) */}
      <div className="flex items-center h-full w-1/3">
        <div className={clsx("h-full shrink-0", isMac ? "w-[72px]" : "w-4")} />
      </div>
      
      {/* Centered Tabs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-full border border-slate-200/50 dark:border-slate-800/50 pointer-events-auto" style={noDragStyle}>
            <button
              onClick={() => onTabChange('settings')}
              className={clsx(
                "px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all duration-200 flex items-center gap-1.5",
                activeTab === 'settings' 
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <Settings size={13} />
              Settings
            </button>
            <button
              onClick={() => onTabChange('history')}
              className={clsx(
                "px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all duration-200 flex items-center gap-1.5",
                activeTab === 'history' 
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              <History size={13} />
              History
            </button>
          </div>
      </div>
      
      {/* Window Controls */}
      <div className="flex items-center h-full w-1/3 justify-end pr-4">
        {!isMac && (
          <div className="flex items-center gap-1 relative z-10" style={noDragStyle}>
            <button 
              onClick={onMinimize}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Minimize"
            >
              <Minimize size={11} />
            </button>
            <button 
              onClick={onMaximize}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={isMaximized ? 'Unmaximize' : 'Maximize'}
            >
              {isMaximized ? <ChevronLeft size={11} /> : <Maximize size={11} />}
            </button>
            <button 
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              aria-label="Close"
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}