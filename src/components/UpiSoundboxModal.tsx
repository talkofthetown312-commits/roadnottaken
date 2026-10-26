import React, { useState, useMemo } from 'react';
import { QrCode, Volume2, CheckCircle2, ShieldCheck, X, Smartphone, Copy, Check } from 'lucide-react';
import { UpiPaymentIntent } from '../server/types.js';

interface UpiSoundboxModalProps {
  intent: UpiPaymentIntent | null;
  customerName?: string;
  onVerifyCallback: (intentId: string, payerVpa: string) => Promise<UpiPaymentIntent>;
  onCompleteOrderWithUpi: (verifiedIntent: UpiPaymentIntent) => Promise<void>;
  onClose: () => void;
}

/**
 * Generates a deterministic 21x21 QR Code matrix (Version 1 layout) from the NPCI UPI URI
 * with standard 7x7 finder patterns at top-left, top-right, and bottom-left.
 */
function buildDeterministicQrMatrix(payload: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const placeFinder = (rowOffset: number, colOffset: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[rowOffset + r][colOffset + c] = isBorder || isInner;
        reserved[rowOffset + r][colOffset + c] = true;
      }
    }
    // White quiet separator around finder
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr >= 0 && rr < size && cc >= 0 && cc < size && !reserved[rr][cc]) {
          reserved[rr][cc] = true;
          grid[rr][cc] = false;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    reserved[6][i] = true;
    grid[i][6] = i % 2 === 0;
    reserved[i][6] = true;
  }

  // Deterministic hash stream from payload
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const charCode = payload.charCodeAt(bitIdx % payload.length) || 7;
      const mixed = ((hash >>> (bitIdx % 24)) ^ (charCode * (r + 3) * (c + 5))) & 1;
      grid[r][c] = mixed === 1;
      bitIdx++;
    }
  }

  return grid;
}

/**
 * Plays a synthesized dual-tone Soundbox confirmation chime + voice readout
 */
function playSoundboxAudio(announcement: string) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // First chime note (E5 - 659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Second chime note (A5 - 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.0, now + 0.22);
      gain2.gain.setValueAtTime(0.25, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.65);
    }
  } catch {
    // Ignore audio context restrictions
  }

  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(announcement);
      utterance.rate = 1.02;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  } catch {
    // Ignore speech synthesis errors
  }
}

export const UpiSoundboxModal: React.FC<UpiSoundboxModalProps> = ({
  intent,
  customerName,
  onVerifyCallback,
  onCompleteOrderWithUpi,
  onClose,
}) => {
  const [selectedPayerVpa, setSelectedPayerVpa] = useState<string>('customer.gpay@okicici');
  const [verifiedIntent, setVerifiedIntent] = useState<UpiPaymentIntent | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  const activeIntent = verifiedIntent || intent;

  const qrMatrix = useMemo(() => {
    if (!activeIntent) return [];
    return buildDeterministicQrMatrix(activeIntent.upi_uri);
  }, [activeIntent]);

  if (!activeIntent) return null;

  const handleSimulateScan = async () => {
    setIsVerifying(true);
    try {
      const updated = await onVerifyCallback(activeIntent.intent_id, selectedPayerVpa);
      setVerifiedIntent(updated);
      if (updated.soundbox_announcement) {
        playSoundboxAudio(updated.soundbox_announcement);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinishOrder = async () => {
    if (!verifiedIntent) return;
    setIsCompleting(true);
    try {
      await onCompleteOrderWithUpi(verifiedIntent);
      onClose();
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCopyUri = () => {
    void navigator.clipboard?.writeText(activeIntent.upi_uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold tracking-tight">
              Dynamic BharatQR & Soundbox Terminal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount & Merchant Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block">
                {activeIntent.merchant_name}
              </span>
              <span className="text-xs font-mono text-slate-600">
                VPA: {activeIntent.merchant_vpa}
              </span>
              {customerName && (
                <span className="block text-[11px] text-emerald-700 font-medium mt-0.5">
                  Guest: {customerName}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Locked Bill Amount</span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                ₹{activeIntent.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Dynamic SVG QR Display */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-slate-200 relative">
            <div className="p-3 bg-white rounded-lg border-2 border-slate-900 shadow-xs">
              <svg
                viewBox="0 0 21 21"
                className="w-44 h-44"
                shapeRendering="crispEdges"
                aria-label="Dynamic NPCI UPI QR Code"
              >
                {qrMatrix.map((row, rIdx) =>
                  row.map((cell, cIdx) =>
                    cell ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx}
                        y={rIdx}
                        width={1}
                        height={1}
                        fill="#0f172a"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>

            <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600 font-mono">
              <span>Ref: {activeIntent.invoice_number}</span>
              <span>·</span>
              <span className="text-emerald-700 font-semibold">NPCI UPI 2.0</span>
            </div>

            {/* URI Copy Row */}
            <div className="mt-2 w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 rounded border border-slate-200 text-[11px] font-mono text-slate-500">
              <span className="truncate">{activeIntent.upi_uri}</span>
              <button
                type="button"
                onClick={handleCopyUri}
                className="shrink-0 text-slate-700 hover:text-slate-900 flex items-center gap-1 font-sans font-semibold"
              >
                {copiedUri ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUri ? 'Copied' : 'URI'}</span>
              </button>
            </div>
          </div>

          {/* Payment Verification State */}
          {activeIntent.status !== 'VERIFIED' ? (
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Simulate Customer UPI App Handle:</span>
                </label>
                <span className="text-[11px] font-mono text-amber-600 font-semibold">
                  AWAITING SCAN
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Google Pay', vpa: 'customer.gpay@okicici' },
                  { label: 'PhonePe', vpa: 'rahul.phonepe@ybl' },
                  { label: 'Paytm UPI', vpa: 'priya.paytm@paytm' },
                ].map((opt) => (
                  <button
                    key={opt.vpa}
                    type="button"
                    onClick={() => setSelectedPayerVpa(opt.vpa)}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors ${
                      selectedPayerVpa === opt.vpa
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSimulateScan}
                disabled={isVerifying}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>
                  {isVerifying
                    ? 'Verifying NPCI Webhook...'
                    : 'Simulate UPI Scan & Soundbox Audio Alert'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 bg-emerald-50/80 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      UPI Payment Verified via Soundbox Webhook
                    </h4>
                    <p className="text-[11px] text-emerald-800 font-mono mt-0.5">
                      NPCI UTR: <strong>{activeIntent.utr_number}</strong> · Payer: {activeIntent.payer_vpa}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    activeIntent.soundbox_announcement &&
                    playSoundboxAudio(activeIntent.soundbox_announcement)
                  }
                  className="px-2 py-1 rounded bg-white border border-emerald-300 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 hover:bg-emerald-100 shrink-0"
                  title="Replay Soundbox voice announcement"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Replay</span>
                </button>
              </div>

              <div className="p-2.5 rounded bg-white/90 border border-emerald-200/80 text-xs text-slate-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="italic">"{activeIntent.soundbox_announcement}"</span>
              </div>

              <button
                type="button"
                onClick={handleFinishOrder}
                disabled={isCompleting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
              >
                {isCompleting
                  ? 'Committing Order & Printing Receipt...'
                  : `Fire KOT & Print Receipt (UTR #${activeIntent.utr_number?.slice(-6)})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
