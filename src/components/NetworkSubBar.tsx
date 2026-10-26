import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface NetworkSubBarProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  lastSyncTimestamp: string | null;
  onToggleNetwork: (online: boolean) => void;
  onTriggerSync: () => void;
}

export const NetworkSubBar: React.FC<NetworkSubBarProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  syncedCount,
  failedCount,
  lastSyncTimestamp,
  onToggleNetwork,
  onTriggerSync,
}) => {
  return (
    <div className="bg-slate-900 text-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 text-xs">
      {/* Left: Edge Node Context & Network Mode Switch */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">Edge Terminal:</span>
          <span className="text-slate-400">OUTLET-BLR-01</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400">POS-TERMINAL-01</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-slate-400">SQLite WAL Active</span>
        </div>

        {/* Network Toggle Button */}
        <div className="flex items-center gap-1.5 p-0.5 bg-slate-800 rounded-lg border border-slate-700">
          <button
            onClick={() => onToggleNetwork(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              isOnline
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Online</span>
          </button>
          <button
            onClick={() => onToggleNetwork(false)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              !isOnline
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Simulate complete ISP connection blackout"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline (ISP Outage)</span>
          </button>
        </div>
      </div>

      {/* Right: Sync Outbox Status & Trigger */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-slate-300">
          <span className="flex items-center gap-1 text-amber-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Sync:</span>
            <strong className="font-semibold">{pendingCount}</strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced:</span>
            <strong className="font-semibold">{syncedCount}</strong>
          </span>
          {failedCount > 0 && (
            <>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-red-400 font-mono">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Failed:</span>
                <strong className="font-semibold">{failedCount}</strong>
              </span>
            </>
          )}
        </div>

        {/* Sync Trigger CTA */}
        <button
          onClick={onTriggerSync}
          disabled={isSyncing || !isOnline}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
            !isOnline
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : isSyncing
              ? 'bg-orange-600 text-white cursor-wait'
              : 'bg-orange-600 hover:bg-orange-500 text-white shadow-xs'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Trigger Sync'}</span>
        </button>

        {lastSyncTimestamp && (
          <span className="text-slate-400 font-mono text-[11px] hidden lg:inline">
            Last: {new Date(lastSyncTimestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};
