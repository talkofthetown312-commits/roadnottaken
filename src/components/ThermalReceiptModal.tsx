import React, { useState } from 'react';
import { X, Printer, Binary, FileText, Check } from 'lucide-react';
import { PrintSpoolJob } from '../server/types.js';

interface ThermalReceiptModalProps {
  job: PrintSpoolJob | null;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ job, onClose }) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'hex'>('formatted');
  const [copied, setCopied] = useState(false);

  if (!job) return null;

  const handleCopy = () => {
    const textToCopy = viewMode === 'formatted' ? job.formatted_text : job.hex_preview;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                ESC/POS Thermal Paper Preview
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {job.job_type} · {job.target_printer}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('formatted')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'formatted'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Thermal Slip (48 col)</span>
            </button>

            <button
              onClick={() => setViewMode('hex')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'hex'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>Raw Hex Bytes</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors font-mono"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <span>Copy Output</span>
            )}
          </button>
        </div>

        {/* Content Preview Container */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-950">
          {viewMode === 'formatted' ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 font-mono text-xs text-amber-200/95 leading-relaxed tracking-wide shadow-inner overflow-x-auto whitespace-pre">
              {job.formatted_text}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 leading-relaxed break-all">
                {job.hex_preview}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Standard ESC/POS binary stream containing ESC @ (reset), ESC E 1 (bold on), GS ! 11 (2x height/width), ESC p (cash drawer kick pin 2), and GS V 66 0 (partial paper cut).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">Order ID: {job.order_id.slice(0, 18)}...</span>
          <span className="font-semibold text-emerald-400">Status: Dispatched</span>
        </div>
      </div>
    </div>
  );
};
