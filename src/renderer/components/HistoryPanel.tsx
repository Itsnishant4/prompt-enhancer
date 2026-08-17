import { useState } from 'react';
import { Search, Trash2, Copy, RotateCcw, Loader2, Brain } from 'lucide-react';
import { clsx } from 'clsx';
import { useHistory } from '../hooks/useHistory';
import { useEnhance } from '../hooks/useEnhance';
import type { HistoryEntry } from '@shared/types';
import { useToast } from './Toast';

export function HistoryPanel() {
  const { history, loading, hasMore, searchQuery, setSearchQuery, loadMore, deleteEntry, clearHistory, refresh } = useHistory();
  const { enhancePrompt, enhancing } = useEnhance();
  const { show } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copyingId, setCopyingId] = useState<number | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    await deleteEntry(id);
    setDeletingId(null);
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      await clearHistory();
    }
  };

  const handleCopy = async (text: string, id: number) => {
    setCopyingId(id);
    try {
      await navigator.clipboard.writeText(text);
      show('success', 'Copied to clipboard');
    } catch {
      show('error', 'Failed to copy');
    } finally {
      setCopyingId(null);
    }
  };

  const handleReEnhance = async (entry: HistoryEntry) => {
    const result = await enhancePrompt(entry.original_text);
    if (result) {
      show('success', 'Re-enhanced successfully');
      refresh();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto pt-4">
      <div className="flex flex-col gap-6 mb-10 text-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">History</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {history.length} enhancement{history.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        
        <div className="relative max-w-sm mx-auto w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search..."
            className="input-field-minimal pl-9 rounded-full text-center"
          />
        </div>
      </div>

      {loading && history.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Brain className="w-10 h-10 mb-4 opacity-20" />
          <p className="text-sm font-medium">No history yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pb-20 scrollbar-none">
          <div className="flex justify-end mb-4">
             <button onClick={handleClear} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 size={12} /> Clear All
            </button>
          </div>
          {history.map((entry) => (
                <HistoryEntryCard
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  onDelete={() => handleDelete(entry.id)}
                  onCopyOriginal={() => handleCopy(entry.original_text, entry.id)}
                  onCopyEnhanced={() => handleCopy(entry.enhanced_text, entry.id)}
                  onReEnhance={() => handleReEnhance(entry)}
                  deleting={deletingId === entry.id}
                  copying={copyingId === entry.id}
                  enhancing={enhancing}
                />
          ))}
          
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-4 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface HistoryEntryCardProps {
  entry: HistoryEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onCopyOriginal: () => void;
  onCopyEnhanced: () => void;
  onReEnhance: () => void;
  deleting: boolean;
  copying: boolean;
  enhancing: boolean;
}

function HistoryEntryCard({
  entry,
  isExpanded,
  onToggle,
  onDelete,
  onCopyOriginal,
  onCopyEnhanced,
  onReEnhance,
  deleting,
  copying,
  enhancing,
}: HistoryEntryCardProps) {
  const isGemini = entry.model_used.toLowerCase().includes('gemini');

  return (
    <div className="group flex flex-col space-y-4 border-b border-slate-100 dark:border-slate-800/50 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={clsx("w-1.5 h-1.5 rounded-full", isGemini ? "bg-blue-500" : "bg-emerald-500")} />
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
            {entry.model_used}
          </span>
          <span className="text-slate-300 dark:text-slate-600">&bull;</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {formatDate(entry.created_at)}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onCopyEnhanced} disabled={copying || enhancing} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" title="Copy enhanced"><Copy size={13} /></button>
          <button onClick={onReEnhance} disabled={enhancing} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" title="Re-enhance"><RotateCcw size={13} /></button>
          <button onClick={onDelete} disabled={deleting} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 size={13} /></button>
        </div>
      </div>

      <div className="grid gap-5">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Original</p>
          <p className="text-sm text-slate-500 dark:text-slate-400  leading-relaxed break-words">
            {isExpanded ? entry.original_text : truncate(entry.original_text, 150)}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Enhanced</p>
          <p className="text-[15px] text-slate-900 dark:text-slate-100 leading-relaxed break-words selection:bg-emerald-100 dark:selection:bg-emerald-900/30">
            {isExpanded ? entry.enhanced_text : truncate(entry.enhanced_text, 150)}
          </p>
        </div>
      </div>

      {(entry.original_text.length > 150 || entry.enhanced_text.length > 150) && (
        <button
          onClick={onToggle}
          className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-left self-start mt-2"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      )}
    </div>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncate(text: string, length = 150): string {
  return text.length > length ? text.slice(0, length) + '...' : text;
}